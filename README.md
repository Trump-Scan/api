# API 레이어 (API Layer)

트럼프 스캔 서비스의 API 레이어입니다. 피드 데이터를 클라이언트에게 REST API로 제공합니다.

---

## 📋 프로젝트 개요

### 목적
피드 생성 레이어에서 저장한 피드 데이터를 클라이언트(웹, 모바일)에게 REST API로 제공합니다.

### 핵심 책임
- 이전 피드 조회 (cursor 기반 페이지네이션, 태그 필터링)
- 이후 피드 조회 (새 피드 폴링용)
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
  ├─ GET /api/v1/feeds/before          ← 이전 피드 조회 (최신순)
  ├─ GET /api/v1/feeds/after           ← 이후 피드 조회 (오래된순)
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
│   │   └── env.ts                  # 환경 변수 (Zod 검증)
│   │
│   ├── utils/
│   │   └── logger.ts               # 로깅 설정
│   │
│   ├── messageSubscriber.ts        # 피드 생성 이벤트 수신
│   ├── cacheManager.ts             # 캐시 관리
│   ├── server.ts                   # Express 서버 설정
│   └── index.ts                    # 진입점
│
├── tests/
│   └── ...
│
├── Dockerfile                      # Docker 이미지 빌드
├── docker-compose.yml              # Docker Compose 설정
├── jest.config.js                  # Jest 테스트 설정
├── ApiSpec.md                      # API 상세 명세
├── package.json
├── tsconfig.json
├── .dockerignore
├── .env                            # 환경 변수 (gitignore)
└── README.md
```

### 주요 컴포넌트 설명

#### Router → Controller → Service → Repository

- **`routes/feeds.ts`**: 라우트 정의
  - `GET /api/v1/feeds/before`: 이전 피드 조회 (최신순)
  - `GET /api/v1/feeds/after`: 이후 피드 조회 (오래된순)
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

- `GET /api/v1/feeds/before` - 이전 피드 조회 (최신순, cursor 기준 과거 피드)
- `GET /api/v1/feeds/after` - 이후 피드 조회 (오래된순, cursor 기준 새 피드)

상세 명세는 [ApiSpec.md](./ApiSpec.md) 참조

---

## ⚙️ 환경 설정

Node.js 20+ `--env-file` 플래그와 Zod를 사용한 환경 변수 관리

### Quick Start

```bash
# 1. 템플릿 복사
cp .env.example .env

# 2. 실제 값 입력
vim .env

# 3. 애플리케이션 실행
npm run dev
```

### 설정 파일 구조

| 파일 | 용도 | Git |
|------|------|:---:|
| `.env.example` | 모든 변수가 문서화된 템플릿 | O |
| `.env` | 실제 설정 (민감 정보) | X |
| `src/config/env.ts` | Zod 스키마 및 검증 로직 | O |

### 환경 변수

#### Application 설정

| 변수 | 타입 | 필수 | 기본값 | 설명 |
|------|------|:----:|--------|------|
| `PORT` | number | | `3000` | 서버 포트 |
| `LOG_LEVEL` | enum | | `info` | 로그 레벨 (debug, info, warn, error) |
| `CORS_ORIGIN` | string | | `*` | CORS 허용 도메인 |

#### Oracle Database (Required)

| 변수 | 타입 | 필수 | 기본값 | 설명 |
|------|------|:----:|--------|------|
| `DB_USERNAME` | string | O | - | Oracle DB 사용자명 |
| `DB_PASSWORD` | string | O | - | Oracle DB 비밀번호 |
| `DB_DSN` | string | O | - | Oracle 연결 문자열 |
| `DB_WALLET_LOCATION` | string | | `/opt/oracle/wallet` | Wallet 디렉토리 경로 |
| `DB_WALLET_PASSWORD` | string | O | - | Wallet 비밀번호 |

#### Redis 설정

| 변수 | 타입 | 필수 | 기본값 | 설명 |
|------|------|:----:|--------|------|
| `REDIS_HOST` | string | | `localhost` | Redis 호스트 |
| `REDIS_PORT` | number | | `6379` | Redis 포트 |
| `REDIS_DB` | number | | `0` | Redis 데이터베이스 (0-15) |
| `REDIS_PASSWORD` | string | | `""` | Redis 비밀번호 |

#### Redis Streams

| 변수 | 타입 | 필수 | 기본값 | 설명 |
|------|------|:----:|--------|------|
| `REDIS_INPUT_STREAM` | string | | `trump-scan:feed-generation:new-feed` | 입력 스트림 |
| `REDIS_CONSUMER_GROUP` | string | | `api-notifiers` | Consumer Group |
| `REDIS_CONSUMER_NAME` | string | | `api-worker-1` | Consumer 이름 |
| `REDIS_BLOCK_TIMEOUT` | number | | `5000` | 블록 타임아웃 (ms) |

### 환경 변수 검증

애플리케이션 시작 시 Zod로 환경 변수를 검증합니다. 검증 실패 시 상세한 에러 메시지 출력:

```
========================================
Environment Configuration Error
========================================
The following environment variables are invalid:

  - DB_USERNAME: DB_USERNAME is required
  - DB_PASSWORD: DB_PASSWORD is required

