#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): prettier on TS/TSX/JSON/MD files inside apps/ or packages/.
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$FILE" ] && exit 0
case "$FILE" in
  *.ts|*.tsx|*.js|*.json|*.md) ;;
  *) exit 0 ;;
esac
case "$FILE" in
  *node_modules*|*/.claude/*|*/.wip/*) exit 0 ;;
esac
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
[ -x "$ROOT/node_modules/.bin/prettier" ] || exit 0
"$ROOT/node_modules/.bin/prettier" --log-level warn --write "$FILE" >/dev/null 2>&1 || true
exit 0
