# API 레이어 (API Layer)

트럼프 스캔 서비스의 API 레이어입니다. 피드 데이터를 클라이언트에게 REST API로 제공합니다.

---

## 📋 프로젝트 개요

### 목적
피드 생성 레이어에서 저장한 피드 데이터를 클라이언트(웹, 모바일)에게 REST API로 제공합니다.

### 핵심 책임
- 피드 목록 조회 (필터링, 페이지네이션)
- 새 피드 존재 여부 확인 (폴링용)
- 피드 생성 이벤트 수신 및 캐시 관리

### 처리 흐름

```
[trump-scan:feed-generation:new-feed] (Consumer Group: api-notifiers)
  ↓
MessageSubscriber
  └─ CacheManager.invalidate()         ← 캐시 무효화

[HTTP Request]
  ↓
Express Server
  ├─ GET /api/v1/feeds/check           ← 새 피드 확인
  ├─ GET /api/v1/feeds                 ← 피드 목록 조회
  └─ CacheManager                      ← 캐시 조회/저장
```

---

## 🏗️ 패키지 구조

```
api/
├── src/
│   ├── routes/
│   │   └── feeds.ts                # 피드 관련 라우트
│   │
│   ├── controllers/
│   │   └── feedController.ts       # 요청/응답 처리
│   │
│   ├── services/
│   │   └── feedService.ts          # 비즈니스 로직
│   │
│   ├── repositories/
│   │   └── feedRepository.ts       # DB 조회
│   │
│   ├── infrastructure/
│   │   ├── database.ts             # Oracle 연결 관리
│   │   └── redis.ts                # Redis 연결 관리
│   │
│   ├── middlewares/
│   │   ├── errorHandler.ts         # 에러 처리
│   │   └── rateLimiter.ts          # Rate Limiting
│   │
│   ├── models/
│   │   └── feed.ts                 # 피드 모델
│   │
│   ├── config/
│   │   ├── database.ts             # Oracle DB 설정 (gitignore)
│   │   ├── database.example.ts     # Oracle DB 설정 템플릿
│   │   ├── redis.ts                # Redis 설정 (gitignore)
│   │   └── redis.example.ts        # Redis 설정 템플릿
│   │
│   ├── utils/
│   │   └── logger.ts               # 로깅 설정
│   │
│   ├── messageSubscriber.ts        # 피드 생성 이벤트 수신
│   ├── cacheManager.ts             # 캐시 관리
│   ├── server.ts                   # Express 서버 설정
│   └── index.ts                    # 진입점
│
├── sql/
│   └── ddl.sql                     # 테이블 생성 SQL
│
├── tests/
│   └── ...
│
├── package.json
├── tsconfig.json
└── README.md
```

### 주요 컴포넌트 설명

#### Router → Controller → Service → Repository

- **`routes/feeds.ts`**: 라우트 정의
  - `GET /api/v1/feeds/check`: 새 피드 존재 여부
  - `GET /api/v1/feeds`: 피드 목록 조회
- **`controllers/feedController.ts`**: 요청/응답 처리
- **`services/feedService.ts`**: 비즈니스 로직
- **`repositories/feedRepository.ts`**: DB 조회

#### 캐시 관리

- **`messageSubscriber.ts`**: 피드 생성 이벤트 수신
  - 스트림: `trump-scan:feed-generation:new-feed`
  - Consumer Group: `api-notifiers`
  - 이벤트 수신 시 캐시 무효화 트리거
- **`cacheManager.ts`**: Redis 캐시 관리
  - 응답 캐싱 (TTL 5분)
  - 캐시 무효화

#### 인프라

- **`infrastructure/database.ts`**: Oracle 연결 관리
- **`infrastructure/redis.ts`**: Redis 연결 관리

---

## 🛠️ 기술 스택

### 언어 및 런타임
- **Node.js 20+**
- **TypeScript 5+**

### 핵심 라이브러리

