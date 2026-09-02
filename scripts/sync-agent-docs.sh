#!/bin/sh
# Regenerate the agent instruction files from AGENTS.md.
#
# AGENTS.md is the only one written by hand. CLAUDE.md and
# .github/copilot-instructions.md are full copies of it, because the tools that
# read them do not reliably follow a pointer to another file.
#
# Usage: sh scripts/sync-agent-docs.sh
set -eu

. "$(dirname -- "$0")/_agent-docs-lib.sh"

require_source

for target in $TARGET_DOCS; do
	dir=$(dirname -- "$ROOT/$target")
	[ -d "$dir" ] || mkdir -p "$dir"

	if [ -f "$ROOT/$target" ] && render "$target" | cmp -s - "$ROOT/$target"; then
		echo "  unchanged  $target"
	else
		render "$target" >"$ROOT/$target"
		echo "  written    $target"
	fi
done

echo "Agent docs synced from $SOURCE_DOC."
