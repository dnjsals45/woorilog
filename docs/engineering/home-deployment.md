# 홈 배포

같은 와이파이 안에서 폰으로 쓰기 위한 배포입니다. 인터넷에 여는 배포가 아닙니다.
맥에서 Docker 로 세 컨테이너를 띄우고, nginx 하나만 밖으로 냅니다.

```text
iPhone ─ 같은 와이파이 ─→ http://woorilog.local
                              │
                         [ web · nginx :80 ]
                          ├── /       정적 파일 (Vite 빌드 결과)
                          └── /api/   → [ backend :8080 ] → [ mysql :3306 ]
                                          (둘 다 밖으로 열지 않음)
```

**프론트와 API 를 한 출처에 두는 것**이 이 구성의 핵심입니다.
같은 출처가 되면 CORS 설정이 필요 없어지고, 리프레시 쿠키(`SameSite=Lax`)가 별도 설정 없이 붙습니다.

## 개발용 구성과의 차이

| | `docker-compose.yml` (개발) | `docker-compose.home.yml` (홈) |
| --- | --- | --- |
| 프론트 | Vite dev server :5173 | nginx 가 정적 파일 서빙 |
| 백엔드 | `bootRun` + 소스 마운트 | `bootJar` 를 구운 이미지 |
| 여는 포트 | 5173 · 8080 · 3306 | 80 하나 |
| 개발자 로그인 | 켜짐 | **꺼짐** (프로덕션 빌드에는 버튼 자체가 없음) |
| 로그인 | 개발자 로그인 또는 카카오 | **카카오만** |

개발용 구성은 그대로 둡니다. 두 구성은 볼륨도 컨테이너 이름도 겹치지 않아 같이 있어도 됩니다.

## 준비 (한 번만)

### 1. 맥 호스트

- **로컬 호스트 이름**: 시스템 설정 → 일반 → 공유 → 로컬 호스트 이름을 `woorilog` 로.
  `woorilog.local` 이 이 맥을 가리키게 됩니다. 컨테이너가 mDNS 이름을 가질 수는 없어서 맥 자체 이름을 씁니다.
- **IP 고정**: 라우터에서 이 맥의 MAC 주소에 DHCP 예약을 겁니다.
  `.local` 이 주력이지만, 그걸 못 찾는 기기의 폴백으로 필요합니다.
- **잠자기 방지**: 시스템 설정 → 배터리(또는 에너지 절약) → 디스플레이가 꺼져도 잠자지 않도록.
  맥이 자면 서비스도 같이 내려갑니다.
- **Docker Desktop**: 설정에서 로그인 시 자동 시작을 켭니다.

### 2. 카카오 Developers

내 애플리케이션 → 카카오 로그인 → Redirect URI 에 아래를 등록합니다.

```text
http://woorilog.local/auth/kakao/callback
```

나중에 https 로 바꿀 계획이면 `https://woorilog.local/auth/kakao/callback` 도 **지금 같이 등록**해 둡니다.
카카오는 프로토콜이 다르면 다른 URI 로 봅니다. 미리 넣어두면 전환할 때 카카오는 안 건드려도 됩니다.

### 3. 환경 파일

```bash
cp .env.home.example .env.home
```

`.env.home` 는 커밋되지 않습니다. 아래 값을 직접 만들어 채웁니다.

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 24   # MYSQL_PASSWORD
openssl rand -base64 24   # MYSQL_ROOT_PASSWORD
```

`JWT_SECRET` 에 개발용 기본값을 그대로 쓰면 안 됩니다. 그 값을 아는 사람은 아무 사용자로도 토큰을 만들 수 있습니다.

`KAKAO_CLIENT_ID` 와 `KAKAO_CLIENT_SECRET` 은 카카오 Developers 에서 가져옵니다.
redirect URI 는 `PUBLIC_ORIGIN` 에서 파생되므로 따로 적지 않습니다.

## 실행

```bash
docker compose -f docker-compose.home.yml --env-file .env.home up -d --build
```

첫 실행은 백엔드 이미지 빌드(Gradle + Tesseract 모델 내려받기) 때문에 몇 분 걸립니다.
그 뒤로는 소스가 바뀐 부분만 다시 빌드합니다.

상태 확인:

```bash
docker compose -f docker-compose.home.yml --env-file .env.home ps
curl -sS http://woorilog.local/health
```

로그:

```bash
docker compose -f docker-compose.home.yml --env-file .env.home logs -f backend
```

내리기:

```bash
docker compose -f docker-compose.home.yml --env-file .env.home down
```

`down -v` 는 쓰지 마세요. **데이터 볼륨까지 지웁니다.**

## 배포 갱신

코드를 고친 뒤:

```bash
git pull
docker compose -f docker-compose.home.yml --env-file .env.home up -d --build
```

프론트는 `VITE_API_BASE_URL` 을 **빌드 시점에** 굽습니다. 주소(`PUBLIC_ORIGIN`)를 바꿨다면
`--build` 없이 올리면 예전 주소가 그대로 남습니다.

## 폰에서 열기

같은 와이파이에서 `http://woorilog.local` 로 접속합니다.

