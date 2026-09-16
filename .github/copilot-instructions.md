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

Whenever we add an external integration — an LLM provider, a database, authentication, deploy, monitoring — you **must**, in the same commit as the code:

1. write `docs/<integration>/README.md`, covering the part the human does by hand: where the account is created and which plan is needed, where the API key or credential is generated, **which environment variable it goes into** (name only), what has to be configured in their dashboard, what it costs (with a link to the official pricing page and the date it was checked), and how to verify it works. Use [`docs/_template/README.md`](../docs/_template/README.md) as the template.
2. add a row for it to the table in [`docs/README.md`](../docs/README.md).

The reason this rule exists: the agent writes the code, but the manual steps are the human's, and they are forgotten immediately. On a reinstall, on another machine, or at deploy time they would be hunted down from scratch.

**Never write real keys, tokens, connection strings or any secret value into documentation — variable names only.** This applies to example values too: no realistic-looking fake keys.

## Secrets

- The LLM is called **only from server-side code**, and `src/app/api/chat/route.ts` is the only place that talks to a provider. **Never call a model from a client component**, and never proxy the key through a route that returns it. An API key must never reach the browser — not in client code, not in a URL, not in an API response, not in a log.
- Read the key **inside the handler** (`process.env.ANTHROPIC_API_KEY`), never at module level: a `throw` at import time breaks `next build` on any machine without `.env.local`. A missing key is a `400` response with a clear message, not a `500`.
- **`src/lib/providers.ts` is code that ends up in the browser** — the composer imports it — so it must never touch `process.env` or hold a key, not even a `Boolean(process.env.X)` to decide whether an option is enabled. It carries the registry only: id, label, `modelId`, `modelLabel`, the **name** of the key's environment variable, and the model's public `pricing`. Everything key-related lives in `src/lib/providers.server.ts`, which is imported exclusively by route handlers, and **`getModel` there is the only place in the app that instantiates a provider SDK** — nothing else imports `@ai-sdk/*`. Its `MODEL_FACTORIES` is a `Record<ProviderId, …>` so the compiler rejects a registry entry with no factory behind it; keep it that way instead of a `switch` with a `default`, which would fail silently at runtime instead of loudly at build.
- **"Configured" is a property of the server, never of the browser.** Whether a provider has a key is computed server-side (`isProviderConfigured`) and reaches the UI as display data through `GET /api/providers`: a boolean plus a ready-to-show reason. Never send a key value, not even truncated or as "last 4 characters", and never mirror configuration into a `NEXT_PUBLIC_*` variable — that is a second source of truth for the same fact, and it normalizes putting key-shaped things in public variables.
- A provider requested without a key is a `400` with a clear message naming the variable, handled in the UI like any other chat error — not an exception, not a `500`.
- **Adding a provider must not mean new code in the UI.** The registry is the single list; the composer and the preferences section iterate `PROVIDER_IDS` and never name a provider. There are zero `if (providerId === "…")` branches in the app and it stays that way. Model ids are read from the provider's current documentation, never from memory — an invented id that sounds plausible returns a 404 that looks like a code bug. The full recipe is the `add-provider` skill.
- Translate provider errors into readable text in `onError` before they reach the UI. The SDK's raw message can carry account details; it stays in the server log. Compose those messages from the registry (`provider.label`, `provider.apiKeyEnvVar`), never with one provider's name hardcoded — otherwise a bad OpenAI key tells the user to go check `ANTHROPIC_API_KEY`.
- Keys live in `.env.local`, which is gitignored. Never commit a key; never paste one into a doc, a comment, or a test.
- Do not put a secret in a client-exposed environment variable.
- At deploy time the same variables are configured in the platform, never hardcoded.
- The system prompt is built **only on the server**, and only in `src/lib/system-prompt.ts`. A second place that composes the persona is a bug, not an optimization — it drifts from the first within weeks and the app ends up with two personalities.
- Data coming from the browser (the user profile, or anything else a client sends) is **untrusted input** and must be normalized on the server — explicit allowed fields, trimmed text, capped length — before it enters a prompt. Free-text fields a user can edit (like a career goal) can carry a prompt injection attempt; normalization is what keeps that text as data instead of instructions.
- **Model output is untrusted input too, and it is rendered without raw HTML.** A message's text is markdown, rendered through the single component `src/components/chat/markdown.tsx` — every place that shows a message goes through it, none re-implements formatting. The HTML-in-markdown plugin (`rehype-raw`) is never enabled, and `dangerouslySetInnerHTML` is never used on model output, anywhere. Without that rule, an `<img onerror=...>` written by the model — or reached through it from someone else's document, once retrieval is added — becomes XSS in this app the moment it is rendered as an element instead of text. This is the standard chat-app injection vector, not a theoretical concern.

