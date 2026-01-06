/**
 * 피드 서비스
 *
 * 피드 관련 비즈니스 로직을 처리합니다.
 */
import { feedRepository } from "../repositories/feedRepository";
import { Feed, FeedListResponse, FeedCheckResponse } from "../models/feed";
import { cacheManager } from "../cacheManager";
import { getLogger } from "../utils/logger";

const logger = getLogger("feedService");

// 캐시 TTL (5분)
const CACHE_TTL = 300;

/**
 * ISO 8601 날짜 문자열을 Date 객체로 파싱
 *
 * @param dateStr ISO 8601 형식의 날짜 문자열
 * @returns Date 객체
 * @throws Error 유효하지 않은 날짜 형식인 경우
 */
function parseISO8601(dateStr: string): Date {
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  return date;
}

/**
 * FeedService 클래스
 *
 * 피드 관련 비즈니스 로직을 담당합니다.
 */
class FeedService {
  /**
   * 새 피드 존재 여부 확인
   *
   * @param since 확인 기준 시각 (ISO 8601 문자열)
   * @returns FeedCheckResponse
   */
  async checkNewFeeds(since: string): Promise<FeedCheckResponse> {
    const sinceDate = parseISO8601(since);

    logger.debug("새 피드 확인 요청", { since });

    const hasNew = await feedRepository.existsAfter(sinceDate);

    logger.info("새 피드 확인 완료", { since, has_new: hasNew });

    return { has_new: hasNew };
  }

  /**
   * 피드 목록 조회
   *
   * @param since 조회 시작 시각 (ISO 8601 문자열)
   * @param tags 필터링할 키워드 태그 (선택)
   * @param limit 조회할 피드 개수 (기본값: 20, 최대: 100)
   * @returns FeedListResponse
   */
  async getFeeds(
    since: string,
    tags?: string[],
    limit: number = 20
  ): Promise<FeedListResponse> {
    const sinceDate = parseISO8601(since);

    // limit 범위 검증 (1-100)
    const validLimit = Math.min(Math.max(limit, 1), 100);

    // 캐시 키 생성
    const cacheKey = `feeds:${since}:${tags?.join(",") || ""}:${validLimit}`;

    // 캐시 조회
    const cached = await cacheManager.get<FeedListResponse>(cacheKey);
    if (cached) {
      logger.debug("피드 목록 캐시 히트", { since, tags, limit: validLimit });
      return cached;
    }

    logger.debug("피드 목록 조회 요청", { since, tags, limit: validLimit });

    const feeds = await feedRepository.findSince(sinceDate, tags, validLimit);

    const result: FeedListResponse = {
      feeds,
      count: feeds.length,
    };

    // 캐시 저장
    await cacheManager.set(cacheKey, result, CACHE_TTL);

    logger.info("피드 목록 조회 완료", { since, count: feeds.length });

    return result;
  }
}

// 싱글톤 인스턴스
export const feedService = new FeedService();
