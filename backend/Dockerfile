# 홈 배포용 백엔드 이미지. 개발용은 Dockerfile.dev 입니다(그쪽은 소스를 마운트하고 bootRun 을 돌립니다).
#
# 런타임에 Tesseract 가 필요합니다 — 영수증 OCR 이 네이티브 tesseract 를 부릅니다.
# 모델 파일은 Dockerfile.dev 와 같은 커밋에 고정하고 체크섬을 검증합니다.
# 버전을 올릴 때는 두 파일을 같이 고칩니다.

# ── 빌드 ────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk AS build

WORKDIR /workspace
ENV GRADLE_USER_HOME=/gradle

# 의존성 해석을 소스보다 먼저 태워서, 소스만 바뀔 때 이 레이어를 재사용합니다.
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ── 런타임 ──────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre

ARG TESSDATA_BEST_COMMIT=e12c65a915945e4c28e237a9b52bc4a8f39a0cec

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        tesseract-ocr \
    && curl --fail --location --silent --show-error \
        "https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/${TESSDATA_BEST_COMMIT}/eng.traineddata" \
        --output /usr/share/tesseract-ocr/5/tessdata/eng.traineddata \
    && curl --fail --location --silent --show-error \
        "https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/${TESSDATA_BEST_COMMIT}/kor.traineddata" \
        --output /usr/share/tesseract-ocr/5/tessdata/kor.traineddata \
    && echo "8280aed0782fe27257a68ea10fe7ef324ca0f8d85bd2fd145d1c2b560bcb66ba  /usr/share/tesseract-ocr/5/tessdata/eng.traineddata" | sha256sum --check \
    && echo "f888d4038348a0c3d25151e7f452bda0d74ca275b18cab146798bcbb94084fff  /usr/share/tesseract-ocr/5/tessdata/kor.traineddata" | sha256sum --check \
    && rm -rf /var/lib/apt/lists/*

# 애플리케이션은 root 로 돌리지 않습니다. 업로드 임시 파일도 이 사용자 소유가 됩니다.
RUN useradd --system --create-home --uid 10001 woorilog
USER woorilog
WORKDIR /app

COPY --from=build --chown=woorilog:woorilog /workspace/build/libs/*.jar /app/app.jar

EXPOSE 8080

# 컨테이너 메모리에 맞춰 힙을 잡습니다. 고정 -Xmx 를 박으면 호스트를 바꿀 때마다 다시 만져야 합니다.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
