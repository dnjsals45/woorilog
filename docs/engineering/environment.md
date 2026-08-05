# Environment

이 문서는 로컬 개발과 로컬 홈 배포에서 필요한 환경 변수 기준을 정리합니다.
실제 키 목록은 `.env.example`과 `frontend/.env.example`을 기준으로 관리합니다.

## Principles

- 실제 secret, 개인 토큰, 운영 credential은 git에 커밋하지 않습니다.
- 환경 변수가 추가되거나 이름이 바뀌면 `.env.example`과 이 문서를 함께 갱신합니다.
- frontend에서 브라우저에 노출되는 값과 backend-only secret을 구분합니다.
- local/test-only developer login은 운영 배포에서 활성화하지 않습니다.

## Current Status

- Backend와 frontend baseline scaffold가 추가되었습니다.
- Docker Compose는 MySQL 8.x와 frontend/backend 개발 서버를 제공합니다.
- backend Docker 이미지에는 Native Tesseract 5와 고정된 `tessdata_best` 한국어/영어 모델이 포함됩니다.
- Kakao OAuth는 환경 변수가 설정되면 authorization code flow로 로그인합니다.
- developer login은 `local` profile에서만 기본 활성화되며, 다른 profile에서는 `DEV_LOGIN_ENABLED=true`을 명시하지 않는 한 비활성화됩니다.

## Example Files

- `.env.example`: backend, MySQL, Kakao OAuth, JWT, CORS, local/test developer login 예시
- `frontend/.env.example`: frontend runtime config 예시
- `.env.home.example`: 홈 배포 예시. 절차는 [`home-deployment.md`](./home-deployment.md)를 봅니다.

## Docker Development

처음 실행하거나 Dockerfile을 변경한 뒤에는 `docker compose up --build`로 MySQL, Spring Boot API, Vite 개발 서버를 함께 실행합니다.
그 외에는 `docker compose up`만 실행합니다.
backend 컨테이너는 MySQL service에 `mysql:3306`으로 연결하며, 브라우저에서 접근하는 frontend API URL은
계속 `http://localhost:8080`을 사용합니다. Docker 환경에서도 각 예시 파일의 공개 환경 변수 이름과 의미는 동일합니다.

frontend 소스 변경은 Vite HMR로 반영됩니다. backend 소스 변경은 Gradle의 연속 컴파일과 Spring Boot DevTools 재시작으로 반영됩니다.
이미지 재빌드는 Dockerfile 또는 기반 이미지가 바뀔 때만 필요합니다.

Docker 밖에서 `cd backend && ./gradlew bootRun`으로 이미지 OCR까지 확인하려면 `PATH`에서 `tesseract`를 실행할 수 있어야 하고, Tesseract data 경로에 `kor`, `eng` traineddata가 설치되어 있어야 합니다. OCR용 환경 변수나 외부 서비스 credential은 현재 필요하지 않습니다. 업로드 이미지와 전처리 결과는 임시 파일로만 사용하고 요청 종료 시 삭제합니다.

## Profiles

- `local`: Docker Compose와 로컬 개발용 profile입니다. developer login이 기본 활성화됩니다.
- 기본 profile 및 홈 배포: developer login은 기본 비활성화됩니다. Kakao login을 사용하려면 Kakao Developers에 redirect URI를 등록하고 관련 환경 변수를 설정합니다.
- frontend production build에서 developer login 버튼은 노출되지 않습니다. 로컬 Vite 개발 서버에서는 `VITE_DEV_LOGIN_ENABLED=false`로 숨길 수 있습니다.

## Root Keys

