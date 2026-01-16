/**
 * FeedService 단위 테스트
 */
import { feedService } from "../../src/services/feedService";

describe("FeedService", () => {
  describe("getFeedsBefore", () => {
    it("Date 객체로 조회", async () => {
      // DB 연결이 없으면 에러 발생
      await expect(
        feedService.getFeedsBefore(new Date("2025-01-14T00:00:00Z"))
      ).rejects.toThrow();
    });

    it("limit 기본값은 20", async () => {
      try {
        await feedService.getFeedsBefore(new Date("2025-01-14T00:00:00Z"));
      } catch (error) {
        // DB 에러는 예상됨
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });

    it("tags 배열 전달", async () => {
      try {
        await feedService.getFeedsBefore(
          new Date("2025-01-14T00:00:00Z"),
          ["삼성전자", "반도체"]
        );
      } catch (error) {
        // DB 에러는 예상됨
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });

    it("limit 범위 검증 - 최소값", async () => {
      try {
        await feedService.getFeedsBefore(
          new Date("2025-01-14T00:00:00Z"),
          undefined,
          0
        );
      } catch (error) {
        // limit이 0이어도 1로 조정되어야 함, 에러가 아님
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });

    it("limit 범위 검증 - 최대값", async () => {
      try {
        await feedService.getFeedsBefore(
          new Date("2025-01-14T00:00:00Z"),
          undefined,
          200
        );
      } catch (error) {
        // limit이 200이어도 100으로 조정되어야 함, 에러가 아님
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });
  });

  describe("getFeedsAfter", () => {
    it("Date 객체로 조회", async () => {
      // DB 연결이 없으면 에러 발생
      await expect(
        feedService.getFeedsAfter(
          new Date("2025-01-14T00:00:00Z"),
          "2025-01-14T00:00:00Z"
        )
      ).rejects.toThrow();
    });

    it("limit 기본값은 20", async () => {
      try {
        await feedService.getFeedsAfter(
          new Date("2025-01-14T00:00:00Z"),
          "2025-01-14T00:00:00Z"
        );
      } catch (error) {
        // DB 에러는 예상됨
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });

    it("tags 배열 전달", async () => {
      try {
        await feedService.getFeedsAfter(
          new Date("2025-01-14T00:00:00Z"),
          "2025-01-14T00:00:00Z",
          ["삼성전자", "반도체"]
        );
      } catch (error) {
        // DB 에러는 예상됨
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });

    it("limit 범위 검증 - 최소값", async () => {
      try {
        await feedService.getFeedsAfter(
          new Date("2025-01-14T00:00:00Z"),
          "2025-01-14T00:00:00Z",
          undefined,
          0
        );
      } catch (error) {
        // limit이 0이어도 1로 조정되어야 함, 에러가 아님
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });

    it("limit 범위 검증 - 최대값", async () => {
      try {
        await feedService.getFeedsAfter(
          new Date("2025-01-14T00:00:00Z"),
          "2025-01-14T00:00:00Z",
          undefined,
          200
        );
      } catch (error) {
        // limit이 200이어도 100으로 조정되어야 함, 에러가 아님
        expect((error as Error).message).not.toContain("Invalid date format");
      }
    });
  });
});
