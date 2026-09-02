#!/bin/sh
# Verify that the generated agent instruction files match AGENTS.md.
# Exits non-zero if any of them is missing or out of date.
#
# Useful as a pre-commit hook or a CI step.
#
# Usage: sh scripts/check-agent-docs.sh
set -eu

. "$(dirname -- "$0")/_agent-docs-lib.sh"

require_source

stale=""

for target in $TARGET_DOCS; do
	if [ ! -f "$ROOT/$target" ]; then
		echo "  MISSING    $target"
		stale="$stale $target"
	elif render "$target" | cmp -s - "$ROOT/$target"; then
		echo "  ok         $target"
	else
		echo "  OUT OF SYNC $target"
		stale="$stale $target"
	fi
done

if [ -n "$stale" ]; then
	echo >&2
	echo "error: generated agent docs do not match $SOURCE_DOC." >&2
	echo "Edit $SOURCE_DOC (not the generated files), then run:" >&2
	echo "  sh scripts/sync-agent-docs.sh" >&2
	exit 1
fi

echo "Agent docs are in sync with $SOURCE_DOC."
