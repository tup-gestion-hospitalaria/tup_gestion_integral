#!/usr/bin/env bash
# Mirrors .github/workflows/ci.yml (Backend + Frontend jobs).
# Usage: ./bin/ci-check.sh [--integration]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WITH_INTEGRATION=false

for arg in "$@"; do
  case "$arg" in
    --integration) WITH_INTEGRATION=true ;;
    -h | --help)
      echo "Usage: $0 [--integration]"
      echo "  --integration  Also run backend Firebase emulator tests (Java required)."
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

run_backend() {
  echo "== CI local: Backend =="
  cd "$ROOT/backend"
  npm audit --omit=dev --audit-level=high
  npm run lint
  npm test
  npm run build
  npm run smoke
}

run_frontend() {
  echo "== CI local: Frontend =="
  cd "$ROOT/frontend"
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare npm@11.11.0 --activate
  fi
  npm audit --audit-level=high
  npm run lint
  npm test -- --watch=false
  npm run build
  npm run smoke
}

run_integration() {
  echo "== CI local: Integration (backend emulators) =="
  cd "$ROOT/backend"
  npm run test:emulators
}

run_backend
run_frontend

if [[ "$WITH_INTEGRATION" == true ]]; then
  run_integration
fi

echo "CI local checks passed."
