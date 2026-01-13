/**
 * Environment Configuration
 *
 * Zod를 사용한 환경 변수 검증 및 중앙 집중식 설정 관리
 * 애플리케이션 시작 시 모든 환경 변수를 검증합니다.
 *
 * 사용법:
 *   import { env } from './config/env';
 *   console.log(env.PORT);
 */
import { z } from "zod";

/**
 * 환경 변수 스키마 정의
 *
 * Required: 반드시 제공해야 함 (기본값 없음)
 * Optional: 기본값이 있어 생략 가능
 */
const envSchema = z.object({
  // Application
  PORT: z
    .string()
    .default("3000")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  CORS_ORIGIN: z.string().default("*"),

  // Oracle Database (Required)
  DB_USERNAME: z.string().min(1, "DB_USERNAME is required"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),
  DB_DSN: z.string().min(1, "DB_DSN is required"),
  DB_WALLET_LOCATION: z.string().default("/opt/oracle/wallet"),
  DB_WALLET_PASSWORD: z.string().min(1, "DB_WALLET_PASSWORD is required"),

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z
    .string()
    .default("6379")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),
  REDIS_DB: z
    .string()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0).max(15)),
  REDIS_PASSWORD: z.string().optional().default(""),

  // Redis Streams
  REDIS_INPUT_STREAM: z
    .string()
    .default("trump-scan:feed-generation:new-feed"),
  REDIS_CONSUMER_GROUP: z.string().default("api-notifiers"),
  REDIS_CONSUMER_NAME: z.string().default("api-worker-1"),
  REDIS_BLOCK_TIMEOUT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0)),
});

/**
 * 스키마로부터 추론된 TypeScript 타입
 */
export type Env = z.infer<typeof envSchema>;

/**
 * 환경 변수 파싱 및 검증
 *
 * 검증 실패 시 상세한 에러 메시지를 출력하고 프로세스 종료
 */
function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `  - ${path}: ${issue.message}`;
    });

    console.error("\n========================================");
    console.error("Environment Configuration Error");
    console.error("========================================");
    console.error("The following environment variables are invalid:\n");
    console.error(errors.join("\n"));
    console.error("\nPlease check your .env file or environment settings.");
    console.error("See .env.example for required variables.\n");
    console.error("========================================\n");

    process.exit(1);
  }

  return result.data;
}

/**
 * 검증된 환경 변수
 *
 * 모든 환경 변수의 단일 진실 공급원(Single Source of Truth)
 *
 * @example
 * import { env } from './config/env';
 * console.log(env.PORT);        // number
 * console.log(env.DB_USERNAME); // string
 */
export const env: Env = parseEnv();

/**
 * 하위 호환성을 위한 설정 객체
 * 기존 config 파일 구조와 동일
 */
export const DB_CONFIG = {
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  dsn: env.DB_DSN,
  walletLocation: env.DB_WALLET_LOCATION,
  walletPassword: env.DB_WALLET_PASSWORD,
} as const;

export const REDIS_CONFIG = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  db: env.REDIS_DB,
  password: env.REDIS_PASSWORD,
} as const;

export const REDIS_STREAMS_CONFIG = {
  inputStream: env.REDIS_INPUT_STREAM,
  consumerGroup: env.REDIS_CONSUMER_GROUP,
  consumerName: env.REDIS_CONSUMER_NAME,
  blockTimeout: env.REDIS_BLOCK_TIMEOUT,
} as const;
