# API 명세서

## 1. 기본 정보

### Base URL
```
추후 결정됨
```

### 인증
인증 없음

### Content-Type
- 응답: `application/json; charset=utf-8`

### HTTP 상태 코드
- `200`: 정상 응답
- `400`: 잘못된 요청 (파라미터 오류)
- `500`: 서버 내부 오류

---

## 2. API 상세

### 2.1 이전 피드 조회 (Before)

cursor 기준으로 이전(더 오래된) 피드를 조회합니다. **최신순**으로 정렬됩니다.

**용도**: 피드 목록 스크롤 다운 (과거 피드 불러오기)

#### 엔드포인트
```
GET /api/v1/feeds/before
```

#### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|:----:|------|------|
| cursor | string | N | 조회 기준 시각 (ISO 8601, timezone 포함). 없으면 현재 시각 기준 | `2025-01-14T10:30:00+09:00` |
| tags | string | N | 필터링할 키워드 태그 (쉼표로 구분) | `삼성전자,SK하이닉스` |
| limit | integer | N | 조회할 피드 개수 (기본값: 20, 최대: 100) | `50` |

#### 응답 본문

**Success (200)**
```json
{
  "feeds": [
    {
      "id": 1024,
      "summary": "트럼프는 중국산 제품에 대한 관세 인상을 시사했다. 시장은 부정적으로 반응했다.",
      "tags": ["삼성전자", "SK하이닉스", "반도체"],
      "channel": "truth_social",
      "link": "https://truthsocial.com/@realDonaldTrump/posts/12345",
      "published_at": "2025-01-14T08:30:00Z",
      "created_at": "2025-01-14T08:31:00Z"
    }
  ],
  "count": 1,
  "next_cursor": "2025-01-14T08:31:00Z"
}
```

**필드 설명**

| 필드 | 타입 | 설명 |
|------|------|------|
| feeds | array | 피드 객체 배열 |
| feeds[].id | integer | 피드 고유 ID |
| feeds[].summary | string | 한국어 요약 (사용자용) |
| feeds[].tags | array | 키워드 태그 배열 |
| feeds[].channel | string | 수집 채널 (`truth_social`, `news` 등) |
| feeds[].link | string | 원본 링크 URL |
| feeds[].published_at | string | 원본 발행 시간 (ISO 8601, UTC) |
| feeds[].created_at | string | 피드 생성 시간 (ISO 8601, UTC) |
| count | integer | 반환된 피드 개수 |
| next_cursor | string \| null | 다음 페이지 조회용 cursor. 더 이상 피드 없으면 `null` |

#### 요청/응답 예시

**요청 1: 기본 조회 (최신 피드부터)**
```http
GET /api/v1/feeds/before HTTP/1.1
Host: api.example.com
```

**응답 1**
```json
{
  "feeds": [
    {
      "id": 1025,
      "summary": "백악관은 새로운 에너지 정책을 발표했다.",
      "tags": ["에너지", "정책"],
      "channel": "whitehouse",
      "link": "https://www.whitehouse.gov/briefings/12345",
      "published_at": "2025-01-14T09:00:00Z",
      "created_at": "2025-01-14T09:01:00Z"
    },
    {
      "id": 1024,
      "summary": "트럼프는 중국산 제품에 대한 관세 인상을 시사했다.",
      "tags": ["삼성전자", "SK하이닉스", "반도체"],
      "channel": "truth_social",
      "link": "https://truthsocial.com/@realDonaldTrump/posts/12345",
      "published_at": "2025-01-14T08:30:00Z",
      "created_at": "2025-01-14T08:31:00Z"
    }
  ],
  "count": 2,
  "next_cursor": "2025-01-14T08:31:00Z"
}
```

**요청 2: 다음 페이지 조회 (cursor 사용)**
```http
GET /api/v1/feeds/before?cursor=2025-01-14T08:31:00Z HTTP/1.1
Host: api.example.com
```

**요청 3: 태그 필터링**
```http
GET /api/v1/feeds/before?tags=%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90 HTTP/1.1
Host: api.example.com
```

**응답 (데이터 없음)**
```json
{
  "feeds": [],
  "count": 0,
  "next_cursor": null
}
```

---

### 2.2 이후 피드 조회 (After)

cursor 기준으로 이후(더 최근) 피드를 조회합니다. **오래된순**으로 정렬됩니다.

**용도**: 새 피드 폴링 (최신 피드 불러오기)

#### 엔드포인트
```
GET /api/v1/feeds/after
```

#### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|:----:|------|------|
| cursor | string | **Y** | 조회 기준 시각 (ISO 8601, timezone 포함) | `2025-01-14T10:30:00+09:00` |
| tags | string | N | 필터링할 키워드 태그 (쉼표로 구분) | `삼성전자,SK하이닉스` |
| limit | integer | N | 조회할 피드 개수 (기본값: 20, 최대: 100) | `50` |

#### 응답 본문

**Success (200)**
```json
{
  "feeds": [
    {
      "id": 1026,
      "summary": "트럼프는 자동차 산업에 대한 새로운 정책을 발표했다.",
      "tags": ["자동차", "현대차"],
      "channel": "truth_social",
      "link": "https://truthsocial.com/@realDonaldTrump/posts/12346",
      "published_at": "2025-01-14T10:35:00Z",
      "created_at": "2025-01-14T10:36:00Z"
    }
  ],
  "count": 1,
  "next_cursor": "2025-01-14T10:36:00Z"
}
```

