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
 * 정렬 방향
 */
export type SortDirection = "before" | "after";

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
   * cursor 기준 피드 조회
   *
   * @param cursor 조회 기준 시각 (Date)
   * @param direction 정렬 방향 ("before": 이전/최신순, "after": 이후/오래된순)
   * @param tags 필터링할 키워드 태그 (선택)
   * @param limit 조회할 피드 개수 (기본값: 20)
   * @returns Feed 배열
   */
  async findByDirection(
    cursor: Date,
    direction: SortDirection,
    tags?: string[],
    limit: number = 20
  ): Promise<Feed[]> {
    if (!this.pool) {
      throw new Error("Database pool not initialized");
    }

    const operator = direction === "before" ? "<" : ">";
    const order = direction === "before" ? "DESC" : "ASC";

    let connection: oracledb.Connection | undefined;

    try {
      connection = await this.pool.getConnection();

      let sql: string;
      let binds: BindParameters;

      if (tags && tags.length > 0) {
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
          WHERE f.created_at ${operator} :cursor
            AND fk.keyword IN (${tags.map((_, i) => `:tag${i}`).join(", ")})
          ORDER BY f.created_at ${order}
          FETCH FIRST :limit ROWS ONLY
        `;
        binds = {
          cursor,
          limit,
          ...tags.reduce((acc, tag, i) => ({ ...acc, [`tag${i}`]: tag }), {}),
        };
      } else {
        sql = `
          SELECT
            f.id,
            f.display_summary as summary,
            f.channel,
            f.original_link as link,
            f.published_at,
            f.created_at
          FROM feed_items f
          WHERE f.created_at ${operator} :cursor
          ORDER BY f.created_at ${order}
          FETCH FIRST :limit ROWS ONLY
        `;
        binds = { cursor, limit };
      }

      const result = await connection.execute<Record<string, unknown>>(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const rows = result.rows || [];

      if (rows.length === 0) {
        return [];
      }

      // 피드 ID 목록 추출
      const feedIds = rows.map((row) => row.ID as number);

      // 모든 키워드를 한 번에 조회 (1+N → 1+1)
      const keywordsMap = await this.getKeywordsForFeeds(connection, feedIds);

      // 피드 객체 생성
      const feeds: Feed[] = rows.map((row) => ({
        id: row.ID as number,
        summary: row.SUMMARY as string,
        channel: row.CHANNEL as string,
        link: row.LINK as string,
        tags: keywordsMap.get(row.ID as number) || [],
        published_at: this.formatTimestamp(row.PUBLISHED_AT as Date),
        created_at: this.formatTimestamp(row.CREATED_AT as Date),
      }));

      logger.debug("findByDirection 완료", {
        direction,
        count: feeds.length,
        cursor: cursor.toISOString(),
      });
      return feeds;
    } catch (error) {
      const err = error as Error;
      logger.error("findByDirection 실패", { direction, error: err.message });
      throw error;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * 여러 피드의 키워드 목록을 한 번에 조회
   *
   * @param connection DB 연결
   * @param feedIds 피드 ID 배열
   * @returns Map<feedId, keywords[]>
   */
  private async getKeywordsForFeeds(
    connection: oracledb.Connection,
    feedIds: number[]
  ): Promise<Map<number, string[]>> {
    const result = new Map<number, string[]>();

    if (feedIds.length === 0) {
      return result;
    }

    const sql = `
      SELECT feed_item_id, keyword
      FROM feed_keywords
      WHERE feed_item_id IN (${feedIds.map((_, i) => `:id${i}`).join(", ")})
    `;

    const binds = feedIds.reduce(
      (acc, id, i) => ({ ...acc, [`id${i}`]: id }),
      {}
    );

    const queryResult = await connection.execute<{ FEED_ITEM_ID: number; KEYWORD: string }>(
      sql,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 결과를 Map으로 그룹화
    for (const row of queryResult.rows || []) {
      const feedId = row.FEED_ITEM_ID;
      const keyword = row.KEYWORD;

      if (!result.has(feedId)) {
        result.set(feedId, []);
      }
      result.get(feedId)!.push(keyword);
    }

    return result;
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
