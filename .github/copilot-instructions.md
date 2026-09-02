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

**[`docs/requirements.md`](../docs/requirements.md) is authoritative for what we are building.** Read it before proposing or writing anything.

When a decision changes — scope, phase contents, an architectural choice, a non-functional requirement — **write it into `docs/requirements.md` as part of the same change**. A decision that lives only in the chat is a decision that is lost by the next session. Add a line to its change log at the bottom.

Do not restate requirements in other files. Other documents link to it.

## Every external integration ships a manual-steps doc

Whenever we add an external integration — an LLM provider, a database, authentication, deploy, monitoring — you **must** also write `docs/<integration>/README.md` covering the part the human does by hand:

- where the account is created, and which plan is needed
- where the API key or credential is generated
- **which environment variable it goes into** (name only)
- what has to be configured in their dashboard
- what it costs, with a link to the official pricing page and the date it was checked
- how to verify it works
- what to do when the key is rotated or revoked

Use [`docs/_TEMPLATE-integrare.md`](../docs/_TEMPLATE-integrare.md) as the template.

The reason this rule exists: the agent writes the code, but the manual steps are the human's, and they are forgotten immediately. On a reinstall, on another machine, or at deploy time they would be hunted down from scratch.

**Never write real keys, tokens, connection strings or any secret value into documentation — variable names only.** This applies to example values too: no realistic-looking fake keys.

## Secrets

- The LLM is called **only from server-side code**. An API key must never reach the browser.
- Keys live in `.env.local`, which is gitignored. Never commit a key; never paste one into a doc, a comment, or a test.
- Do not put a secret in a client-exposed environment variable.
- At deploy time the same variables are configured in the platform, never hardcoded.

## Stack and code conventions

- **Next.js with TypeScript, strict.** One full-stack project.
- Types that cross the client/server boundary — profile, messages, the provider contract — are written explicitly. No `any` for those shapes.
- The LLM provider sits behind a common typed interface so it can be swapped (Anthropic and OpenAI) without rewriting the app.
- The app is built around an **agent** — something that receives context and, later, uses tools on its own — not around a form that posts text to a model and prints the result. Structure the code accordingly from the start.
- Code, comments and identifiers in English.

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
- Code, comments, identifiers, commit messages: **English**.

## Generated files — do not edit

`CLAUDE.md` and `.github/copilot-instructions.md` are generated from this file.

Edit `AGENTS.md`, then run:

```sh
sh scripts/sync-agent-docs.sh
```

`sh scripts/check-agent-docs.sh` verifies they are in sync and fails if they are not.
