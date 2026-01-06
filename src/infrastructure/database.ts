/**
 * Oracle 데이터베이스 서비스
 *
 * Oracle DB 연결 풀을 관리합니다.
 */
import oracledb from "oracledb";
import { DB_CONFIG } from "../config/database";
import { getLogger } from "../utils/logger";

const logger = getLogger("database");

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
      });

      this.isConnected = true;
      logger.info("Database 연결 완료", { dsn: DB_CONFIG.dsn });
    } catch (error) {
      this.isConnected = false;
      const err = error as Error;
      logger.error("DB 연결 실패", { error: err.message });
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
      const connection = await this.pool.getConnection();
      await connection.ping();
      await connection.close();
      return true;
    } catch {
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
