/**
 * 구조화된 로깅 설정
 *
 * Winston을 사용하여 구조화된 로그를 제공합니다.
 * 포맷: YYYY-MM-DD HH:MM:SS [LEVEL][logger] message key=value
 */
import winston from "winston";

const { combine, timestamp, printf } = winston.format;

/**
 * 커스텀 로그 포맷
 * Python structlog 스타일과 일치하도록 구성
 */
const customFormat = printf(({ level, message, timestamp, logger, ...meta }) => {
  const loggerName = logger || "app";
  const levelUpper = level.toUpperCase();

  // 기본 로그 라인
  let logLine = `${timestamp} [${levelUpper}][${loggerName}] ${message}`;

  // 추가 컨텍스트가 있으면 key=value 형식으로 추가
  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    const extras = metaKeys.map((k) => `${k}=${meta[k]}`).join(" ");
    logLine = `${logLine} ${extras}`;
  }

  return logLine;
});

/**
 * 기본 로거 인스턴스
 */
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    customFormat
  ),
  transports: [new winston.transports.Console()],
});

/**
 * 로거 인스턴스 생성
 *
 * @param name 로거 이름
 * @returns Winston Logger 인스턴스
 */
export function getLogger(name: string): winston.Logger {
  return baseLogger.child({ logger: name });
}

export default baseLogger;
