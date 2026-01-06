/**
 * Rate Limiter 미들웨어
 *
 * API 요청 속도 제한을 설정합니다.
 */
import rateLimit from "express-rate-limit";
import { getLogger } from "../utils/logger";

const logger = getLogger("rateLimiter");

/**
 * 기본 Rate Limiter
 *
 * - 윈도우: 1분
 * - 최대 요청: 100회
 */
export const defaultLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100, // 최대 100 요청
  standardHeaders: true, // RateLimit-* 헤더 포함
  legacyHeaders: false, // X-RateLimit-* 헤더 제외
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    },
  },
  handler: (req, res, _next, options) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json(options.message);
  },
});

/**
 * 엄격한 Rate Limiter (민감한 엔드포인트용)
 *
 * - 윈도우: 1분
 * - 최대 요청: 20회
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 20, // 최대 20 요청
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    },
  },
  handler: (req, res, _next, options) => {
    logger.warn("Strict rate limit exceeded", {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json(options.message);
  },
});