## Authentication

- **The session is read on the server, with the server function: `await auth()` from `src/lib/auth.ts`.** Never infer "is signed in" from anything the browser sends. The client hook `useSession()` is for display only; it is a different API with a different mechanism, and no access decision is ever taken from it. The two are not interchangeable.
- **`src/lib/auth.ts` is server-only** (route handlers and server components). It uses the `next-auth` **v5** shape: `NextAuth(() => config)` is called once and returns `handlers`, `auth`, `signOut`. The v4 shape (`authOptions`, `getServerSession`) does not exist in the installed version, and most examples online are v4. The lazy form (a function, not an object) makes env vars get read per request, never at import or build time.
- **No route that costs money stays without a session check.** Such a route calls `authorizePaidRoute()` as its **first** statement, before reading the body, the rate limit, the cache or the provider, and returns its `401`/`503`. A hidden button protects nothing; the route is a public URL.
- **Missing auth configuration is a handled state, not an exception.** `isAuthConfigured()` requires `AUTH_SECRET` plus the id/secret pair of at least one active provider. Without it the app runs as before, with no sign-in button, nothing throws, and `next build` passes. **In production (`NODE_ENV === "production"`) missing configuration CLOSES paid routes (`503`), it does not open them**; only `next dev` stays open. That decision lives in code next to the check, in `authorizePaidRoute`. Do not weaken it.
- **Log the minimum.** The chat route logs one line with the user **id** (`github:<numeric id>`, built in the `jwt` callback). Never log email, name, image or a session token: a log is text kept by someone else and never erased on the user's request.
- **Auth providers live in a registry**: `src/lib/auth-providers.ts` (browser-safe: id = the exact `next-auth` provider id, label, `status: "active" | "coming-soon"`, env var **names**), `AUTH_PROVIDER_FACTORIES` in `src/lib/auth.ts` and `AUTH_PROVIDER_LOGOS` in `src/components/auth/auth-provider-logos.tsx`, both `Record<AuthProviderId, …>`. Activating a provider means one `status` value plus its env vars, with zero UI code. The sign-in dialog iterates the registry and never names a provider; the row that opens it has a neutral icon.
- **Whether auth is configured reaches the client through `AuthConfigProvider` context** (`src/components/auth/auth-config-provider.tsx`), computed in `src/app/page.tsx` after `await connection()` so it is evaluated at request time, not frozen at build. Never pass it as props through the settings registry, and never mirror it in a `NEXT_PUBLIC_*` variable.
- **`useSession()` is called only under `SessionProvider`, which is mounted only when auth is configured.** Since a hook cannot be called conditionally, branch with **separate components**: an outer one reads `useAuthConfig()` and mounts the inner one that calls `useSession()` only on the configured branch (see `sidebar-account.tsx`, `account-email-field.tsx`).
- **Data from the auth provider (email, name, picture) is not profile data.** It is shown read-only, it never enters the `Profile` type, the store, `localStorage` or the system prompt. The profile is sent to the model on every message; the account email has no business on that path. Render what exists: email and name can be `null`; show human text for loading, signed-out and "provider didn't send it", never `null`.
- **Auth errors stay inside the app.** `pages.signIn`/`pages.error` point to `/`. A provider-side error on the callback (`?error=access_denied` on Cancel) is handled in `src/app/api/auth/[...nextauth]/route.ts` **before** handing the request to the library, because the library throws, logs a stack and replaces the reason with a generic `OAuthCallbackError` (verified at runtime, and its logger never sees the reason either). That path logs **one line** and redirects to `/?error=<original code>`. Codes are translated in **one place**, `src/lib/auth-errors.ts` (unknown codes get the generic message, never the raw code or library English text), and `auth-error-notice.tsx` removes `error` from the URL right after showing it.
- **Known limitation, on purpose:** no database, so conversations stay in `localStorage` and belong to the browser, not the account. Two people signing in on the same browser see the same conversations. That gets fixed at the persistence step, not here.

## Cost, cache and rate limiting

