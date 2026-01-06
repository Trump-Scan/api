import app from "./server";
import { getLogger } from "./utils/logger";
import { database } from "./infrastructure/database";
import { redisClient } from "./infrastructure/redis";
import { feedRepository } from "./repositories/feedRepository";

const logger = getLogger("main");
const PORT = process.env.PORT || 3000;

async function main() {
  // 외부 서비스 연결
  try {
    await database.connect();
    const pool = database.getPool();
    if (pool) {
      feedRepository.setPool(pool);
      logger.info("FeedRepository initialized");
    }
  } catch {
    logger.warn("Database connection failed, continuing without DB");
  }

  try {
    await redisClient.connect();
  } catch {
    logger.warn("Redis connection failed, continuing without Redis");
  }

  // 서버 시작
  app.listen(PORT, () => {
    logger.info("Server started", { port: PORT });
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down...");
  await database.close();
  await redisClient.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down...");
  await database.close();
  await redisClient.close();
  process.exit(0);
});

main();
