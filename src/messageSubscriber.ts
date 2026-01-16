/**
 * 메시지 구독자
 *
 * Redis Streams에서 피드 생성 이벤트를 수신하고 캐시를 무효화합니다.
 * Redis 연결 실패 시 자동 재연결을 시도하며, 연결 복원 시 정상 동작을 재개합니다.
 */
import Redis from "ioredis";
import { REDIS_CONFIG, REDIS_STREAMS_CONFIG } from "./config/env";
import { cacheManager } from "./cacheManager";
import { getLogger } from "./utils/logger";

const logger = getLogger("messageSubscriber");

/**
 * 연결 상태 타입
 */
type ConnectionState = "connected" | "disconnected" | "reconnecting";

/**
 * 구독자 상태 타입
 */
type SubscriberStatus = "running" | "paused" | "stopped";

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
  private connectionState: ConnectionState = "disconnected";
  private consumerGroupCreated: boolean = false;

  constructor() {
    this.client = new Redis({
      host: REDIS_CONFIG.host,
      port: REDIS_CONFIG.port,
      db: REDIS_CONFIG.db,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 30000); // 100ms → max 30초
        logger.info("MessageSubscriber Redis 재연결 시도", { attempt: times, delay_ms: delay });
        return delay;
      },
    });

    this.setupEventHandlers();

    this.stream = REDIS_STREAMS_CONFIG.inputStream;
    this.group = REDIS_STREAMS_CONFIG.consumerGroup;
    this.consumer = REDIS_STREAMS_CONFIG.consumerName;
    this.blockTimeout = REDIS_STREAMS_CONFIG.blockTimeout;
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    this.client.on("ready", () => {
      this.connectionState = "connected";
      logger.info("MessageSubscriber Redis 연결됨");

      // 재연결 시 Consumer Group 재생성 시도
      if (this.isRunning && !this.consumerGroupCreated) {
        this.ensureConsumerGroup().catch((err) => {
          logger.error("Consumer Group 재생성 실패", { error: (err as Error).message });
        });
      }
    });

    this.client.on("close", () => {
      this.connectionState = "disconnected";
      logger.warn("MessageSubscriber Redis 연결 끊김");
    });

    this.client.on("reconnecting", () => {
      this.connectionState = "reconnecting";
      logger.info("MessageSubscriber Redis 재연결 중");
    });

    this.client.on("error", (err: Error) => {
      logger.error("MessageSubscriber Redis 에러", { error: err.message });
    });
  }

  /**
   * Consumer Group 생성 (없으면 생성)
   */
  private async ensureConsumerGroup(): Promise<void> {
    try {
      await this.client.xgroup("CREATE", this.stream, this.group, "0", "MKSTREAM");
      logger.info("Consumer Group 생성", { group: this.group });
      this.consumerGroupCreated = true;
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("BUSYGROUP")) {
        logger.debug("Consumer Group 이미 존재", { group: this.group });
        this.consumerGroupCreated = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * 메시지 수신 시작
   */
  async start(): Promise<void> {
    this.isRunning = true;
    logger.info("MessageSubscriber 시작 요청", {
      stream: this.stream,
      group: this.group,
      consumer: this.consumer,
    });

    // 연결 상태 확인 후 Consumer Group 생성
    if (this.client.status === "ready") {
      this.connectionState = "connected";
      try {
        await this.ensureConsumerGroup();
      } catch (error) {
        logger.error("Consumer Group 생성 실패, 재연결 시 재시도", {
          error: (error as Error).message,
        });
      }
    } else {
      logger.warn("Redis not connected, MessageSubscriber가 연결 대기 중");
    }

    // 메시지 처리 루프 시작 (비동기)
    this.processMessages();
  }

  /**
   * 메시지 처리 루프
   */
  private async processMessages(): Promise<void> {
    while (this.isRunning) {
      // 연결 안됐으면 대기
      if (this.connectionState !== "connected") {
        logger.debug("Redis 연결 대기 중...");
        await this.sleep(1000);
        continue;
      }

      // Consumer Group이 생성되지 않았으면 생성 시도
      if (!this.consumerGroupCreated) {
        try {
          await this.ensureConsumerGroup();
        } catch (error) {
          logger.error("Consumer Group 생성 실패", { error: (error as Error).message });
          await this.sleep(1000);
          continue;
        }
      }

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
        if (!this.isRunning) {
          break;
        }

        if (this.isConnectionError(error)) {
          logger.warn("연결 에러, 재연결 대기", { error: (error as Error).message });
          await this.sleep(1000);
        } else {
          const err = error as Error;
          logger.error("메시지 수신 오류", { error: err.message });
          await this.sleep(1000);
        }
      }
    }
  }

  /**
   * 연결 관련 에러인지 확인
   */
  private isConnectionError(error: unknown): boolean {
    const msg = (error as Error).message || "";
    return (
      msg.includes("ECONNREFUSED") ||
      msg.includes("ECONNRESET") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("Connection is closed") ||
      msg.includes("Stream isn't writeable") ||
      msg.includes("Socket already opened") ||
      msg.includes("getaddrinfo")
    );
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
   * 현재 상태 조회
   */
  getStatus(): SubscriberStatus {
    if (!this.isRunning) return "stopped";
    if (this.connectionState !== "connected") return "paused";
    return "running";
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
