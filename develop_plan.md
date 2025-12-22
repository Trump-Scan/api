# Trump-Scan API 서버 개발 계획

## 개요
- **위치**: `/Users/song/Trump-Scan/api/`
- **기술 스택**: Node.js 20+, TypeScript 5+, Express.js, Oracle DB, Redis, Winston
- **환경 변수**: dotenv (.env 파일)
- **테스트**: Jest (각 단계에 포함)

## API 엔드포인트
1. `GET /api/v1/feeds/check` - 새 피드 존재 여부 확인
2. `GET /api/v1/feeds` - 피드 목록 조회

---

## Step 1: 프로젝트 초기화 및 기본 Express 서버

**목표**: 기본 Express 서버 실행 + health check

### 추가할 파일
| 파일 | 설명 |
|------|------|
| `package.json` | express, typescript, jest, dotenv |
| `tsconfig.json` | TypeScript 설정 |
| `jest.config.js` | Jest 설정 |
| `.env.example` | 환경 변수 템플릿 |
| `.gitignore` | node_modules, dist, .env |
| `src/index.ts` | Express 앱 + health check |
| `tests/health.test.ts` | health check 테스트 |

### 테스트
```bash
npm run dev && curl http://localhost:3000/health
npm test
```

### 추가 안 함
- DB, Redis, 라우터 분리, 미들웨어

---

## Step 2: 라우터 분리 + 피드 체크 API (목 데이터)

**목표**: `/api/v1/feeds/check` 엔드포인트 (목 데이터)

### 추가할 파일
| 파일 | 설명 |
|------|------|
| `src/routes/feeds.ts` | 피드 라우트 |
| `src/controllers/feedController.ts` | checkNewFeeds 핸들러 |
| `tests/feedCheck.test.ts` | feeds/check API 테스트 |

### 수정할 파일
- `package.json`: joi 추가
- `src/index.ts`: 라우터 마운트

### 테스트
```bash
curl "http://localhost:3000/api/v1/feeds/check?since=2025-01-01T00:00:00Z"
```

### 추가 안 함
- DB, Service/Repository 레이어

---

## Step 3: 피드 목록 API (목 데이터)

**목표**: `/api/v1/feeds` 엔드포인트 (목 데이터)

### 추가할 파일
| 파일 | 설명 |
|------|------|
| `src/models/feed.ts` | Feed 인터페이스 |
| `tests/feedList.test.ts` | feeds API 테스트 |

### 수정할 파일
- `src/routes/feeds.ts`: getFeeds 라우트 추가
- `src/controllers/feedController.ts`: getFeeds 핸들러

### 추가 안 함
- DB, Service/Repository, 실제 필터링 로직

---

## Step 4: Oracle DB 연결 + Repository

**목표**: 실제 DB에서 피드 조회

### 추가할 파일
| 파일 | 설명 |
|------|------|
| `src/infrastructure/database.ts` | Oracle DB Pool |
| `src/repositories/feedRepository.ts` | 피드 조회 쿼리 |
| `src/services/feedService.ts` | 비즈니스 로직 |
| `tests/feedRepository.test.ts` | Repository 테스트 |

### 수정할 파일
- `package.json`: oracledb 추가
- `.env.example`: DB 설정 추가
- `src/controllers/feedController.ts`: Service 호출
- `src/index.ts`: DB 초기화

### 참조 파일
- `/Users/song/Trump-Scan/deduplication/sql/ddl.sql` - feed_items, feed_keywords 스키마

### 추가 안 함
- Redis, Winston 로깅

---

## Step 5: Winston 로거 + 에러 핸들링

**목표**: 구조화된 로깅, 전역 에러 처리

### 추가할 파일
| 파일 | 설명 |
|------|------|
| `src/utils/logger.ts` | Winston 로거 |
| `src/middlewares/errorHandler.ts` | 전역 에러 핸들러 |
| `src/types/errors.ts` | 커스텀 에러 클래스 |
| `tests/errorHandler.test.ts` | 에러 핸들링 테스트 |

### 수정할 파일
- `package.json`: winston 추가
- `src/index.ts`: 에러 핸들러 등록
- 기존 파일들: console.log → logger

### 추가 안 함
- Redis, Rate Limiting

---

## Step 6: Redis 캐싱

**목표**: 피드 목록 응답 캐싱 (100ms 이내)

### 추가할 파일
| 파일 | 설명 |
|------|------|
| `src/infrastructure/redis.ts` | Redis 클라이언트 |
| `src/cache/cacheManager.ts` | 캐시 조회/저장 |
| `tests/cacheManager.test.ts` | 캐시 테스트 |

### 수정할 파일
- `package.json`: ioredis 추가
- `.env.example`: Redis 설정 추가
- `src/services/feedService.ts`: 캐시 우선 조회
- `src/index.ts`: Redis 초기화

### 추가 안 함
- Rate Limiting, Redis Streams

---

## Step 7: Rate Limiting + 보안

**목표**: IP 기반 Rate Limiting, 보안 헤더

### 추가할 파일
| 파일 | 설명 |
|------|------|
| `src/middlewares/rateLimiter.ts` | Redis Rate Limiter |
| `tests/rateLimiter.test.ts` | Rate Limiter 테스트 |

### 수정할 파일
- `package.json`: helmet, cors, compression, express-rate-limit, rate-limit-redis
- `src/index.ts`: 보안 미들웨어 등록

### 추가 안 함
- Redis Streams 구독

---

## Step 8: Redis Streams 구독 + 캐시 무효화

**목표**: 새 피드 이벤트 수신 시 캐시 자동 무효화

### 추가할 파일
| 파일 | 설명 |
|------|------|
| `src/subscribers/feedSubscriber.ts` | Redis Streams Consumer |
| `tests/feedSubscriber.test.ts` | Subscriber 테스트 |

### 수정할 파일
- `.env.example`: Stream 설정 추가
- `src/cache/cacheManager.ts`: invalidateAllCaches 함수
- `src/index.ts`: Subscriber 시작

### 참조
- deduplication 레이어가 발행하는 메시지 형식 확인 필요

---

## 최종 폴더 구조

```
api/
├── src/
│   ├── routes/feeds.ts           # Step 2
│   ├── controllers/feedController.ts  # Step 2
│   ├── services/feedService.ts   # Step 4
│   ├── repositories/feedRepository.ts # Step 4
│   ├── infrastructure/
│   │   ├── database.ts           # Step 4
│   │   └── redis.ts              # Step 6
│   ├── middlewares/
│   │   ├── errorHandler.ts       # Step 5
│   │   └── rateLimiter.ts        # Step 7
│   ├── models/feed.ts            # Step 3
│   ├── cache/cacheManager.ts     # Step 6
│   ├── utils/logger.ts           # Step 5
│   ├── types/errors.ts           # Step 5
│   ├── subscribers/feedSubscriber.ts  # Step 8
│   └── index.ts                  # Step 1
├── tests/                        # 각 단계별 테스트
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
└── .gitignore
```

---

## 단계별 의존성

| Step | 추가 의존성 |
|------|------------|
| 1 | express, typescript, jest, ts-jest, dotenv, @types/* |
| 2 | joi |
| 3 | - |
| 4 | oracledb |
| 5 | winston |
| 6 | ioredis, @types/ioredis |
| 7 | helmet, cors, compression, express-rate-limit, rate-limit-redis |
| 8 | - |
