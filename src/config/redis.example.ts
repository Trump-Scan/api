/**
 * Redis 설정 템플릿
 *
 * 이 파일을 redis.ts로 복사하고 환경에 맞게 값을 수정하세요.
 */

// Redis 연결 설정
export const REDIS_HOST = "localhost";
export const REDIS_PORT = 6379;
export const REDIS_DB = 0;

// 스트림 설정
export const INPUT_STREAM = "trump-scan:feed-generation:new-feed";
export const CONSUMER_GROUP = "api-notifiers";
export const CONSUMER_NAME = "api-worker-1";

// 타임아웃 설정 (밀리초)
export const BLOCK_TIMEOUT = 5000; // 5초
