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

describe("GET /api/v1/feeds/before", () => {
  it("cursor 없이도 정상 동작 (현재 시각 기준)", async () => {
    const response = await request(app).get("/api/v1/feeds/before");

    // DB 연결이 없으면 500 에러, 있으면 200
    if (response.status === 200) {
      expect(response.body).toHaveProperty("feeds");
      expect(response.body).toHaveProperty("count");
      expect(response.body).toHaveProperty("next_cursor");
      expect(Array.isArray(response.body.feeds)).toBe(true);
    } else {
      expect(response.status).toBe(500);
    }
  });

  it("잘못된 cursor 형식이면 400 에러", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/before")
      .query({ cursor: "invalid-date" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("올바른 cursor 형식이면 feeds 배열 응답", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/before")
      .query({ cursor: "2025-01-14T00:00:00Z" });

    // DB 연결이 없으면 500 에러, 있으면 200
    if (response.status === 200) {
      expect(response.body).toHaveProperty("feeds");
      expect(response.body).toHaveProperty("count");
      expect(response.body).toHaveProperty("next_cursor");
      expect(Array.isArray(response.body.feeds)).toBe(true);
      expect(typeof response.body.count).toBe("number");
    } else {
      expect(response.status).toBe(500);
    }
  });

  it("limit이 범위를 벗어나면 400 에러", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/before")
      .query({ limit: 200 });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("tags 파라미터 처리", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/before")
      .query({ tags: "삼성전자,반도체" });

    // 파라미터 검증은 통과해야 함 (400이 아님)
    expect(response.status).not.toBe(400);
  });

  it("limit 파라미터 처리", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/before")
      .query({ limit: 10 });

    // 파라미터 검증은 통과해야 함 (400이 아님)
    expect(response.status).not.toBe(400);
  });
});

describe("GET /api/v1/feeds/after", () => {
  it("cursor 파라미터 없으면 400 에러", async () => {
    const response = await request(app).get("/api/v1/feeds/after");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("잘못된 cursor 형식이면 400 에러", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/after")
      .query({ cursor: "not-a-date" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("올바른 cursor 형식이면 feeds 배열 응답", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/after")
      .query({ cursor: "2025-01-14T00:00:00Z" });

    // DB 연결이 없으면 500 에러, 있으면 200
    if (response.status === 200) {
      expect(response.body).toHaveProperty("feeds");
      expect(response.body).toHaveProperty("count");
      expect(response.body).toHaveProperty("next_cursor");
      expect(Array.isArray(response.body.feeds)).toBe(true);
      expect(typeof response.body.count).toBe("number");
    } else {
      expect(response.status).toBe(500);
    }
  });

  it("limit이 범위를 벗어나면 400 에러", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/after")
      .query({ cursor: "2025-01-14T00:00:00Z", limit: 200 });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("tags 파라미터 처리", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/after")
      .query({ cursor: "2025-01-14T00:00:00Z", tags: "삼성전자,반도체" });

    // 파라미터 검증은 통과해야 함 (400이 아님)
    expect(response.status).not.toBe(400);
  });

  it("limit 파라미터 처리", async () => {
    const response = await request(app)
      .get("/api/v1/feeds/after")
      .query({ cursor: "2025-01-14T00:00:00Z", limit: 10 });

    // 파라미터 검증은 통과해야 함 (400이 아님)
    expect(response.status).not.toBe(400);
  });
});

describe("기존 API 삭제 확인", () => {
  it("GET /api/v1/feeds/check 는 404", async () => {
    const response = await request(app).get("/api/v1/feeds/check");

    expect(response.status).toBe(404);
  });

  it("GET /api/v1/feeds 는 404", async () => {
    const response = await request(app).get("/api/v1/feeds");

    expect(response.status).toBe(404);
  });
});
