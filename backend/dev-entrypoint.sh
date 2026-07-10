#!/bin/sh
set -eu

./gradlew classes
./gradlew --continuous classes &
compiler_pid=$!

./gradlew bootRun &
application_pid=$!

stop() {
  kill "$application_pid" "$compiler_pid" 2>/dev/null || true
  wait "$application_pid" 2>/dev/null || true
  wait "$compiler_pid" 2>/dev/null || true
}

trap 'stop; exit 0' INT TERM

wait "$application_pid"
application_status=$?
stop
exit "$application_status"
