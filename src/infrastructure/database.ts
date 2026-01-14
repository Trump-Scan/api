/**
 * Oracle 데이터베이스 서비스
 *
 * Oracle DB 연결 풀을 관리합니다.
 */
import oracledb from "oracledb";
import { DB_CONFIG } from "../config/env";
import { getLogger } from "../utils/logger";

const logger = getLogger("database");

// 연결 타임아웃 (초)
const CONNECTION_TIMEOUT_SEC = 10;

/**
 * 타임아웃 프로미스 헬퍼
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    ),
  ]);
}

/**
 * Oracle 데이터베이스 클래스
 *
 * Connection Pool을 사용하여 연결을 관리합니다.
 */
class Database {
  private pool: oracledb.Pool | null = null;
  private isConnected: boolean = false;

  /**
   * 데이터베이스 연결 초기화
   */
  async connect(): Promise<void> {
    try {
      logger.info("Oracle DB 연결 중...", { dsn: DB_CONFIG.dsn });

      this.pool = await oracledb.createPool({
        user: DB_CONFIG.username,
        password: DB_CONFIG.password,
        connectString: DB_CONFIG.dsn,
        configDir: DB_CONFIG.walletLocation,
        walletLocation: DB_CONFIG.walletLocation,
        walletPassword: DB_CONFIG.walletPassword,
        poolMin: 1,
        poolMax: 10,
        poolIncrement: 1,
        poolTimeout: CONNECTION_TIMEOUT_SEC,
      });


      logger.debug("DB 연결 테스트 중...");
      const testConnection = await withTimeout(
        this.pool.getConnection(),
        CONNECTION_TIMEOUT_SEC * 1000,
        `DB 연결 타임아웃 (${CONNECTION_TIMEOUT_SEC}초)`
      );
      await testConnection.ping();
      await testConnection.close();

      this.isConnected = true;
      logger.info("Database 연결 완료", { dsn: DB_CONFIG.dsn });
    } catch (error) {
      this.isConnected = false;
      const err = error as Error;
      logger.error("DB 연결 실패", {
        error: err.message,
        walletLocation: DB_CONFIG.walletLocation,
      });
      throw error;
    }
  }

  /**
   * 연결 상태 확인
   */
  async checkConnection(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const connection = await withTimeout(
        this.pool.getConnection(),
        CONNECTION_TIMEOUT_SEC * 1000,
        "연결 체크 타임아웃"
      );
      await connection.ping();
      await connection.close();
      return true;
    } catch (error) {
      const err = error as Error;
      logger.warn("DB 연결 체크 실패", { error: err.message });
      return false;
    }
  }

  /**
   * 연결 상태 반환
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Connection Pool 반환
   */
  getPool(): oracledb.Pool | null {
    return this.pool;
  }

  /**
   * 연결 종료
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close(0);
      this.isConnected = false;
      logger.info("Database 연결 종료");
    }
  }
}

// 싱글톤 인스턴스
export const database = new Database();
