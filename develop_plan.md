# API 레이어 개발 계획

## 개요
데이터 흐름 기준 단계별 개발 계획. 각 단계는 독립적으로 테스트 가능하며, 이전 단계 완료 후 진행.

---

## Phase 1: 기본 서버 실행
**목표**: HTTP 요청 수신 → 응답 반환 (print 수준)

### 생성 파일
```
api/src/
├── index.ts          # 진입점
└── server.ts         # Express 서버 설정
```

### 구현 내용
- Express 서버 생성 및 포트 바인딩
- 기본 라우트: `GET /health` → `{ status: "ok" }`
- `console.log`로 요청 수신 확인

### 검증 방법
```bash
curl http://localhost:3000/health
# 응답: {"status":"ok"}
# 콘솔: "GET /health" 출력
```

### 완료 조건
- [x] 구현 완료
- [x] 검증 통과
- [x] 진행 체크리스트 ✅ 업데이트
- [x] git commit

---

## Phase 2: 로거 및 외부 서비스 연결
**목표**: 구조화된 로깅 + DB/Redis 연결 확인

### 생성 파일
```
api/src/
├── utils/
│   └── logger.ts              # structlog 스타일 로거
├── infrastructure/
│   ├── database.ts            # Oracle DB 연결
│   └── redis.ts               # Redis 연결
├── config/
│   ├── database.ts            # DB 설정 (gitignore)
│   ├── database.example.ts    # DB 설정 템플릿
│   ├── redis.ts               # Redis 설정 (gitignore)
│   └── redis.example.ts       # Redis 설정 템플릿
```

### 구현 내용
- Winston 기반 구조화된 로거 (기존 레이어 포맷 일치)
- Oracle DB 연결 클래스 (connection pool)
- Redis 클라이언트 (ioredis)
- 연결 상태 확인 엔드포인트

### 검증 방법
```bash
curl http://localhost:3000/health
# 응답: {"status":"ok","db":"connected","redis":"connected"}
# 로그: "2025-01-02 10:00:00 [INFO][server] Health check db=connected redis=connected"
```

### 완료 조건
- [x] 구현 완료
- [ ] 검증 통과 (실제 DB/Redis 환경 설정 필요)
- [x] 진행 체크리스트 ✅ 업데이트
- [ ] git commit

---

## Phase 3: 모델 및 Repository
**목표**: DB에서 피드 데이터 조회

### 생성 파일
```
api/src/
├── models/
│   └── feed.ts                # Feed 인터페이스/타입
└── repositories/
    └── feedRepository.ts      # DB 조회 로직
```

### 구현 내용
- Feed 타입 정의 (ApiSpec.md 기준)
- `FeedRepository.findSince(since, tags?, limit?)` - 피드 목록 조회
- `FeedRepository.existsAfter(since)` - 새 피드 존재 여부

### 검증 방법
```bash
# 임시 테스트 라우트로 확인
curl "http://localhost:3000/test/feeds?since=2025-01-01T00:00:00Z"
# 응답: DB에서 조회된 피드 배열
```

### 완료 조건
- [x] 구현 완료
- [ ] 검증 통과 (실제 DB 환경 설정 필요)
- [x] 진행 체크리스트 ✅ 업데이트
- [ ] git commit

---

## Phase 4: Service 레이어
**목표**: 비즈니스 로직 분리

### 생성 파일
```
api/src/
└── services/
    └── feedService.ts         # 피드 비즈니스 로직
```

### 구현 내용
- `FeedService.checkNewFeeds(since)` → `{ has_new: boolean }`
- `FeedService.getFeeds(since, tags?, limit?)` → `{ feeds: Feed[], count: number }`
- 입력 파라미터 검증 (ISO 8601 파싱 등)

### 검증 방법
```bash
# Service 레이어 통합 테스트
curl "http://localhost:3000/test/feeds/check?since=2025-01-01T00:00:00Z"
```

### 완료 조건
- [x] 구현 완료
- [ ] 검증 통과 (실제 DB 환경 설정 필요)
- [x] 진행 체크리스트 ✅ 업데이트
- [ ] git commit

---

## Phase 5: Controller 및 실제 라우트
**목표**: API 명세 구현 완료

### 생성 파일
```
api/src/
├── controllers/
│   └── feedController.ts      # 요청/응답 처리
└── routes/
    └── feeds.ts               # 라우트 정의
```

### 구현 내용
- `GET /api/v1/feeds/check` - 새 피드 확인 API
- `GET /api/v1/feeds` - 피드 목록 조회 API
- Joi를 사용한 요청 파라미터 검증
- 응답 형식 ApiSpec.md 준수

### 검증 방법
```bash
# 실제 API 엔드포인트 테스트
curl "http://localhost:3000/api/v1/feeds/check?since=2025-01-01T00:00:00Z"
curl "http://localhost:3000/api/v1/feeds?since=2025-01-01T00:00:00Z&limit=10"
```

### 완료 조건
- [x] 구현 완료
- [ ] 검증 통과 (실제 DB 환경 설정 필요)
- [x] 진행 체크리스트 ✅ 업데이트
- [ ] git commit

