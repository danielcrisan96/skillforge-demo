#!/bin/sh
# Sincronizează .claude/skills/*/SKILL.md în oglinda lor din .github/skills/*/SKILL.md.
#
# Claude Code și GitHub Copilot citesc skill-uri din foldere diferite, dar din
# EXACT același format de fișier — de asta .claude/skills/ e sursa, iar
# .github/skills/ e o copie identică, nu un al doilea fișier scris de mână.
# Fără scriptul ăsta, cele două ar diverge silențios la primul skill nou.
#
# Usage:
#   sh scripts/sync-skills.sh          # scrie oglinda
#   sh scripts/sync-skills.sh --check  # doar verifică, iese cu eroare dacă e desincronizat
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd) || exit 1
SOURCE_DIR="$ROOT/.claude/skills"
TARGET_DIR="$ROOT/.github/skills"

check_only=0
[ "${1:-}" = "--check" ] && check_only=1

if [ ! -d "$SOURCE_DIR" ]; then
	echo "error: $SOURCE_DIR nu există" >&2
	exit 1
fi

stale=""

# Iterăm folderele, nu un tabel de nume fixe: fiecare skill nou apărut sub
# .claude/skills/ intră automat în sincronizare, fără să se atingă scriptul.
for src in "$SOURCE_DIR"/*/SKILL.md; do
	[ -e "$src" ] || continue
	name=$(basename -- "$(dirname -- "$src")")
	dst="$TARGET_DIR/$name/SKILL.md"

	if [ -f "$dst" ] && cmp -s "$src" "$dst"; then
		echo "  ok          skills/$name"
		continue
	fi

	if [ "$check_only" -eq 1 ]; then
		echo "  OUT OF SYNC skills/$name"
		stale="$stale $name"
		continue
	fi

	mkdir -p "$(dirname -- "$dst")"
	cp "$src" "$dst"
	echo "  written     skills/$name"
done

if [ "$check_only" -eq 1 ] && [ -n "$stale" ]; then
	echo >&2
	echo "error: oglinda din .github/skills/ nu corespunde cu .claude/skills/." >&2
	echo "Editează versiunea din .claude/skills/, apoi rulează: sh scripts/sync-skills.sh" >&2
	exit 1
fi

echo "Skill-urile sunt sincronizate din $SOURCE_DIR în $TARGET_DIR."