| Key | Required | Example | Description |
| --- | --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | local | `local` | 백엔드 실행 profile |
| `MYSQL_DATABASE` | local | `woorilog` | 로컬 MySQL database |
| `MYSQL_USER` | local | `woorilog` | 로컬 MySQL user |
| `MYSQL_PASSWORD` | local | `woorilog_local_password` | 로컬 MySQL password 예시값 |
| `MYSQL_ROOT_PASSWORD` | local | `woorilog_root_password` | 로컬 MySQL root password 예시값 |
| `MYSQL_HOST` | local | `localhost` | 백엔드에서 접근할 MySQL host |
| `MYSQL_PORT` | local | `3306` | MySQL port와 Docker Compose port mapping |
| `KAKAO_CLIENT_ID` | auth | empty | Kakao OAuth client id |
| `KAKAO_CLIENT_SECRET` | auth | empty | Kakao OAuth client secret |
| `KAKAO_REDIRECT_URI` | auth | `http://localhost:5173/auth/kakao/callback` | Kakao OAuth redirect URI |
| `JWT_SECRET` | auth | `woorilog-secret-key-for-development-should-be-long-enough-for-hmac-sha256` | local-only JWT signing secret example |
| `JWT_ACCESS_TOKEN_TTL_SECONDS` | auth | `1800` | access token lifetime |
| `JWT_REFRESH_TOKEN_TTL_SECONDS` | auth | `1209600` | refresh token lifetime |
| `REFRESH_COOKIE_SECURE` | auth | local `false`, production `true` | HTTPS에서만 refresh cookie를 전송할지 여부 |
| `DEV_LOGIN_ENABLED` | local/test | `true` | local/test-only developer login toggle |
| `CORS_ALLOWED_ORIGINS` | local | `http://localhost:5173` | backend CORS allowed origins. 쉼표로 여러 개를 적습니다 |

실제 백엔드를 상대로 하는 전 화면 자동 점검(`REAL_BACKEND=1 npx playwright test`)은 Playwright가
`127.0.0.1:5173`에서 서비스하기 때문에 기본값만으로는 CORS에 막힙니다. 그때만 이렇게 띄웁니다.

```bash
CORS_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173" docker compose up -d mysql backend
```

## Frontend Keys

| Key | Required | Example | Description |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | yes | `http://localhost:8080` | browser에서 호출할 backend API base URL |
| `VITE_KAKAO_REDIRECT_URI` | auth | `http://localhost:5173/auth/kakao/callback` | frontend OAuth callback URL |
| `VITE_DEV_LOGIN_ENABLED` | local/test | `true` | local/test-only developer login UI toggle |

## Home Deployment Keys

홈 배포는 `.env.home`(커밋하지 않음)를 씁니다. 절차는 [`home-deployment.md`](./home-deployment.md)를 봅니다.

개발용 `.env`와 이름이 겹치는 키는 의미가 같고, 아래는 홈 배포에만 있거나 값이 달라지는 키입니다.

| Key | Required | Example | Description |
| --- | --- | --- | --- |
| `PUBLIC_ORIGIN` | yes | `http://woorilog.local` | 브라우저가 실제로 여는 주소. Kakao redirect URI와 CORS가 여기서 파생됩니다. 프로토콜과 포트까지 정확히 맞춥니다 |
| `WEB_PORT` | yes | `80` | nginx를 내보낼 호스트 포트. 80이 아니면 `PUBLIC_ORIGIN`에도 포트를 적습니다 |
| `BACKUP_DIR` | yes | `./backups` | `scripts/backup-db.sh`가 MySQL 덤프를 떨어뜨릴 호스트 폴더 |
| `RETENTION_DAYS` | no | `14` | 덤프 보관 일수 |
| `SPRING_PROFILES_ACTIVE` | yes | (빈 값) | 기본 profile. `local`로 두면 개발자 로그인이 켜집니다 |
| `DEV_LOGIN_ENABLED` | yes | `false` | 홈 배포에서는 끕니다. 프로덕션 프론트 빌드에는 버튼 자체가 없습니다 |
| `REFRESH_COOKIE_SECURE` | yes | http `false`, https `true` | http에서 `true`면 브라우저가 refresh cookie를 버려 로그인 직후 로그아웃된 것처럼 보입니다 |

`KAKAO_REDIRECT_URI`와 `CORS_ALLOWED_ORIGINS`는 `.env.home`에 직접 적지 않습니다.
`docker-compose.home.yml`이 `PUBLIC_ORIGIN`에서 만들어 넘깁니다. 주소가 한 곳에만 있어야 어긋나지 않습니다.

`VITE_API_BASE_URL`은 홈 배포에서 **빈 값**으로 빌드합니다. 프론트와 API가 같은 nginx 뒤에 있어
`/api` 상대 경로로 부르면 되고, 그래야 CORS와 `SameSite=Lax` refresh cookie가 그대로 동작합니다.

`VITE_KAKAO_REDIRECT_URI`는 현재 프론트엔드 코드에서 **사용하지 않습니다**.
프론트는 `GET /api/auth/kakao/login-url`로 백엔드가 만든 주소를 받아 이동합니다.
redirect URI의 단일 원본은 백엔드의 `KAKAO_REDIRECT_URI`입니다.
