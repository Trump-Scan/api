/**
 * 캐시 매니저
 *
 * Redis 기반 응답 캐싱을 관리합니다.
 * Redis 연결 실패 시에도 API가 정상 동작하도록 graceful degradation을 지원합니다.
 */
import { redisClient } from "./infrastructure/redis";
import { getLogger } from "./utils/logger";
import { FeedListResponse } from "./models/feed";
import { SortDirection } from "./repositories/feedRepository";

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
   * Redis 연결 가용성 확인
   * client 존재 여부와 연결 상태를 모두 확인합니다.
   */
  private isRedisAvailable(): boolean {
    const client = redisClient.getClient();
    return client !== null && client.status === "ready";
  }

  /**
   * 피드 캐시 키 생성
   */
  private buildFeedsKey(
    cursorDate: Date,
    direction: SortDirection,
    tags?: string[],
    limit?: number
  ): string {
    return `feeds:${direction}:${cursorDate.toISOString()}:${tags?.join(",") || ""}:${limit || 20}`;
  }

  /**
   * 피드 캐시 조회
   *
   * @param cursorDate 조회 기준 시각
   * @param direction 정렬 방향
   * @param tags 필터링 태그
   * @param limit 조회 개수
   * @returns 캐시된 피드 응답 또는 null
   */
  async getFeeds(
    cursorDate: Date,
    direction: SortDirection,
    tags?: string[],
    limit?: number
  ): Promise<FeedListResponse | null> {
    const key = this.buildFeedsKey(cursorDate, direction, tags, limit);
    return this.get<FeedListResponse>(key);
  }

  /**
   * 피드 캐시 저장
   *
   * @param cursorDate 조회 기준 시각
   * @param direction 정렬 방향
   * @param tags 필터링 태그
   * @param limit 조회 개수
   * @param value 저장할 피드 응답
   * @param ttl TTL (초), 기본값 5분
   */
  async setFeeds(
    cursorDate: Date,
    direction: SortDirection,
    tags?: string[],
    limit?: number,
    value?: FeedListResponse,
    ttl: number = DEFAULT_TTL
  ): Promise<void> {
    if (!value) return;
    const key = this.buildFeedsKey(cursorDate, direction, tags, limit);
    return this.set(key, value, ttl);
  }

  /**
   * 캐시에서 값 조회
   *
   * @param key 캐시 키
   * @returns 캐시된 값 또는 null
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisAvailable()) {
      logger.debug("Redis not available, cache miss", { key });
      return null;
    }

    const client = redisClient.getClient();
    if (!client) {
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
    if (!this.isRedisAvailable()) {
      logger.debug("Redis not available, skip cache set", { key });
      return;
    }

    const client = redisClient.getClient();
    if (!client) {
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
    if (!this.isRedisAvailable()) {
      logger.debug("Redis not available, skip cache invalidate", { pattern });
      return;
    }

    const client = redisClient.getClient();
    if (!client) {
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