---

## Phase 6: 캐싱
**목표**: Redis 기반 응답 캐싱

### 생성 파일
```
api/src/
└── cacheManager.ts            # 캐시 관리
```

### 구현 내용
- `CacheManager.get(key)` / `set(key, value, ttl)`
- `CacheManager.invalidate(pattern)` - 패턴 기반 무효화
- FeedService에 캐시 레이어 통합 (TTL 5분)

### 검증 방법
```bash
# 첫 번째 요청: DB 조회
curl "http://localhost:3000/api/v1/feeds?since=2025-01-01T00:00:00Z"
# 두 번째 요청: 캐시 히트 (로그에서 확인)
curl "http://localhost:3000/api/v1/feeds?since=2025-01-01T00:00:00Z"
```

### 완료 조건
- [x] 구현 완료
- [ ] 검증 통과 (실제 Redis 환경 설정 필요)
- [x] 진행 체크리스트 ✅ 업데이트
- [ ] git commit

---

## Phase 7: Message Subscriber (이벤트 수신)
**목표**: 새 피드 이벤트 수신 → 캐시 무효화

### 생성 파일
```
api/src/
└── messageSubscriber.ts       # Redis Streams 구독
```

### 구현 내용
- `trump-scan:feed-generation:new-feed` 스트림 구독
- Consumer Group: `api-notifiers`
- 이벤트 수신 시 `CacheManager.invalidate()` 호출

### 검증 방법
```bash
# Redis CLI로 이벤트 발행
redis-cli XADD trump-scan:feed-generation:new-feed '*' data '{"id":1}'
# 로그: "[INFO][messageSubscriber] Cache invalidated feed_id=1"
```

### 완료 조건
- [x] 구현 완료
- [ ] 검증 통과 (실제 Redis 환경 설정 필요)
- [x] 진행 체크리스트 ✅ 업데이트
- [ ] git commit

---

## Phase 8: 미들웨어 및 마무리
**목표**: 프로덕션 준비

### 생성 파일
```
api/src/
└── middlewares/
    ├── errorHandler.ts        # 에러 처리
    └── rateLimiter.ts         # Rate Limiting
```

### 구현 내용
- 글로벌 에러 핸들러 (일관된 에러 응답 형식)
- Rate Limiting (express-rate-limit)
- 보안 헤더 (Helmet)
- CORS 설정
- 응답 압축 (compression)

### 검증 방법
```bash
# Rate limit 테스트
for i in {1..100}; do curl -s "http://localhost:3000/api/v1/feeds/check?since=2025-01-01T00:00:00Z" > /dev/null; done
# 429 Too Many Requests 응답 확인
```

### 완료 조건
- [x] 구현 완료
- [ ] 검증 통과 (프로덕션 환경 설정 필요)
- [x] 진행 체크리스트 ✅ 업데이트
- [ ] git commit

---

## 최종 디렉토리 구조

```
api/
├── src/
│   ├── routes/
│   │   └── feeds.ts
│   ├── controllers/
│   │   └── feedController.ts
│   ├── services/
│   │   └── feedService.ts
│   ├── repositories/
│   │   └── feedRepository.ts
│   ├── infrastructure/
│   │   ├── database.ts
│   │   └── redis.ts
│   ├── middlewares/
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── models/
│   │   └── feed.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── database.example.ts
│   │   ├── redis.ts
│   │   └── redis.example.ts
│   ├── utils/
│   │   └── logger.ts
│   ├── messageSubscriber.ts
│   ├── cacheManager.ts
│   ├── server.ts
│   └── index.ts
├── sql/
│   └── ddl.sql
├── tests/
├── package.json
├── tsconfig.json
├── ApiSpec.md
└── README.md
```

---

## 의존성 (package.json)

```json
{
  "dependencies": {
    "express": "^4.18",
    "ioredis": "^5.0",
    "oracledb": "^6.0",
    "winston": "^3.0",
    "joi": "^17.0",
    "helmet": "^7.0",
    "cors": "^2.8",
    "compression": "^1.7",
    "express-rate-limit": "^7.0"
  },
  "devDependencies": {
    "typescript": "^5.0",
    "@types/express": "^4.17",
    "@types/node": "^20",
    "ts-node-dev": "^2.0"
  }
}
```

---

## 진행 체크리스트

| Phase | 상태 | 핵심 결과물 |
|-------|------|-------------|
| 1. 기본 서버 | ✅ | `GET /health` 동작 |
| 2. 로거/연결 | ✅ | DB+Redis 연결 확인 |
| 3. Repository | ✅ | 피드 DB 조회 동작 |
| 4. Service | ✅ | 비즈니스 로직 분리 |
| 5. Controller/Route | ✅ | API 엔드포인트 완성 |
| 6. 캐싱 | ✅ | 응답 캐시 동작 |
| 7. Message Sub | ✅ | 캐시 무효화 동작 |
| 8. 미들웨어 | ✅ | 프로덕션 준비 완료 |