- **The cost formula has exactly one place: `src/lib/cost.ts`** (tokens × price / 1,000,000, input and output separately). The per-message display and the conversation total both go through it; aggregation over messages lives in `src/lib/message-utils.ts` and calls it — never re-multiply tokens by a price anywhere else. Two formulas split at the first price change.
- **Token counts come only from the provider's reported `usage`** — never estimated from text length. Any count can be missing depending on provider and model: treat `undefined` as unknown and render "—", never `0` (looks free) and never let it become `NaN`.
- **Prices live in the provider registry** (`pricing` in `src/lib/providers.ts`), per model, input/output per million tokens, **with `verifiedAt`** — read from the provider's official pricing page, never from memory. A price without a date is wrong in six months and nobody knows since when. The same figures and date go into `docs/<provider>/README.md` under "Cost & limite", in the same commit. Changing `modelId` without changing `pricing` is a bug.
- A message's usage is stored **on the message** (`metadata`: provider, model, the price at generation time, tokens, source `model`/`cache`), not recomputed from the current registry — otherwise a conversation that switched providers, or a later price update, shows the wrong cost. Store the ingredients, not the final number.
- **The response cache is accessed only through `src/lib/cache.ts`** (`get`/`set`, async, nothing implementation-specific in the signature, so it can move to an external store without touching callers). **The cache key includes everything that influences the response — provider, model, the full system prompt, and a hash of the model messages.** The system prompt carries the user's profile, so dropping it from the key would serve one person's answer to another: a data leak, not an optimization. Consequence to keep in mind: hit rates are low and this cache is protection against identical resubmits, not a cost-reduction mechanism.
- **A regenerate ("mai încearcă") never reads from the cache** — otherwise the button returns the same text and does nothing. Only complete responses (`finishReason === "stop"`) are written.
- A cache hit is **replayed as a stream** in the same UI message protocol and **marked as cached in the UI** (cost 0); never let it pass as an instant model response.
- The chat route's rate limit (`src/lib/rate-limit.ts`) is an in-memory, per-instance counter: a common-sense guard against retry loops, **not a security control** — say so wherever it is described. A limit hit is a `429` with `Retry-After` and an absolute `retryAt`, shown in the UI as a clear, non-destructive message with the local time to retry — never as a technical error.
- A shared cache or rate limiter (Redis, KV) is an external integration and follows the integration rule above: its own `docs/<service>/README.md`, index row and variables.

## Stack and code conventions

