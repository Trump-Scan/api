/**
 * Redis 클라이언트
 *
 * ioredis를 사용하여 Redis 연결을 관리합니다.
 */
import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT, REDIS_DB } from "../config/redis";
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
      logger.info("Redis 연결 중...", { host: REDIS_HOST, port: REDIS_PORT });

      this.client = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        db: REDIS_DB,
        lazyConnect: true,
        maxRetriesPerRequest: null,
        retryStrategy: () => null, // 재연결 비활성화
      });

      // 에러 이벤트 핸들러 (로깅 없이 무시)
      this.client.on("error", () => {});

      await this.client.connect();
      this.isConnected = true;
      logger.info("Redis 연결 완료", { host: REDIS_HOST, port: REDIS_PORT });
    } catch (error) {
      this.isConnected = false;
      const err = error as Error;
      logger.error("Redis 연결 실패", { error: err.message });
      throw error;
    }
  }

  /**
   * 연결 상태 확인
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
   * 연결 상태 반환
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
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
