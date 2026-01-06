/**
 * 피드 Repository
 *
 * DB에서 피드 데이터를 조회합니다.
 */
import oracledb, { BindParameters } from "oracledb";
import { Feed } from "../models/feed";
import { getLogger } from "../utils/logger";

const logger = getLogger("feedRepository");

/**
 * FeedRepository 클래스
 *
 * 피드 데이터 조회를 담당합니다.
 */
class FeedRepository {
  private pool: oracledb.Pool | null = null;

  /**
   * Connection Pool 설정
   */
  setPool(pool: oracledb.Pool): void {
    this.pool = pool;
  }

  /**
   * 특정 시점 이후의 피드 목록 조회
   *
   * @param since 조회 시작 시각 (Date)
   * @param tags 필터링할 키워드 태그 (선택)
   * @param limit 조회할 피드 개수 (기본값: 20)
   * @returns Feed 배열
   */
  async findSince(since: Date, tags?: string[], limit: number = 20): Promise<Feed[]> {
    if (!this.pool) {
      throw new Error("Database pool not initialized");
    }

    let connection: oracledb.Connection | undefined;

    try {
      connection = await this.pool.getConnection();

      let sql: string;
      let binds: BindParameters;

      if (tags && tags.length > 0) {
        // 태그 필터링이 있는 경우
        sql = `
          SELECT DISTINCT
            f.id,
            f.display_summary as summary,
            f.channel,
            f.original_link as link,
            f.published_at,
            f.created_at
          FROM feed_items f
          JOIN feed_keywords fk ON f.id = fk.feed_item_id
          WHERE f.created_at > :since
            AND fk.keyword IN (${tags.map((_, i) => `:tag${i}`).join(", ")})
          ORDER BY f.created_at DESC
          FETCH FIRST :limit ROWS ONLY
        `;
        binds = {
          since,
          limit,
          ...tags.reduce((acc, tag, i) => ({ ...acc, [`tag${i}`]: tag }), {}),
        };
      } else {
        // 태그 필터링이 없는 경우
        sql = `
          SELECT
            f.id,
            f.display_summary as summary,
            f.channel,
            f.original_link as link,
            f.published_at,
            f.created_at
          FROM feed_items f
          WHERE f.created_at > :since
          ORDER BY f.created_at DESC
          FETCH FIRST :limit ROWS ONLY
        `;
        binds = { since, limit };
      }

      const result = await connection.execute<Record<string, unknown>>(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const rows = result.rows || [];

      // 각 피드의 키워드 조회
      const feeds: Feed[] = [];
      for (const row of rows) {
        const keywords = await this.getKeywordsForFeed(connection, row.ID as number);
        feeds.push({
          id: row.ID as number,
          summary: row.SUMMARY as string,
          channel: row.CHANNEL as string,
          link: row.LINK as string,
          tags: keywords,
          published_at: this.formatTimestamp(row.PUBLISHED_AT as Date),
          created_at: this.formatTimestamp(row.CREATED_AT as Date),
        });
      }

      logger.debug("피드 목록 조회 완료", { count: feeds.length, since: since.toISOString() });
      return feeds;
    } catch (error) {
      const err = error as Error;
      logger.error("피드 목록 조회 실패", { error: err.message });
      throw error;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * 특정 시점 이후 새 피드 존재 여부 확인
   *
   * @param since 확인 기준 시각 (Date)
   * @returns 새 피드가 있으면 true
   */
  async existsAfter(since: Date): Promise<boolean> {
    if (!this.pool) {
      throw new Error("Database pool not initialized");
    }

    let connection: oracledb.Connection | undefined;

    try {
      connection = await this.pool.getConnection();

      const sql = `
        SELECT COUNT(*) as cnt
        FROM feed_items
        WHERE created_at > :since
        FETCH FIRST 1 ROWS ONLY
      `;

      const result = await connection.execute<{ CNT: number }>(sql, { since }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const count = result.rows?.[0]?.CNT || 0;
      const exists = count > 0;

      logger.debug("새 피드 존재 확인", { exists, since: since.toISOString() });
      return exists;
    } catch (error) {
      const err = error as Error;
      logger.error("새 피드 존재 확인 실패", { error: err.message });
      throw error;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * 특정 피드의 키워드 목록 조회
   */
  private async getKeywordsForFeed(
    connection: oracledb.Connection,
    feedItemId: number
  ): Promise<string[]> {
    const sql = `
      SELECT keyword
      FROM feed_keywords
      WHERE feed_item_id = :feedItemId
    `;

    const result = await connection.execute<{ KEYWORD: string }>(sql, { feedItemId }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return (result.rows || []).map((row) => row.KEYWORD);
  }

  /**
   * 타임스탬프를 ISO 8601 UTC 형식으로 변환
   */
  private formatTimestamp(date: Date): string {
    return date.toISOString();
  }
}

// 싱글톤 인스턴스
export const feedRepository = new FeedRepository();
