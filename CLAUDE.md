<!--
  GENERATED FILE - DO NOT EDIT.
  Source: AGENTS.md
  Regenerate: sh scripts/sync-agent-docs.sh
  Edit AGENTS.md instead; changes made here are overwritten.
-->

# SkillForge — Agent Instructions

SkillForge is a personal skills-and-career copilot: a web app where an AI agent knows the user's real profile (current stack, skills with levels, target role) and answers **in their context**, proposing concrete learning steps toward that target.

It is built module by module as the through-line project of a course. The point is to learn how an LLM is wired into a real web interface — not a one-page demo.

## The requirements file is the source of truth

**[`docs/requirements.md`](docs/requirements.md) is authoritative for what we are building.** Read it before proposing or writing anything.

When a decision changes — scope, phase contents, an architectural choice, a non-functional requirement — **write it into `docs/requirements.md` as part of the same change**. A decision that lives only in the chat is a decision that is lost by the next session. Add a line to its change log at the bottom.

Do not restate requirements in other files. Other documents link to it.

## Every external integration ships a manual-steps doc

Whenever we add an external integration — an LLM provider, a database, authentication, deploy, monitoring — you **must**, in the same commit as the code:

1. write `docs/<integration>/README.md`, covering the part the human does by hand: where the account is created and which plan is needed, where the API key or credential is generated, **which environment variable it goes into** (name only), what has to be configured in their dashboard, what it costs (with a link to the official pricing page and the date it was checked), and how to verify it works. Use [`docs/_template/README.md`](docs/_template/README.md) as the template.
2. add a row for it to the table in [`docs/README.md`](docs/README.md).

The reason this rule exists: the agent writes the code, but the manual steps are the human's, and they are forgotten immediately. On a reinstall, on another machine, or at deploy time they would be hunted down from scratch.

**Never write real keys, tokens, connection strings or any secret value into documentation — variable names only.** This applies to example values too: no realistic-looking fake keys.

## Secrets

- The LLM is called **only from server-side code**, and `src/app/api/chat/route.ts` is the only place that talks to a provider. **Never call a model from a client component**, and never proxy the key through a route that returns it. An API key must never reach the browser — not in client code, not in a URL, not in an API response, not in a log.
- Read the key **inside the handler** (`process.env.ANTHROPIC_API_KEY`), never at module level: a `throw` at import time breaks `next build` on any machine without `.env.local`. A missing key is a `400` response with a clear message, not a `500`.
- Translate provider errors into readable text in `onError` before they reach the UI. The SDK's raw message can carry account details; it stays in the server log.
- Keys live in `.env.local`, which is gitignored. Never commit a key; never paste one into a doc, a comment, or a test.
- Do not put a secret in a client-exposed environment variable.
- At deploy time the same variables are configured in the platform, never hardcoded.
- The system prompt is built **only on the server**, and only in `src/lib/system-prompt.ts`. A second place that composes the persona is a bug, not an optimization — it drifts from the first within weeks and the app ends up with two personalities.
- Data coming from the browser (the user profile, or anything else a client sends) is **untrusted input** and must be normalized on the server — explicit allowed fields, trimmed text, capped length — before it enters a prompt. Free-text fields a user can edit (like a career goal) can carry a prompt injection attempt; normalization is what keeps that text as data instead of instructions.

## Stack and code conventions

- **Next.js with TypeScript, strict.** One full-stack project.
- Types that cross the client/server boundary — profile, messages, the provider contract — are written explicitly. No `any` for those shapes.
- The LLM provider sits behind a common typed interface so it can be swapped (Anthropic and OpenAI) without rewriting the app.
- The app is built around an **agent** — something that receives context and, later, uses tools on its own — not around a form that posts text to a model and prints the result. Structure the code accordingly from the start.
- Code and identifiers in English; comments in Romanian (see Language below).
- **All UI comes from shadcn/ui + Tailwind. No hand-written CSS, no other component library. Every icon comes from `lucide-react`** — it is the only icon source (D-13).
- Import through the `@/` alias, one component per file, and prefer a **registry** (a record or array of entries) over chains of `if`/`switch` when behaviour varies by a key — roles, providers, settings sections, theme options.
- **Invented/mock data lives only in `src/lib/mock/`** (D-14). Never inline placeholder content in a component: replacing mock with real data must stay a one-place change.
- Application state lives in `src/store/useAppStore.ts` (Zustand + `persist`, key `skillforge-app`). Transient UI state is excluded from what gets persisted.
- **Who owns the messages (D-19).** There are now two places that could hold a conversation, so the split is written down rather than left to chance:
  - the **open conversation's messages belong to `useChat`**, in `src/components/chat/chat.tsx`. Do not copy them into the store, and do not add a store action that appends or edits a message.
  - the **store owns the conversation list** — id, title, which one is selected — and nothing else.
  - Derive UI state (`is the model writing`, `show Stop`, `show the error`) from the hook's `status` and `error`. Never keep a parallel `useState` for it.
  - A message has **`parts`**, not a `content` string. Compose text with `messageText()` from `src/lib/message-text.ts`; `message.content` is `undefined` and fails silently.
  - The list `key` is the message **id**, never the array index.

## How to work on this project

This is a course project. The user is learning, and pace matters more than throughput.

- **One module at a time.** Do not build ahead into a later phase because it is convenient.
- **Explain what was added and why it was needed** — the reason the piece exists, not a list of files touched.
- Do not write code outside the scope of the current module.
- Do not scaffold "just in case" abstractions. The phases in `docs/requirements.md` say what comes next; build for the current one.
- Check the current phase in `docs/requirements.md` before starting. If the request seems to belong to a later phase, say so before writing code.

## Language

- `docs/requirements.md`, `README.md` and the app's user interface: **Romanian**.
- Agent instruction files (this file and the generated ones): **English**.
- Code, identifiers, and commit messages: **English**. This includes the JSON keys of anything crossing the client/server boundary — those are a contract, not display text.
- **Comments: Romanian.** Every file gets them, configuration files included.

Comments here are teaching material, so they carry a specific burden: they explain **why** the code is the way it is — the trade-off taken, the failure it prevents, what would silently break without it. A comment that restates what the line already says is noise; delete it. Where a convention differs from what the reader likely knows from elsewhere (Vite, Tailwind v3, the Pages Router), say so explicitly and name the difference.

## Generated files — do not edit

`CLAUDE.md` and `.github/copilot-instructions.md` are generated from this file.

Edit `AGENTS.md`, then run:

```sh
sh scripts/sync-agent-docs.sh
```

`sh scripts/check-agent-docs.sh` verifies they are in sync and fails if they are not.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
