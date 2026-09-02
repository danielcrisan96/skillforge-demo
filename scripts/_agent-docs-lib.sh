# Shared helpers for the agent-instruction sync scripts.
# Sourced by sync-agent-docs.sh and check-agent-docs.sh - not meant to be run directly.
# POSIX sh.

# Repo root, derived from this script's location (works from any cwd).
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd) || exit 1

SOURCE_DOC="AGENTS.md"

# Files generated from SOURCE_DOC. Space-separated, relative to ROOT.
TARGET_DOCS=".github/copilot-instructions.md
CLAUDE.md"

require_source() {
	if [ ! -f "$ROOT/$SOURCE_DOC" ]; then
		echo "error: $SOURCE_DOC not found in $ROOT" >&2
		exit 1
	fi
}

# render <target-path> -> generated content on stdout
#
# The body is AGENTS.md verbatim, behind a header marking the file as generated.
# Targets inside a subdirectory get their relative links rewritten, otherwise
# links like (docs/requirements.md) would break from .github/.
render() {
	cat <<'HEADER'
<!--
  GENERATED FILE - DO NOT EDIT.
  Source: AGENTS.md
  Regenerate: sh scripts/sync-agent-docs.sh
  Edit AGENTS.md instead; changes made here are overwritten.
-->

HEADER

	case "$1" in
	*/*) sed 's#](docs/#](../docs/#g; s#](scripts/#](../scripts/#g' "$ROOT/$SOURCE_DOC" ;;
	*) cat "$ROOT/$SOURCE_DOC" ;;
	esac
}
