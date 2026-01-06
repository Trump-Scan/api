import express, { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { getLogger } from "./utils/logger";
import { database } from "./infrastructure/database";
import { redisClient } from "./infrastructure/redis";
import feedsRouter from "./routes/feeds";
import { defaultLimiter } from "./middlewares/rateLimiter";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

const logger = getLogger("server");
const app: Application = express();

// 보안 헤더 (Helmet)
app.use(helmet());

// CORS 설정
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 응답 압축
app.use(compression());

// JSON 파싱 미들웨어
app.use(express.json());

// Rate Limiting
app.use(defaultLimiter);

// 요청 로깅 미들웨어
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info("Request received", { method: req.method, path: req.path });
  next();
});

// Health check 엔드포인트 (Rate Limit 이후)
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

// 404 핸들러
app.use(notFoundHandler);

// 글로벌 에러 핸들러
app.use(errorHandler);

export default app;
