#!/bin/sh
# 홈 배포 MySQL 덤프. 하루 한 번 launchd 로 거는 것을 전제로 합니다.
#
#   ./scripts/backup-db.sh
#
# 볼륨만 믿으면 안 됩니다. `docker compose down -v` 한 번, 디스크 고장 한 번이면 끝입니다.
# 덤프는 BACKUP_DIR 아래에 날짜별로 쌓이고 RETENTION_DAYS 가 지난 것은 지웁니다.
set -eu

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.prod}"
if [ ! -f "$ENV_FILE" ]; then
  echo "환경 파일이 없습니다: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
. "./$ENV_FILE"

RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="/backups/woorilog-${STAMP}.sql.gz"

# --single-transaction: InnoDB 를 잠그지 않고 일관된 스냅샷을 뜹니다. 백업 중에도 앱이 돕니다.
# 비밀번호는 -p 대신 MYSQL_PWD 로 넘깁니다. -p 로 주면 컨테이너 프로세스 목록에 그대로 보입니다.
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" exec -T \
  -e MYSQL_PWD="${MYSQL_ROOT_PASSWORD}" mysql \
  sh -c "mysqldump --single-transaction --quick --routines \
      -u root '${MYSQL_DATABASE}' | gzip > '${TARGET}'"

echo "덤프 완료: ${BACKUP_DIR:-./backups}/woorilog-${STAMP}.sql.gz"

# 오래된 덤프 정리. 컨테이너 안에서 지워야 소유자 문제가 없습니다.
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" exec -T mysql \
  find /backups -name 'woorilog-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "${RETENTION_DAYS}일 지난 덤프를 정리했습니다."
