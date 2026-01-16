import express, { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { getLogger } from "./utils/logger";
import { database } from "./infrastructure/database";
import { redisClient } from "./infrastructure/redis";
import { messageSubscriber } from "./messageSubscriber";
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
  const dbConnected = await database.checkConnection();
  const dbStatus = dbConnected ? "connected" : "disconnected";
  const redisConnected = redisClient.getConnectionStatus();
  const redisStatus = redisConnected ? "connected" : "disconnected";
  const subscriberStatus = messageSubscriber.getStatus();

  // DB가 연결되어 있으면 ok, 아니면 degraded
  // Redis는 선택적이므로 상태에 영향 없음
  const overallStatus = dbConnected ? "ok" : "degraded";

  logger.info("Health check", {
    status: overallStatus,
    db: dbStatus,
    redis: redisStatus,
    messageSubscriber: subscriberStatus,
  });

  res.json({
    status: overallStatus,
    db: dbStatus,
    redis: redisStatus,
    messageSubscriber: subscriberStatus,
  });
});

// API 라우트
app.use("/api/v1/feeds", feedsRouter);

// 404 핸들러
app.use(notFoundHandler);

// 글로벌 에러 핸들러
app.use(errorHandler);

export default app;
