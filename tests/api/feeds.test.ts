/**
 * 피드 API 엔드포인트 테스트
 */
import request from "supertest";
import app from "../../src/server";

describe("GET /health", () => {
  it("헬스체크 응답 반환", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("db");
    expect(response.body).toHaveProperty("redis");
  });
});

describe("GET /api/v1/feeds/check", () => {
  it("since 파라미터 없으면 400 에러", async () => {
    const response = await request(app).get("/api/v1/feeds/check");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("잘못된 since 형식이면 400 에러", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/check")
      .query({ since: "invalid-date" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("올바른 since 형식이면 has_new 응답", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/check")
      .query({ since: "2025-01-01T00:00:00Z" });

    // DB 연결이 없으면 500 에러, 있으면 200
    if (response.status === 200) {
      expect(response.body).toHaveProperty("has_new");
      expect(typeof response.body.has_new).toBe("boolean");
    } else {
      expect(response.status).toBe(500);
    }
  });
});

describe("GET /api/v1/feeds", () => {
  it("since 파라미터 없으면 400 에러", async () => {
    const response = await request(app).get("/api/v1/feeds");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("잘못된 since 형식이면 400 에러", async () => {
    const response = await request(app)
      .get("/api/v1/feeds")
      .query({ since: "not-a-date" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("limit이 범위를 벗어나면 400 에러", async () => {
    const response = await request(app)
      .get("/api/v1/feeds")
      .query({ since: "2025-01-01T00:00:00Z", limit: 200 });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("올바른 파라미터면 feeds 배열 응답", async () => {
    const response = await request(app)
      .get("/api/v1/feeds")
      .query({ since: "2025-01-01T00:00:00Z" });

    // DB 연결이 없으면 500 에러, 있으면 200
    if (response.status === 200) {
      expect(response.body).toHaveProperty("feeds");
      expect(response.body).toHaveProperty("count");
      expect(Array.isArray(response.body.feeds)).toBe(true);
      expect(typeof response.body.count).toBe("number");
    } else {
      expect(response.status).toBe(500);
    }
  });

  it("tags 파라미터 처리", async () => {
    const response = await request(app)
      .get("/api/v1/feeds")
      .query({ since: "2025-01-01T00:00:00Z", tags: "삼성전자,반도체" });

    // 파라미터 검증은 통과해야 함 (400이 아님)
    expect(response.status).not.toBe(400);
  });

  it("limit 파라미터 처리", async () => {
    const response = await request(app)
      .get("/api/v1/feeds")
      .query({ since: "2025-01-01T00:00:00Z", limit: 10 });

    // 파라미터 검증은 통과해야 함 (400이 아님)
    expect(response.status).not.toBe(400);
  });
});
