/**
 * 피드 라우트
 *
 * /api/v1/feeds 엔드포인트를 정의합니다.
 */
import { Router } from "express";
import { feedController } from "../controllers/feedController";

const router = Router();

/**
 * GET /api/v1/feeds/check
 *
 * 새 피드 존재 여부 확인
 */
router.get("/check", (req, res) => feedController.checkNewFeeds(req, res));

/**
 * GET /api/v1/feeds
 *
 * 피드 목록 조회
 */
router.get("/", (req, res) => feedController.getFeeds(req, res));

export default router;
