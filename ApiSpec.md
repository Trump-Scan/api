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

**참고**: 에러 응답 형식은 추후 정의 예정

---

## 2. API 상세

### 2.1 새 피드 존재 여부 확인

클라이언트가 폴링 방식으로 새 피드가 생성되었는지 확인하는 API입니다.

#### 엔드포인트
```
GET /api/v1/feeds/check
```

#### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| since | string | Y | 확인 기준 시각 (ISO 8601, timezone 포함) | `2025-11-25T10:30:00+09:00` |

#### 응답 본문

**Success (200)**
```json
{
  "has_new": true
}
```

**필드 설명**

| 필드 | 타입 | 설명 |
|------|------|------|
| has_new | boolean | since 이후 새 피드가 있으면 true, 없으면 false |

#### 요청/응답 예시

**요청**
```http
GET /api/v1/feeds/check?since=2025-11-25T10:30:00%2B09:00 HTTP/1.1
Host: api.example.com
```

**응답 (새 피드 있음)**
```json
{
  "has_new": true
}
```

**응답 (새 피드 없음)**
```json
{
  "has_new": false
}
```

---

### 2.2 피드 목록 조회

특정 시점 이후의 피드 목록을 조회합니다.

#### 엔드포인트
```
GET /api/v1/feeds
```

#### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| since | string | Y | 조회 시작 시각 (ISO 8601, timezone 포함) | `2025-11-25T10:00:00+09:00` |
| tags | string | N | 필터링할 키워드 태그 (쉼표로 구분) | `삼성전자,SK하이닉스` |
| limit | integer | N | 조회할 피드 개수 (기본값: 20, 최대: 100) | `50` |

**키워드 태그 예시**
- `삼성전자`, `SK하이닉스` - 기업명
- `반도체`, `자동차`, `철강` - 산업 분야
- `관세`, `무역` - 정책 키워드

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
      "published_at": "2025-11-25T08:30:00Z",
      "created_at": "2025-11-25T08:31:00Z"
    }
  ],
  "count": 1
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

#### 요청/응답 예시

**요청 1: 기본 조회**
```http
GET /api/v1/feeds?since=2025-11-25T10:00:00%2B09:00 HTTP/1.1
Host: api.example.com
```

**응답 1**
```json
{
  "feeds": [
    {
      "id": 1024,
      "summary": "트럼프는 중국산 제품에 대한 관세 인상을 시사했다.",
      "tags": ["삼성전자", "SK하이닉스", "반도체"],
      "channel": "truth_social",
      "link": "https://truthsocial.com/@realDonaldTrump/posts/12345",
      "published_at": "2025-11-25T08:30:00Z",
      "created_at": "2025-11-25T08:31:00Z"
    },
    {
      "id": 1025,
      "summary": "백악관은 새로운 에너지 정책을 발표했다.",
      "tags": ["에너지", "정책"],
      "channel": "whitehouse",
      "link": "https://www.whitehouse.gov/briefings/12345",
      "published_at": "2025-11-25T09:00:00Z",
      "created_at": "2025-11-25T09:01:00Z"
    }
  ],
  "count": 2
}
```

**요청 2: 태그 필터링**
```http
GET /api/v1/feeds?since=2025-11-25T10:00:00%2B09:00&tags=%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90 HTTP/1.1
Host: api.example.com
```

**응답 2**
```json
{
  "feeds": [
    {
      "id": 1024,
      "summary": "트럼프는 중국산 제품에 대한 관세 인상을 시사했다.",
      "tags": ["삼성전자", "SK하이닉스", "반도체"],
      "channel": "truth_social",
      "link": "https://truthsocial.com/@realDonaldTrump/posts/12345",
      "published_at": "2025-11-25T08:30:00Z",
      "created_at": "2025-11-25T08:31:00Z"
    }
  ],
  "count": 1
}
```

**요청 3: 데이터 없음**
```http
GET /api/v1/feeds?since=2025-11-26T00:00:00%2B09:00 HTTP/1.1
Host: api.example.com
```

**응답 3**
```json
{
  "feeds": [],
  "count": 0
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

### Timestamp 형식

모든 시각은 ISO 8601 형식을 사용합니다.

**요청 파라미터 (timezone 포함)**
```
2025-11-25T10:30:00+09:00  (한국 시간)
2025-11-25T01:30:00Z       (UTC)
2025-11-25T10:30:00+00:00  (UTC, 명시적 표기)
```

**응답 (UTC)**
```
2025-11-25T08:31:00Z
```