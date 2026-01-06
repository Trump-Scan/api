import express, { Application, Request, Response, NextFunction } from "express";
import { getLogger } from "./utils/logger";
import { database } from "./infrastructure/database";
import { redisClient } from "./infrastructure/redis";
import feedsRouter from "./routes/feeds";

const logger = getLogger("server");
const app: Application = express();

// JSON 파싱 미들웨어
app.use(express.json());

// 요청 로깅 미들웨어
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info("Request received", { method: req.method, path: req.path });
  next();
});

// Health check 엔드포인트
app.get("/health", async (_req: Request, res: Response) => {
  const dbStatus = database.getConnectionStatus() ? "connected" : "disconnected";
  const redisStatus = redisClient.getConnectionStatus() ? "connected" : "disconnected";

  logger.info("Health check", { db: dbStatus, redis: redisStatus });

  res.json({
    status: "ok",
    db: dbStatus,
    redis: redisStatus,
  });
});

// API 라우트
app.use("/api/v1/feeds", feedsRouter);

export default app;