- **Next.js with TypeScript, strict.** One full-stack project.
- Types that cross the client/server boundary — profile, messages, the provider contract — are written explicitly. No `any` for those shapes.
- The LLM provider sits behind a common typed interface so it can be swapped (Anthropic and OpenAI) without rewriting the app.
- The app is built around an **agent** — something that receives context and, later, uses tools on its own — not around a form that posts text to a model and prints the result. Structure the code accordingly from the start.
- Code and identifiers in English; comments in Romanian (see Language below).
- **All UI comes from shadcn/ui + Tailwind. No hand-written CSS, no other component library. Every icon comes from `lucide-react`** — it is the only icon source (D-13). **Documented exception: brand logos** (auth providers) are inline SVG in `src/components/auth/auth-provider-logos.tsx`. They are trademarks the icon library doesn't ship, and neither a whole dependency for two logos nor a CDN image (a network wait before the sign-in buttons render) is acceptable. GitHub's is drawn in `currentColor` so it follows the theme; Google's keeps its brand colors. Components under `src/components/ui/` are shadcn-generated and are not hand-edited — regenerate or compose around them instead. **Documented exception:** `src/components/ui/sonner.tsx` reads its theme through our own `useTheme()` (from `src/components/theme/theme-provider.tsx`) instead of `next-themes`, the library shadcn wires it to by default. Reason: `sonner` renders its toasts in a portal outside our tree, and without a `next-themes` provider in the tree (there isn't one — we don't use the library) it would always receive `"system"`, so toasts would never follow the theme the user actually picked.
- Import through the `@/` alias, one component per file, and prefer a **registry** (a record or array of entries) over chains of `if`/`switch` when behaviour varies by a key — roles, providers, settings sections, theme options.
- **Invented/mock data lives only in `src/lib/mock/`** (D-14). Never inline placeholder content in a component: replacing mock with real data must stay a one-place change.
- Application state lives in `src/store/useAppStore.ts` (Zustand + `persist`, key `skillforge-app`). Transient UI state is excluded from what gets persisted.
- **Theme is not store state.** It lives on its own `createContext`+`useContext` mechanism in `src/components/theme/theme-provider.tsx` — consumed only through the `useTheme()` hook it exports, never through props passed down from a parent. This is a deliberate exception to the line above: the store-vs-context comparison closes on this one piece of state, because theme has a single logical consumer and changes rarely, exactly the profile where context's lack of selectors costs nothing. The preference persists under its own `localStorage` key, `skillforge-theme` — separate from the store's `skillforge-app` key. Do not add `theme`/`setTheme` back to `useAppStore` or to its `partialize`; two places holding the same preference is a switch that works only half the time.
- **Who owns the messages, by phase (D-19).** There are two places that could hold a conversation, so the split is written down rather than left to chance:
  - **While a response is streaming, messages belong to `useChat`**, in `src/components/chat/chat.tsx`. It builds them token by token; nothing else writes to them during that window.
  - **The store is the archive**: the conversation list — id, title, which one is selected — **and** each conversation's messages, but written back only once, when the stream ends (`syncConversationMessages`, called on the `status` transition into `"ready"`/`"error"`). Never add a store action that appends or edits a message mid-stream, and never sync on every token: `persist` writes to `localStorage` synchronously on every state change, so a per-token sync would mean hundreds of full-history serializations in a few seconds — a visibly janky UI on a long conversation. The accepted trade-off: a response interrupted by a refresh mid-stream is lost, because the sync never got to run.
  - Opening a conversation re-seeds `useChat` from the archive (`conversations[id].messages`), read once at mount — the chat component already remounts on `key={conversationId}` when the active conversation changes (existing since F1.4), so a one-time read at mount is enough; don't add a manual re-sync effect on top of it.
  - **Any change to the shape of a persisted conversation requires bumping `persist`'s `version` and writing a `migrate` function** that transforms the old saved shape into the new one — without it, the first load against an existing `localStorage` renders data in the wrong shape, and the error surfaces in a component, not at the cause.
  - Derive UI state (`is the model writing`, `show Stop`, `show the error`) from the hook's `status` and `error`. Never keep a parallel `useState` for it.
  - A message has **`parts`**, not a `content` string. Compose text with `messageText()` from `src/lib/message-text.ts`; `message.content` is `undefined` and fails silently.
  - The list `key` is the message **id**, never the array index.
  - **Transformations over the message list — anything that turns `UIMessage[]` (plus the profile) into a string, a summary, an export — live in `src/lib/message-utils.ts` as pure functions**: they take messages and return a value, nothing else. No `document`, no store, no `fetch` in that file — that's what makes them testable without a browser. Extracting text from one message still has exactly one place, `messageText()`; a serializer that re-reads `message.parts` itself has drifted from it.
  - A component that isn't `chat.tsx` (the header, say) needing the OPEN conversation's live messages does **not** get a store field for it — that would put a second, real-time copy of streaming messages back in the store, the exact thing D-19 rules out. Route it through a narrow, pull-based bridge instead (see `src/lib/active-conversation-bridge.ts`): written on every message change, read once, on demand — never subscribed to reactively, so it can't be a second render-driving copy.
  - **No action bar above the conversation.** This is a product rule, not a style preference: conversation-level actions (retry, copy, export) live on the message itself (hover) or in the header — never as a strip of buttons floating over the message list.
- **Store reads go through selectors: `useAppStore(state => state.x)`, never `useAppStore()` followed by destructuring.** The latter subscribes the component to every change in the store, so a component that only cares about the conversation list would re-render on every token of a streaming response. A selector that builds a new object or array literal (`state => ({ a: state.a, b: state.b })`) returns a different reference every call, which re-renders the component in an infinite loop — write separate selectors instead, or use the library's shallow-comparison helper.

## Skills

A workflow that repeats at every module — a checklist to run, a recurring set of steps — is worth writing down once as a **skill**, not re-derived or re-explained from scratch each time.

- **`.claude/skills/` is the source.** Each skill is a folder with a `SKILL.md` (frontmatter `name`, matching the folder name, plus `description`).
- **`.github/skills/` is its mirror**, byte-identical, so Claude Code and GitHub Copilot read the same instructions from the format each of them expects.
- Never hand-edit the `.github/skills/` copy. Edit the `.claude/skills/` version, then run:

  ```sh
  sh scripts/sync-skills.sh
  ```

  `sh scripts/sync-skills.sh --check` verifies the mirror matches without writing, for use as a pre-commit hook or a CI step.

## How to work on this project

This is a course project. The user is learning, and pace matters more than throughput.

- **One module at a time.** Do not build ahead into a later phase because it is convenient.
- **Explain what was added and why it was needed** — the reason the piece exists, not a list of files touched.
- Do not write code outside the scope of the current module.
- Do not scaffold "just in case" abstractions. The phases in `docs/requirements.md` say what comes next; build for the current one.
- Check the current phase in `docs/requirements.md` before starting. If the request seems to belong to a later phase, say so before writing code.
- **Definition of done, before publishing:** run the `pre-deploy` skill.

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
