/**
 * 피드 서비스
 *
 * 피드 관련 비즈니스 로직을 처리합니다.
 */
import { feedRepository, SortDirection } from "../repositories/feedRepository";
import { FeedListResponse } from "../models/feed";
import { cacheManager } from "../cacheManager";
import { getLogger } from "../utils/logger";

const logger = getLogger("feedService");

/**
 * FeedService 클래스
 *
 * 피드 관련 비즈니스 로직을 담당합니다.
 */
class FeedService {
  /**
   * cursor 기준 이전(더 오래된) 피드 조회 (최신순 정렬)
   *
   * @param cursor 조회 기준 시각
   * @param tags 필터링할 키워드 태그 (선택)
   * @param limit 조회할 피드 개수 (기본값: 20, 최대: 100)
   * @returns FeedListResponse
   */
  async getFeedsBefore(
    cursor: Date,
    tags?: string[],
    limit: number = 20
  ): Promise<FeedListResponse> {
    return this.getFeeds(cursor, "before", tags, limit);
  }

  /**
   * cursor 기준 이후(더 최근) 피드 조회 (오래된순 정렬)
   *
   * @param cursor 조회 기준 시각
   * @param originalCursor 원본 cursor 문자열 (next_cursor 반환용)
   * @param tags 필터링할 키워드 태그 (선택)
   * @param limit 조회할 피드 개수 (기본값: 20, 최대: 100)
   * @returns FeedListResponse
   */
  async getFeedsAfter(
    cursor: Date,
    originalCursor: string,
    tags?: string[],
    limit: number = 20
  ): Promise<FeedListResponse> {
    return this.getFeeds(cursor, "after", tags, limit, originalCursor);
  }

  /**
   * 공통 피드 조회 로직
   */
  private async getFeeds(
    cursorDate: Date,
    direction: SortDirection,
    tags?: string[],
    limit: number = 20,
    originalCursor?: string
  ): Promise<FeedListResponse> {
    // limit 범위 검증 (1-100)
    const validLimit = Math.min(Math.max(limit, 1), 100);

    // 캐시 조회
    const cached = await cacheManager.getFeeds(cursorDate, direction, tags, validLimit);
    if (cached) {
      logger.debug(`getFeeds ${direction} 캐시 히트`, { direction, tags, limit: validLimit });
      return cached;
    }

    logger.debug(`getFeeds ${direction} 요청`, { direction, tags, limit: validLimit });

    const feeds = await feedRepository.findByDirection(cursorDate, direction, tags, validLimit);

    // next_cursor 계산
    let nextCursor: string | null;
    if (feeds.length > 0) {
      nextCursor = feeds[feeds.length - 1].created_at;
    } else {
      // 피드 없을 때: before는 null, after는 입력된 cursor 반환
      nextCursor = direction === "before" ? null : (originalCursor || cursorDate.toISOString());
    }

    const result: FeedListResponse = {
      feeds,
      count: feeds.length,
      next_cursor: nextCursor,
    };

    // 캐시 저장
    await cacheManager.setFeeds(cursorDate, direction, tags, validLimit, result);

    logger.info(`getFeeds ${direction} 완료`, {
      direction,
      count: feeds.length,
      next_cursor: nextCursor,
    });

    return result;
  }
}

// 싱글톤 인스턴스
export const feedService = new FeedService();
