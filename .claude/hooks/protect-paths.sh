#!/usr/bin/env bash
# PreToolUse hook (Edit|Write): blocks edits to secrets and generated folders.
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$FILE" ] && exit 0
case "$FILE" in
  *.env|*.env.local|*.env.production) echo "Blocked: never write real env files; edit .env.example instead" >&2; exit 2 ;;
  */node_modules/*|*/dist/*|*/.next/*|*/.expo/*) echo "Blocked: generated path" >&2; exit 2 ;;
  */prisma/migrations/*/migration.sql) echo "Blocked: migrations are generated with prisma migrate dev, not edited" >&2; exit 2 ;;
esac
exit 0