Please check your .env file or environment settings.
See .env.example for required variables.
========================================
```

### 코드에서 사용

```typescript
// 권장: env.ts에서 직접 import
import { env, DB_CONFIG, REDIS_CONFIG } from './config/env';

// 개별 값 접근 (타입 안전)
console.log(env.PORT);           // number
console.log(env.DB_USERNAME);    // string

// 그룹화된 설정 사용
console.log(DB_CONFIG.dsn);      // string
console.log(REDIS_CONFIG.host);  // string
```

### Docker / Cloud 배포

Docker 또는 Cloud 환경에서는 환경 변수가 런타임에 주입됩니다. `.env` 파일 불필요:

```bash
# Docker run
docker run -e DB_USERNAME=user -e DB_PASSWORD=pass ... trump-scan-api

# Docker Compose - environment 섹션 사용
docker-compose up

# Cloud (Kubernetes 등)
# ConfigMaps/Secrets로 환경 변수 설정
```

`npm start` 명령은 `--env-file`을 사용하지 않아 프로덕션 환경에 적합:

```bash
npm start  # process.env 직접 사용 (.env 파일 불필요)
```

---

## 🚀 실행

### 개발 환경

```bash
# 의존성 설치
npm install

# 환경 설정
cp .env.example .env
# .env 파일 편집하여 실제 값 입력

# 개발 서버 실행 (hot reload)
npm run dev

# 레거시 방식 (ts-node-dev)
npm run dev:legacy
```

### 프로덕션

```bash
# 빌드
npm run build

# 실행 (.env 파일 사용)
npm run start:env

# 실행 (환경 변수 주입 - Docker/Cloud)
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

#### 이전 피드 조회 (기본 - 최신 피드부터)

```bash
curl "http://localhost:3000/api/v1/feeds/before"
```

응답:
```json
{"feeds":[...],"count":20,"next_cursor":"2025-01-14T08:31:00Z"}
```

#### 이전 피드 조회 (다음 페이지 - cursor 사용)

```bash
curl "http://localhost:3000/api/v1/feeds/before?cursor=2025-01-14T08:31:00Z"
```

응답:
```json
{"feeds":[...],"count":20,"next_cursor":"2025-01-14T07:00:00Z"}
```

#### 이전 피드 조회 (태그 필터링)

```bash
curl "http://localhost:3000/api/v1/feeds/before?tags=삼성전자,반도체"
```

응답:
```json
{"feeds":[...],"count":5,"next_cursor":"2025-01-14T06:00:00Z"}
```

#### 이후 피드 조회 (새 피드 폴링)

```bash
curl "http://localhost:3000/api/v1/feeds/after?cursor=2025-01-14T10:00:00Z"
```

응답:
```json
{"feeds":[...],"count":3,"next_cursor":"2025-01-14T10:30:00Z"}
```

#### 이후 피드 조회 (새 피드 없음)

```bash
curl "http://localhost:3000/api/v1/feeds/after?cursor=2025-01-14T12:00:00Z"
```