| 라이브러리 | 용도 | 버전 |
|-----------|------|------|
| **express** | HTTP 서버 | ^4.18 |
| **ioredis** | Redis 클라이언트 | ^5.0 |
| **oracledb** | Oracle DB 연결 | ^6.0 |
| **winston** | 로깅 | ^3.0 |
| **joi** | 입력 검증 | ^17.0 |
| **helmet** | 보안 헤더 | ^7.0 |
| **cors** | CORS 처리 | ^2.8 |
| **compression** | 응답 압축 | ^1.7 |
| **express-rate-limit** | Rate Limiting | ^7.0 |

### 인프라 의존성

| 서비스 | 용도 |
|--------|------|
| **Redis** | Message Queue (Streams) + 캐시 |
| **Oracle DB** | 피드 데이터 조회 |

---

## 📊 API 명세

- `GET /api/v1/feeds/check` - 새 피드 존재 여부 확인
- `GET /api/v1/feeds` - 피드 목록 조회

상세 명세는 [ApiSpec.md](/ApiSpec.md) 참조

---

## ⚙️ 설정

### 설정 파일 생성

```bash
# 템플릿 복사
cp src/config/database.example.ts src/config/database.ts
cp src/config/redis.example.ts src/config/redis.ts

# 실제 값으로 수정
```

### .gitignore

```
# 설정 파일 (민감 정보)
src/config/database.ts
src/config/redis.ts
```

### database.ts

```typescript
export const DB_CONFIG = {
  user: "your_username",
  password: "your_password",
  dsn: "your_dsn",
  walletLocation: "/path/to/wallet",
  walletPassword: "your_wallet_password",
};
```

### redis.ts

```typescript
export const REDIS_CONFIG = {
  host: "localhost",
  port: 6379,
  db: 0,
};

// 스트림 설정
export const STREAMS = {
  NEW_FEED: "trump-scan:feed-generation:new-feed",
};

export const CONSUMER_GROUPS = {
  API_NOTIFIERS: "api-notifiers",
};
```

---

## 🚀 실행

### 개발 환경

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (hot reload)
npm run dev
```

### 프로덕션

```bash
# 빌드
npm run build

# 실행
npm start
```

### API 호출 예시

#### Health Check

```bash
curl http://localhost:3000/health
```

응답:
```json
{"status":"ok","db":"connected","redis":"connected"}
```

#### 새 피드 존재 여부 확인

```bash
curl "http://localhost:3000/api/v1/feeds/check?since=2025-01-01T00:00:00Z"
```

응답:
```json
{"has_new":true}
```

#### 피드 목록 조회 (기본)

```bash
curl "http://localhost:3000/api/v1/feeds?since=2025-01-01T00:00:00Z"
```

응답:
```json
{"feeds":[...],"count":5}
```

#### 피드 목록 조회 (태그 필터링)

```bash
curl "http://localhost:3000/api/v1/feeds?since=2025-01-01T00:00:00Z&tags=삼성전자,반도체"
```

응답:
```json
{"feeds":[...],"count":2}
```

#### 피드 목록 조회 (개수 제한)

```bash
curl "http://localhost:3000/api/v1/feeds?since=2025-01-01T00:00:00Z&limit=10"
```

응답:
```json
{"feeds":[...],"count":10}
```

---

## 🧪 테스트

### 테스트 실행

```bash
npm test
```

### 테스트 구조

```
tests/
├── api/
│   └── feeds.test.ts       # API 엔드포인트 테스트
└── services/
    └── feedService.test.ts # 서비스 레이어 테스트
```

### 테스트 케이스

| 분류 | 테스트 내용 |
|------|-------------|
| **Health Check** | 헬스체크 응답 형식 검증 |
| **GET /api/v1/feeds/check** | since 파라미터 필수 검증, 날짜 형식 검증, 응답 형식 |
| **GET /api/v1/feeds** | since 필수, 날짜 형식, limit 범위, tags 처리 |
| **FeedService** | ISO 8601 파싱, 에러 처리, limit 범위 검증 |