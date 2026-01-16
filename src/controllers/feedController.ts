/**
 * 피드 컨트롤러
 *
 * 피드 관련 HTTP 요청/응답을 처리합니다.
 */
import { Request, Response } from "express";
import Joi from "joi";
import { feedService } from "../services/feedService";
import { getLogger } from "../utils/logger";

const logger = getLogger("feedController");

/**
 * ISO 8601 날짜 문자열을 Date 객체로 파싱
 */
function parseISO8601(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return date;
}

/**
 * 요청 파라미터 스키마
 */
const getFeedsBeforeSchema = Joi.object({
  cursor: Joi.string().isoDate().optional().messages({
    "string.isoDate": "cursor must be a valid ISO 8601 date",
  }),
  tags: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const getFeedsAfterSchema = Joi.object({
  cursor: Joi.string().isoDate().required().messages({
    "string.isoDate": "cursor must be a valid ISO 8601 date",
    "any.required": "cursor is required",
  }),
  tags: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * FeedController 클래스
 */
class FeedController {
  /**
   * GET /api/v1/feeds/before
   *
   * cursor 기준 이전(더 오래된) 피드 조회 (최신순 정렬)
   */
  async getFeedsBefore(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = getFeedsBeforeSchema.validate(req.query);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      // 입력 변환
      const cursorDate = value.cursor ? parseISO8601(value.cursor) : new Date();
      const tags = value.tags
        ? value.tags.split(",").map((t: string) => t.trim())
        : undefined;

      const result = await feedService.getFeedsBefore(cursorDate, tags, value.limit);
      res.json(result);
    } catch (err) {
      const error = err as Error;
      logger.error("getFeedsBefore 실패", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/v1/feeds/after
   *
   * cursor 기준 이후(더 최근) 피드 조회 (오래된순 정렬)
   */
  async getFeedsAfter(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = getFeedsAfterSchema.validate(req.query);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      // 입력 변환
      const cursorDate = parseISO8601(value.cursor);
      const tags = value.tags
        ? value.tags.split(",").map((t: string) => t.trim())
        : undefined;

      const result = await feedService.getFeedsAfter(cursorDate, value.cursor, tags, value.limit);
      res.json(result);
    } catch (err) {
      const error = err as Error;
      logger.error("getFeedsAfter 실패", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

// 싱글톤 인스턴스
export const feedController = new FeedController();
