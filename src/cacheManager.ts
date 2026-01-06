/**
 * 캐시 매니저
 *
 * Redis 기반 응답 캐싱을 관리합니다.
 */
import { redisClient } from "./infrastructure/redis";
import { getLogger } from "./utils/logger";

const logger = getLogger("cacheManager");

// 기본 TTL (5분)
const DEFAULT_TTL = 300;

// 캐시 키 프리픽스
const CACHE_PREFIX = "trump-scan:api:cache:";

/**
 * CacheManager 클래스
 */
class CacheManager {
  /**
   * 캐시에서 값 조회
   *
   * @param key 캐시 키
   * @returns 캐시된 값 또는 null
   */
  async get<T>(key: string): Promise<T | null> {
    const client = redisClient.getClient();
    if (!client) {
      logger.debug("Redis not connected, cache miss", { key });
      return null;
    }

    try {
      const fullKey = CACHE_PREFIX + key;
      const value = await client.get(fullKey);

      if (value) {
        logger.debug("Cache hit", { key });
        return JSON.parse(value) as T;
      }

      logger.debug("Cache miss", { key });
      return null;
    } catch (error) {
      const err = error as Error;
      logger.error("Cache get error", { key, error: err.message });
      return null;
    }
  }

  /**
   * 캐시에 값 저장
   *
   * @param key 캐시 키
   * @param value 저장할 값
   * @param ttl TTL (초), 기본값 5분
   */
  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    const client = redisClient.getClient();
    if (!client) {
      logger.debug("Redis not connected, skip cache set", { key });
      return;
    }

    try {
      const fullKey = CACHE_PREFIX + key;
      const serialized = JSON.stringify(value);

      await client.setex(fullKey, ttl, serialized);
      logger.debug("Cache set", { key, ttl });
    } catch (error) {
      const err = error as Error;
      logger.error("Cache set error", { key, error: err.message });
    }
  }

  /**
   * 패턴 기반 캐시 무효화
   *
   * @param pattern 삭제할 키 패턴 (예: "feeds:*")
   */
  async invalidate(pattern: string): Promise<void> {
    const client = redisClient.getClient();
    if (!client) {
      logger.debug("Redis not connected, skip cache invalidate", { pattern });
      return;
    }

    try {
      const fullPattern = CACHE_PREFIX + pattern;
      const keys = await client.keys(fullPattern);

      if (keys.length > 0) {
        await client.del(...keys);
        logger.info("Cache invalidated", { pattern, count: keys.length });
      } else {
        logger.debug("No keys to invalidate", { pattern });
      }
    } catch (error) {
      const err = error as Error;
      logger.error("Cache invalidate error", { pattern, error: err.message });
    }
  }

  /**
   * 모든 피드 캐시 무효화
   */
  async invalidateFeeds(): Promise<void> {
    await this.invalidate("feeds:*");
  }
}

// 싱글톤 인스턴스
export const cacheManager = new CacheManager();
