/**
 * 피드 라우트
 *
 * /api/v1/feeds 엔드포인트를 정의합니다.
 */
import { Router } from "express";
import { feedController } from "../controllers/feedController";

const router = Router();

/**
 * GET /api/v1/feeds/before
 *
 * cursor 기준 이전(더 오래된) 피드 조회 (최신순 정렬)
 */
router.get("/before", (req, res) => feedController.getFeedsBefore(req, res));

/**
 * GET /api/v1/feeds/after
 *
 * cursor 기준 이후(더 최근) 피드 조회 (오래된순 정렬)
 */
router.get("/after", (req, res) => feedController.getFeedsAfter(req, res));

export default router;
