/**
 * 피드 모델
 *
 * API 응답에 사용되는 피드 데이터 타입입니다.
 */

/**
 * Feed 인터페이스
 *
 * 사용자에게 표시될 피드 항목입니다.
 */
export interface Feed {
  id: number;
  summary: string;
  tags: string[];
  channel: string;
  link: string;
  published_at: string;
  created_at: string;
}

/**
 * 피드 목록 응답
 */
export interface FeedListResponse {
  feeds: Feed[];
  count: number;
}

/**
 * 새 피드 확인 응답
 */
export interface FeedCheckResponse {
  has_new: boolean;
}