- **iPhone**: Bonjour 를 기본 지원해서 그대로 됩니다. Safari → 공유 → 홈 화면에 추가로
  주소창 없이 쓸 수 있습니다.
- **Android**: `.local` 이름 해석이 버전에 따라 됩니다/안 됩니다. 안 되면 `http://<맥 IP>` 로 접속합니다.

> 홈 화면에 추가는 http 에서도 동작합니다. 다만 서비스 워커(오프라인·푸시)는 https 가 필요하고,
> 지금은 `manifest.webmanifest` 와 앱 아이콘도 없습니다. PWA 로 만들려면 별도 작업이 필요합니다.

## 백업

MySQL 볼륨만 믿으면 안 됩니다. 실수로 `down -v` 한 번, 디스크 고장 한 번이면 끝입니다.

```bash
./scripts/backup-db.sh
```

`.env.home` 의 `BACKUP_DIR` 아래에 `woorilog-<시각>.sql.gz` 로 쌓이고,
`RETENTION_DAYS`(기본 14) 가 지난 것은 지웁니다.
`--single-transaction` 이라 백업 중에도 앱은 그대로 돕니다.

하루 한 번 자동으로 돌리려면 launchd 에 겁니다.
`~/Library/LaunchAgents/local.woorilog.backup.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>local.woorilog.backup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>/Users/<사용자>/Desktop/project/woorilog/scripts/backup-db.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardErrorPath</key><string>/tmp/woorilog-backup.err</string>
  <key>StandardOutPath</key><string>/tmp/woorilog-backup.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/local.woorilog.backup.plist
```

복구:

```bash
gunzip -c backups/woorilog-<시각>.sql.gz | \
  docker compose -f docker-compose.home.yml --env-file .env.home exec -T mysql \
    sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

## HTTPS 로 넘어가기

지금은 http 입니다. 같은 와이파이 안에서 트래픽이 평문으로 흐릅니다.
집 네트워크를 신뢰한다는 전제이며, 그게 불편하면 mkcert 로 로컬 인증서를 씁니다.

```bash
brew install mkcert
mkcert -install
mkcert woorilog.local <맥 IP>     # 이름과 IP 를 한 인증서에 같이 넣습니다
```

그 다음 nginx 에 443 서버 블록을 추가하고 인증서를 마운트한 뒤, `.env.home` 에서 두 줄만 바꿉니다.

```dotenv
PUBLIC_ORIGIN=https://woorilog.local
REFRESH_COOKIE_SECURE=true
```

iPhone 에 CA 를 심는 절차가 중요합니다. **두 단계입니다.**

1. `~/Library/Application Support/mkcert/rootCA.pem` 을 AirDrop 으로 보내 프로파일 설치
2. **설정 → 일반 → 정보 → 인증서 신뢰 설정**에서 해당 CA 를 켭니다

2번을 빼먹으면 프로파일을 설치해도 계속 경고가 뜹니다. 대부분 여기서 막힙니다.

Apple 의 398일 인증서 수명 제한은 시스템 신뢰 루트가 발급한 것에만 걸립니다.
직접 설치한 CA 는 예외라 mkcert 인증서는 그대로 오래 씁니다.

## 알아둘 것

- **로그인은 카카오뿐입니다.** 개발자 로그인은 `import.meta.env.DEV` 조건이라 프로덕션 빌드에
  버튼 자체가 없습니다. 카카오 설정이 잘못되면 들어갈 방법이 없습니다.
- **`PUBLIC_ORIGIN` 은 브라우저가 실제로 여는 주소와 정확히 같아야 합니다.**
  프로토콜과 포트까지. 다르면 카카오 콜백이 `KOE006`(등록되지 않은 redirect URI)으로 떨어집니다.
- **`REFRESH_COOKIE_SECURE` 는 http 에서 반드시 false** 입니다. true 면 브라우저가 쿠키를 버려서
  로그인 직후 바로 로그아웃된 것처럼 보입니다.
- **`WEB_PORT` 를 80 이 아닌 값으로 바꾸면 `PUBLIC_ORIGIN` 에도 포트를 적어야 합니다**
  (`http://woorilog.local:8080`). 카카오 redirect URI 도 같이 바꿔 등록합니다.
- MySQL 과 백엔드는 포트를 밖으로 내지 않습니다. 같은 와이파이의 아무 기기나 DB 에 붙으면 안 됩니다.

## 관련 문서

- 환경 변수 전체: [`environment.md`](./environment.md)
- 인증·세션 흐름: [`auth-session.md`](./auth-session.md)
