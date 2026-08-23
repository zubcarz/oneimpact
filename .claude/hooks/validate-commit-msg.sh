#!/usr/bin/env bash
# PreToolUse hook (Bash): validates Conventional Commits with scope on `git commit -m`.
#
# Extracting the subject is the whole difficulty here, and the obvious way is
# wrong. `sed -n 's/.*-m "\([^"]*\)".*/\1/p'` looks right but `.*` is GREEDY, so
# it matches the LAST `-m` of the command -- which in this repo is always the
# `Co-Authored-By:` trailer, and never a valid subject. Worse, sed works line by
# line, so a commit whose body contains real newlines matched nothing at all and
# the hook exited 0 WITHOUT VALIDATING. That is how `feat: remove Footer ...`
# reached main with no scope.
#
# The parsing below uses bash parameter expansion instead: it operates on the
# whole command as one string (no line-by-line problem) and `${COMMAND#*-m }`
# strips the SHORTEST prefix, so it lands on the FIRST `-m`, which is the
# subject. It also fails closed: a command that has `-m` but cannot be parsed is
# blocked rather than waved through.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$COMMAND" ] && exit 0
echo "$COMMAND" | grep -q 'git commit' || exit 0

echo "$COMMAND" | grep -q -- '--no-verify' && { echo "Blocked: --no-verify is not allowed" >&2; exit 2; }

# No `-m` at all: `git commit` (editor) or `git commit -F file`. Git's own
# commit-msg hooks still apply; nothing to validate from the command line.
case "$COMMAND" in
  *" -m "*) ;;
  *) exit 0 ;;
esac

REST=${COMMAND#*-m }
case "$REST" in
  '@'\''*') MSG=${REST#@\'}; MSG=${MSG%%\'@*} ;;   # PowerShell here-string: -m @'...'@
  '"'*)     MSG=${REST#\"};  MSG=${MSG%%\"*} ;;
  \'*)      MSG=${REST#\'};  MSG=${MSG%%\'*} ;;
  *)        MSG="" ;;
esac

if [ -z "$MSG" ]; then
  echo "Blocked: could not read the commit subject from this command. Use -m \"type(scope): description\"." >&2
  exit 2
fi

SUBJECT=$(echo "$MSG" | head -1)
if ! echo "$SUBJECT" | grep -qE '^(feat|fix|refactor|chore|docs|test|perf|ci)(\((mobile|api|admin|shared|ui-tokens|api-client|ci|deps|docs|repo)\))?(!)?: .+'; then
  echo "Blocked: subject must be <type>(<scope>): <description>. Scopes: mobile api admin shared ui-tokens api-client ci deps docs repo" >&2
  echo "Got: $SUBJECT" >&2
  exit 2
fi
DESC=$(echo "$SUBJECT" | sed 's/^[^:]*: //')
echo "$DESC" | grep -qE '^[A-Z]' && { echo "Blocked: description must start lowercase" >&2; exit 2; }
echo "$DESC" | grep -qE '\.$' && { echo "Blocked: no trailing period" >&2; exit 2; }
[ ${#SUBJECT} -gt 72 ] && { echo "Blocked: subject ${#SUBJECT} chars (max 72)" >&2; exit 2; }
exit 0
