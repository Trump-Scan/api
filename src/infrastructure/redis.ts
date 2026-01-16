/**
 * Redis 클라이언트
 *
 * ioredis를 사용하여 Redis 연결을 관리합니다.
 * 재연결 복원력이 내장되어 있어 연결 실패 시에도 API가 정상 동작합니다.
 */
import Redis from "ioredis";
import { REDIS_CONFIG } from "../config/env";
import { getLogger } from "../utils/logger";

const logger = getLogger("redis");

/**
 * Redis 클라이언트 클래스
 */
class RedisClient {
  private client: Redis | null = null;
  private isConnected: boolean = false;

  /**
   * Redis 연결 초기화
   */
  async connect(): Promise<void> {
    try {
      logger.info("Redis 연결 중...", { host: REDIS_CONFIG.host, port: REDIS_CONFIG.port });

      this.client = new Redis({
        host: REDIS_CONFIG.host,
        port: REDIS_CONFIG.port,
        db: REDIS_CONFIG.db,
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false, // 끊김 시 명령어 큐잉 방지
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 100, 30000); // 100ms → max 30초
          logger.info("Redis 재연결 시도", { attempt: times, delay_ms: delay });
          return delay;
        },
      });

      // 이벤트 핸들러 등록
      this.setupEventHandlers();

      await this.client.connect();
      this.isConnected = true;
      logger.info("Redis 연결 완료", { host: REDIS_CONFIG.host, port: REDIS_CONFIG.port });
    } catch (error) {
      this.isConnected = false;
      const err = error as Error;
      logger.error("Redis 연결 실패", { error: err.message });
      throw error;
    }
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on("ready", () => {
      this.isConnected = true;
      logger.info("Redis 연결됨");
    });

    this.client.on("close", () => {
      this.isConnected = false;
      logger.warn("Redis 연결 끊김");
    });

    this.client.on("reconnecting", (delay: number) => {
      logger.info("Redis 재연결 중", { delay_ms: delay });
    });

    this.client.on("error", (err: Error) => {
      logger.error("Redis 에러", { error: err.message });
    });
  }

  /**
   * 연결 상태 확인 (ping)
   */
  async checkConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }

  /**
   * 연결 상태 반환 (동기)
   * client.status를 확인하여 정확한 상태 반환
   */
  getConnectionStatus(): boolean {
    if (!this.client) {
      return false;
    }
    return this.client.status === "ready";
  }

  /**
   * Redis 클라이언트 인스턴스 반환
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * 연결 종료
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info("Redis 연결 종료");
    }
  }
}

// 싱글톤 인스턴스
export const redisClient = new RedisClient();
