#!/usr/bin/env bash
# One Impact quality gate. Mirrors CI. Used by the `verifier` agent and by humans.
#
#   bash scripts/dev/quality-check.sh --scope mobile|api|admin|shared|all [--only typecheck,lint,unit,e2e,bundle] [--filter <path>]
#
# Exit code != 0 if any step failed. Prints [OK] / [FAIL] / [SKIP] per step.
set -u

SCOPE="all"
ONLY=""
FILTER=""
while [ $# -gt 0 ]; do
  case "$1" in
    --scope) SCOPE="$2"; shift 2 ;;
    --only) ONLY="$2"; shift 2 ;;
    --filter) FILTER="$2"; shift 2 ;;
    --list) echo "scopes: mobile api admin shared all | steps: typecheck lint unit e2e bundle"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
FAILED=0
SUMMARY=()

wants() { [ -z "$ONLY" ] || echo ",$ONLY," | grep -q ",$1,"; }

run_step() {
  local name="$1"; shift
  echo "--- $name"
  if "$@"; then SUMMARY+=("[OK]   $name"); else SUMMARY+=("[FAIL] $name"); FAILED=1; fi
}

skip_step() { SUMMARY+=("[SKIP] $1"); }

pkg_steps() {
  local ws="$1" label="$2"
  wants typecheck && run_step "$label typecheck" pnpm --filter "$ws" typecheck
  wants lint && run_step "$label lint" pnpm --filter "$ws" lint
  if wants unit; then
    if [ -n "$FILTER" ]; then run_step "$label unit ($FILTER)" pnpm --filter "$ws" test -- "$FILTER"
    else run_step "$label unit" pnpm --filter "$ws" test; fi
  fi
}

case "$SCOPE" in
  shared|all)
    for p in shared ui-tokens api-client; do pkg_steps "@oneimpact/$p" "packages/$p"; done
    ;;
esac
case "$SCOPE" in
  api|all)
    pkg_steps "@oneimpact/api" "apps/api"
    if wants e2e; then
      if docker compose ps --status running 2>/dev/null | grep -q db; then
        run_step "apps/api e2e" pnpm --filter @oneimpact/api test:e2e
      else skip_step "apps/api e2e (postgres not running: pnpm db:up)"; fi
    fi
    ;;
esac
case "$SCOPE" in
  mobile|all)
    pkg_steps "@oneimpact/mobile" "apps/mobile"
    if wants bundle; then
      OUT="${TMPDIR:-/tmp}/oneimpact-expo-export"
      run_step "apps/mobile bundle (expo export)" bash -c "cd apps/mobile && npx expo export --platform android --output-dir '$OUT' >/dev/null"
    fi
    ;;
esac
case "$SCOPE" in
  admin|all)
    pkg_steps "@oneimpact/admin" "apps/admin"
    if wants e2e; then run_step "apps/admin e2e (playwright)" pnpm --filter @oneimpact/admin test:e2e; fi
    ;;
esac

echo
echo "=== quality-check summary (scope=$SCOPE${ONLY:+, only=$ONLY})"
printf '%s\n' "${SUMMARY[@]}"
[ "$FAILED" -eq 0 ] && echo "RESULT: GREEN" || echo "RESULT: RED"
exit "$FAILED"
