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
 * 요청 파라미터 스키마
 */
const checkFeedsSchema = Joi.object({
  since: Joi.string().isoDate().required().messages({
    "string.isoDate": "since must be a valid ISO 8601 date",
    "any.required": "since is required",
  }),
});

const getFeedsSchema = Joi.object({
  since: Joi.string().isoDate().required().messages({
    "string.isoDate": "since must be a valid ISO 8601 date",
    "any.required": "since is required",
  }),
  tags: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * FeedController 클래스
 */
class FeedController {
  /**
   * GET /api/v1/feeds/check
   *
   * 새 피드 존재 여부 확인
   */
  async checkNewFeeds(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = checkFeedsSchema.validate(req.query);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const result = await feedService.checkNewFeeds(value.since);
      res.json(result);
    } catch (err) {
      const error = err as Error;
      logger.error("새 피드 확인 실패", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/v1/feeds
   *
   * 피드 목록 조회
   */
  async getFeeds(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = getFeedsSchema.validate(req.query);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      // tags 파라미터 파싱 (쉼표로 구분된 문자열 → 배열)
      const tags = value.tags
        ? value.tags.split(",").map((t: string) => t.trim())
        : undefined;

      const result = await feedService.getFeeds(value.since, tags, value.limit);
      res.json(result);
    } catch (err) {
      const error = err as Error;
      logger.error("피드 목록 조회 실패", { error: error.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

// 싱글톤 인스턴스
export const feedController = new FeedController();
