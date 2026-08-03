# 홈 배포용 프론트엔드 이미지. 개발용은 Dockerfile.dev 입니다(그쪽은 Vite dev server 를 띄웁니다).
#
# Vite 는 VITE_* 값을 **빌드 시점에** 굽습니다. 런타임 환경 변수로는 바꿀 수 없어서
# 주소가 바뀌면 이미지를 다시 빌드해야 합니다.

# ── 빌드 ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 빈 값이 기본입니다. 프론트와 API 가 같은 nginx 뒤에 있으므로 /api 상대 경로로 부릅니다.
# client.ts 가 `?? 'http://localhost:8080'` 로 폴백하는데, 빈 문자열은 nullish 가 아니라
# 폴백이 걸리지 않습니다 — 의도한 동작입니다.
#
# 카카오 redirect URI 는 여기서 굽지 않습니다. 프론트는 /api/auth/kakao/login-url 을 불러
# 백엔드가 만든 주소로 이동하므로, 그 값은 백엔드의 KAKAO_REDIRECT_URI 하나가 소유합니다.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ── 런타임 ──────────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist /usr/share/nginx/html

EXPOSE 80
