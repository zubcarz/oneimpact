#!/usr/bin/env bash
# PreToolUse hook (Bash): validates Conventional Commits with scope on `git commit -m`.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$COMMAND" ] && exit 0
echo "$COMMAND" | grep -q 'git commit' || exit 0

MSG=$(echo "$COMMAND" | sed -n "s/.*-m '\([^']*\)'.*/\1/p" | head -1)
[ -z "$MSG" ] && MSG=$(echo "$COMMAND" | sed -n 's/.*-m "\([^"]*\)".*/\1/p' | head -1)
[ -z "$MSG" ] && MSG=$(echo "$COMMAND" | sed -n "s/.*-m @'\(.*\)/\1/p" | head -1)
[ -z "$MSG" ] && exit 0

SUBJECT=$(echo "$MSG" | head -1)
if ! echo "$SUBJECT" | grep -qE '^(feat|fix|refactor|chore|docs|test|perf|ci)(\((mobile|api|admin|shared|ui-tokens|api-client|ci|deps|docs|repo)\))?(!)?: .+'; then
  echo "Blocked: subject must be <type>(<scope>): <description>. Scopes: mobile api admin shared ui-tokens api-client ci deps docs repo" >&2
  exit 2
fi
DESC=$(echo "$SUBJECT" | sed 's/^[^:]*: //')
echo "$DESC" | grep -qE '^[A-Z]' && { echo "Blocked: description must start lowercase" >&2; exit 2; }
echo "$DESC" | grep -qE '\.$' && { echo "Blocked: no trailing period" >&2; exit 2; }
[ ${#SUBJECT} -gt 72 ] && { echo "Blocked: subject ${#SUBJECT} chars (max 72)" >&2; exit 2; }
echo "$COMMAND" | grep -q -- '--no-verify' && { echo "Blocked: --no-verify is not allowed" >&2; exit 2; }
exit 0
