import express, { Application, Request, Response, NextFunction } from "express";

const app: Application = express();

// JSON 파싱 미들웨어
app.use(express.json());

// 요청 로깅 미들웨어
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check 엔드포인트
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

export default app;
