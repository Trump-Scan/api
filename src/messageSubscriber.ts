/**
 * 메시지 구독자
 *
 * Redis Streams에서 피드 생성 이벤트를 수신하고 캐시를 무효화합니다.
 */
import Redis from "ioredis";
import {
  REDIS_HOST,
  REDIS_PORT,
  REDIS_DB,
  INPUT_STREAM,
  CONSUMER_GROUP,
  CONSUMER_NAME,
  BLOCK_TIMEOUT,
} from "./config/redis";
import { cacheManager } from "./cacheManager";
import { getLogger } from "./utils/logger";

const logger = getLogger("messageSubscriber");

/**
 * MessageSubscriber 클래스
 *
 * Redis Streams Consumer Group을 사용하여 메시지를 수신하고 처리합니다.
 */
class MessageSubscriber {
  private client: Redis;
  private stream: string;
  private group: string;
  private consumer: string;
  private blockTimeout: number;
  private isRunning: boolean = false;

  constructor() {
    this.client = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      db: REDIS_DB,
      retryStrategy: () => null,
    });

    // 연결 에러 핸들링 (로그 스팸 방지)
    this.client.on("error", () => {});

    this.stream = INPUT_STREAM;
    this.group = CONSUMER_GROUP;
    this.consumer = CONSUMER_NAME;
    this.blockTimeout = BLOCK_TIMEOUT;
  }

  /**
   * Consumer Group 생성 (없으면 생성)
   */
  private async ensureConsumerGroup(): Promise<void> {
    try {
      await this.client.xgroup("CREATE", this.stream, this.group, "0", "MKSTREAM");
      logger.info("Consumer Group 생성", { group: this.group });
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("BUSYGROUP")) {
        logger.debug("Consumer Group 이미 존재", { group: this.group });
      } else {
        throw error;
      }
    }
  }

  /**
   * 메시지 수신 시작
   */
  async start(): Promise<void> {
    if (this.client.status !== "ready") {
      logger.warn("Redis not connected, MessageSubscriber not started");
      return;
    }

    await this.ensureConsumerGroup();

    this.isRunning = true;
    logger.info("MessageSubscriber 시작", {
      stream: this.stream,
      group: this.group,
      consumer: this.consumer,
    });

    this.processMessages();
  }

  /**
   * 메시지 처리 루프
   */
  private async processMessages(): Promise<void> {
    while (this.isRunning) {
      try {
        const messages = await this.client.xreadgroup(
          "GROUP",
          this.group,
          this.consumer,
          "COUNT",
          "1",
          "BLOCK",
          this.blockTimeout.toString(),
          "STREAMS",
          this.stream,
          ">"
        );

        if (messages && messages.length > 0) {
          // messages: [[streamName, [[messageId, [field1, value1, ...]], ...]]]
          const streamData = messages[0] as [string, [string, string[]][]];
          const [, streamMessages] = streamData;

          for (const [messageId, fields] of streamMessages) {
            await this.handleMessage(messageId, fields);
          }
        }
      } catch (error) {
        const err = error as Error;
        if (this.isRunning) {
          logger.error("메시지 수신 오류", { error: err.message });
          // 잠시 대기 후 재시도
          await this.sleep(1000);
        }
      }
    }
  }

  /**
   * 개별 메시지 처리
   */
  private async handleMessage(messageId: string, fields: string[]): Promise<void> {
    try {
      // fields는 [key1, value1, key2, value2, ...] 형태
      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        data[fields[i]] = fields[i + 1];
      }

      // 피드 ID 추출 (있는 경우)
      let feedId: string | undefined;
      if (data.data) {
        try {
          const parsed = JSON.parse(data.data);
          feedId = parsed.id || parsed.feed_id;
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }

      logger.info("새 피드 이벤트 수신", { message_id: messageId, feed_id: feedId });

      // 캐시 무효화
      await cacheManager.invalidateFeeds();
      logger.info("캐시 무효화 완료", { message_id: messageId });

      // ACK 처리
      await this.client.xack(this.stream, this.group, messageId);
      logger.debug("메시지 ACK", { message_id: messageId });
    } catch (error) {
      const err = error as Error;
      logger.error("메시지 처리 오류", { message_id: messageId, error: err.message });
    }
  }

  /**
   * 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 메시지 수신 중지
   */
  stop(): void {
    this.isRunning = false;
    logger.info("MessageSubscriber 중지 요청");
  }

  /**
   * 연결 종료
   */
  async close(): Promise<void> {
    this.stop();
    await this.client.quit();
    logger.info("MessageSubscriber 연결 종료");
  }
}

// 싱글톤 인스턴스
export const messageSubscriber = new MessageSubscriber();
