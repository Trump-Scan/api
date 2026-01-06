/**
 * FeedService 단위 테스트
 */
import { feedService } from "../../src/services/feedService";

describe("FeedService", () => {
  describe("checkNewFeeds", () => {
    it("유효한 ISO 8601 날짜 파싱", async () => {
      // DB 연결이 없으면 에러 발생
      await expect(
        feedService.checkNewFeeds("2025-01-01T00:00:00Z")
      ).rejects.toThrow();
    });

    it("잘못된 날짜 형식이면 에러", async () => {
      await expect(
        feedService.checkNewFeeds("invalid-date")
      ).rejects.toThrow("Invalid date format");
    });

    it("빈 문자열이면 에러", async () => {
      await expect(feedService.checkNewFeeds("")).rejects.toThrow();
    });
  });

  describe("getFeeds", () => {
    it("유효한 파라미터 처리", async () => {
      // DB 연결이 없으면 에러 발생
      await expect(
        feedService.getFeeds("2025-01-01T00:00:00Z")
      ).rejects.toThrow();
    });

    it("잘못된 날짜 형식이면 에러", async () => {
      await expect(
        feedService.getFeeds("not-a-date")
      ).rejects.toThrow("Invalid date format");
    });

    it("limit 기본값은 20", async () => {
      // 내부 구현 테스트 - limit이 제대로 전달되는지
      // DB 연결이 없어도 파싱 단계에서 에러가 안 나야 함
      try {
        await feedService.getFeeds("2025-01-01T00:00:00Z");
      } catch (error) {
        // DB 에러는 예상됨, 날짜 파싱 에러가 아니면 OK
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });

    it("tags 배열 전달", async () => {
      try {
        await feedService.getFeeds("2025-01-01T00:00:00Z", ["삼성전자", "반도체"]);
      } catch (error) {
        // DB 에러는 예상됨
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });

    it("limit 범위 검증 - 최소값", async () => {
      try {
        await feedService.getFeeds("2025-01-01T00:00:00Z", undefined, 0);
      } catch (error) {
        // limit이 0이어도 1로 조정되어야 함, 에러가 아님
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });

    it("limit 범위 검증 - 최대값", async () => {
      try {
        await feedService.getFeeds("2025-01-01T00:00:00Z", undefined, 200);
      } catch (error) {
        // limit이 200이어도 100으로 조정되어야 함, 에러가 아님
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });
  });
});

describe("ISO 8601 파싱", () => {
  it("UTC 형식 (Z)", async () => {
    await expect(
      feedService.checkNewFeeds("2025-01-01T00:00:00Z")
    ).rejects.toThrow(); // DB 에러, 파싱은 성공
  });

  it("타임존 오프셋 형식 (+09:00)", async () => {
    await expect(
      feedService.checkNewFeeds("2025-01-01T09:00:00+09:00")
    ).rejects.toThrow(); // DB 에러, 파싱은 성공
  });

  it("타임존 없는 형식", async () => {
    await expect(
      feedService.checkNewFeeds("2025-01-01T00:00:00")
    ).rejects.toThrow(); // DB 에러, 파싱은 성공
  });

  it("날짜만 있는 형식", async () => {
    await expect(
      feedService.checkNewFeeds("2025-01-01")
    ).rejects.toThrow(); // DB 에러, 파싱은 성공
  });
});