**필드 설명**

| 필드 | 타입 | 설명 |
|------|------|------|
| feeds | array | 피드 객체 배열 |
| feeds[].id | integer | 피드 고유 ID |
| feeds[].summary | string | 한국어 요약 (사용자용) |
| feeds[].tags | array | 키워드 태그 배열 |
| feeds[].channel | string | 수집 채널 (`truth_social`, `news` 등) |
| feeds[].link | string | 원본 링크 URL |
| feeds[].published_at | string | 원본 발행 시간 (ISO 8601, UTC) |
| feeds[].created_at | string | 피드 생성 시간 (ISO 8601, UTC) |
| count | integer | 반환된 피드 개수 |
| next_cursor | string | 다음 폴링용 cursor. 피드 없으면 입력된 cursor 반환 |

#### 요청/응답 예시

**요청: 새 피드 폴링**
```http
GET /api/v1/feeds/after?cursor=2025-01-14T10:30:00%2B09:00 HTTP/1.1
Host: api.example.com
```

**응답 (새 피드 있음)**
```json
{
  "feeds": [
    {
      "id": 1026,
      "summary": "트럼프는 자동차 산업에 대한 새로운 정책을 발표했다.",
      "tags": ["자동차", "현대차"],
      "channel": "truth_social",
      "link": "https://truthsocial.com/@realDonaldTrump/posts/12346",
      "published_at": "2025-01-14T10:35:00Z",
      "created_at": "2025-01-14T10:36:00Z"
    },
    {
      "id": 1027,
      "summary": "미국 상무부는 반도체 수출 규제를 강화한다고 발표했다.",
      "tags": ["반도체", "삼성전자"],
      "channel": "news",
      "link": "https://news.example.com/article/12347",
      "published_at": "2025-01-14T10:40:00Z",
      "created_at": "2025-01-14T10:41:00Z"
    }
  ],
  "count": 2,
  "next_cursor": "2025-01-14T10:41:00Z"
}
```

**응답 (새 피드 없음)**
```json
{
  "feeds": [],
  "count": 0,
  "next_cursor": "2025-01-14T10:30:00+09:00"
}
```

---

## 3. 데이터 모델

### Feed 객체

피드 항목을 나타내는 객체입니다.

```typescript
interface Feed {
  id: number;              // 피드 고유 ID
  summary: string;         // 한국어 요약 (3-5 문장)
  tags: string[];          // 키워드 태그 배열
  channel: string;         // 수집 채널
  link: string;            // 원본 링크
  published_at: string;    // 원본 발행 시간 (ISO 8601 UTC)
  created_at: string;      // 피드 생성 시간 (ISO 8601 UTC)
}
```

### FeedListResponse 객체

피드 목록 응답 객체입니다.

```typescript
interface FeedListResponse {
  feeds: Feed[];           // 피드 배열
  count: number;           // 반환된 피드 개수
  next_cursor: string | null;  // 다음 페이지/폴링용 cursor
}
```

### Timestamp 형식

모든 시각은 ISO 8601 형식을 사용합니다.

**요청 파라미터 (timezone 포함)**
```
2025-01-14T10:30:00+09:00  (한국 시간)
2025-01-14T01:30:00Z       (UTC)
2025-01-14T10:30:00+00:00  (UTC, 명시적 표기)
```

**응답 (UTC)**
```
2025-01-14T08:31:00Z
```

---

## 4. 에러 응답

### 400 Bad Request

요청 파라미터가 올바르지 않은 경우:

```json
{
  "error": "cursor must be a valid ISO 8601 date"
}
```

```json
{
  "error": "cursor is required"
}
```

### 500 Internal Server Error

서버 내부 오류:

```json
{
  "error": "Internal server error"
}
```

---

## 5. 클라이언트 사용 가이드

### 초기 로딩 (최신 피드)

```javascript
// cursor 없이 호출하면 현재 시각 기준 최신 피드 반환
const response = await fetch('/api/v1/feeds/before');
const { feeds, next_cursor } = await response.json();
```

### 무한 스크롤 (과거 피드 로딩)

```javascript
// 이전 응답의 next_cursor를 사용하여 다음 페이지 조회
const response = await fetch(`/api/v1/feeds/before?cursor=${next_cursor}`);
const { feeds, next_cursor: newCursor } = await response.json();

// next_cursor가 null이면 더 이상 피드 없음
if (newCursor === null) {
  console.log('모든 피드를 로드했습니다.');
}
```

### 새 피드 폴링

```javascript
// 마지막으로 받은 피드의 created_at을 cursor로 사용
let lastCursor = '2025-01-14T10:00:00Z';

setInterval(async () => {
  const response = await fetch(`/api/v1/feeds/after?cursor=${lastCursor}`);
  const { feeds, next_cursor } = await response.json();

  if (feeds.length > 0) {
    // 새 피드가 있으면 UI 업데이트
    displayNewFeeds(feeds);
    lastCursor = next_cursor;
  }
}, 30000); // 30초마다 폴링
```
