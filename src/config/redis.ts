/**
 * Redis 설정
 *
 * 환경 변수가 설정되어 있으면 환경 변수 값 사용,
 * 없으면 기본값(로컬 개발용) 사용
 */

const getEnv = (key: string, defaultValue: string): string => {
  return process.env[key] ?? defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

// Redis 연결 설정
export const REDIS_HOST = getEnv("REDIS_HOST", "localhost");
export const REDIS_PORT = getEnvNumber("REDIS_PORT", 6379);
export const REDIS_DB = getEnvNumber("REDIS_DB", 0);
export const REDIS_PASSWORD = getEnv("REDIS_PASSWORD", "");

// 스트림 설정
export const INPUT_STREAM = getEnv("REDIS_INPUT_STREAM", "trump-scan:feed-generation:new-feed");
export const CONSUMER_GROUP = getEnv("REDIS_CONSUMER_GROUP", "api-notifiers");
export const CONSUMER_NAME = getEnv("REDIS_CONSUMER_NAME", "api-worker-1");

// 타임아웃 설정 (밀리초)
export const BLOCK_TIMEOUT = getEnvNumber("REDIS_BLOCK_TIMEOUT", 5000);