응답:
```json
{"feeds":[],"count":0,"next_cursor":"2025-01-14T12:00:00Z"}
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

---

## 🐳 Docker

### 이미지 빌드

```bash
# 로컬 빌드 (프로덕션용 - linux/amd64)
docker build --platform linux/amd64 -t songhae/trump-scan-api:latest .

# 특정 버전 태그로 빌드
docker build --platform linux/amd64 \
  -t songhae/trump-scan-api:1.0.0 \
  -t songhae/trump-scan-api:latest .
```

> **Note**: Oracle Instant Client가 x64 전용이므로 Apple Silicon (M1/M2/M3) Mac에서도 `--platform linux/amd64`를 명시해야 합니다.

### Docker Hub 푸시

```bash
# Docker Hub 로그인
docker login

# 이미지 푸시
docker push songhae/trump-scan-api:latest
docker push songhae/trump-scan-api:1.0.0
```

### 환경 변수

| 변수명 | 설명 | 필수 | 기본값 |
|--------|------|:----:|--------|
| **애플리케이션** |
| `PORT` | 서버 포트 | | `3000` |
| `LOG_LEVEL` | 로그 레벨 (debug, info, warn, error) | | `debug` |
| `CORS_ORIGIN` | CORS 허용 도메인 | | `*` |
| **Oracle Database** |
| `DB_USERNAME` | Oracle DB 사용자명 | ✓ | - |
| `DB_PASSWORD` | Oracle DB 비밀번호 | ✓ | - |
| `DB_DSN` | Oracle DB 연결 문자열 | ✓ | - |
| `DB_WALLET_LOCATION` | Wallet 디렉토리 경로 (컨테이너 내부) | | `/opt/oracle/wallet` |
| `DB_WALLET_PASSWORD` | Wallet 비밀번호 | ✓ | - |
| **Redis** |
| `REDIS_HOST` | Redis 호스트 | | `localhost` |
| `REDIS_PORT` | Redis 포트 | | `6379` |
| `REDIS_DB` | Redis DB 번호 | | `0` |
| `REDIS_PASSWORD` | Redis 비밀번호 | | (없음) |

### 실행 (Docker Compose)

#### 1. 환경 변수 파일 생성

```bash
cat > .env << 'EOF'
# Oracle Database
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DSN=your_dsn
DB_WALLET_PASSWORD=your_wallet_password
DB_WALLET_PATH=/path/to/your/wallet

# Redis (외부 서비스)
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
REDIS_DB=0


# 선택사항
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=*
EOF
```

#### 2. 실행

```bash
docker-compose up -d
```

#### 3. 로그 확인

```bash
docker logs -f trump-scan-api
```

### 실행 (docker run)

```bash
docker run -d \
  --name trump-scan-api \
  -p 3000:3000 \
  -e DB_USERNAME=your_username \
  -e DB_PASSWORD=your_password \
  -e DB_DSN=your_dsn \
  -e DB_WALLET_LOCATION=/opt/oracle/wallet \
  -e DB_WALLET_PASSWORD=your_wallet_password \
  -e REDIS_HOST=host.docker.internal \
  -e REDIS_PORT=6379 \
  -v /path/to/wallet:/opt/oracle/wallet:ro \
  songhae/trump-scan-api:latest
```

### Oracle Wallet 마운트

Oracle DB Wallet 인증을 사용하므로 호스트의 Wallet 디렉토리를 컨테이너에 마운트해야 합니다.

```
Wallet 디렉토리 구조:
/path/to/wallet/
├── cwallet.sso
├── ewallet.p12
├── tnsnames.ora
├── sqlnet.ora
└── ...
```

> ⚠️ Wallet은 읽기 전용(`:ro`)으로 마운트됩니다.

### 헬스 체크

```bash
# 컨테이너 상태 확인
docker ps

# 헬스체크 엔드포인트 호출
curl http://localhost:3000/health
```

응답:
```json
{"status":"ok","db":"connected","redis":"connected"}
```

### 중지 및 삭제

```bash
# Docker Compose
docker-compose down

# docker run으로 실행한 경우
docker stop trump-scan-api
docker rm trump-scan-api
```