/**
 * 글로벌 에러 핸들러
 *
 * 일관된 에러 응답 형식을 제공합니다.
 */
import { Request, Response, NextFunction } from "express";
import { getLogger } from "../utils/logger";

const logger = getLogger("errorHandler");

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, message: string, code: string = "ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "ApiError";
  }

  static badRequest(message: string, code: string = "BAD_REQUEST"): ApiError {
    return new ApiError(400, message, code);
  }

  static notFound(message: string, code: string = "NOT_FOUND"): ApiError {
    return new ApiError(404, message, code);
  }

  static internal(message: string, code: string = "INTERNAL_ERROR"): ApiError {
    return new ApiError(500, message, code);
  }
}

/**
 * 에러 응답 인터페이스
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * 글로벌 에러 핸들러 미들웨어
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ApiError인 경우
  if (err instanceof ApiError) {
    logger.warn("API Error", {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });

    const response: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // 일반 에러인 경우
  logger.error("Unhandled Error", {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  const response: ErrorResponse = {
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  };

  res.status(500).json(response);
}

/**
 * 404 Not Found 핸들러
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.warn("Route not found", { method: req.method, path: req.path });

  const response: ErrorResponse = {
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
  };

  res.status(404).json(response);
}
