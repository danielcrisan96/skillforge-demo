---
name: add-integration
description: The recipe for documenting a new external integration in SkillForge (LLM provider, database, authentication, deploy, monitoring, shared cache) — docs/<integration>/README.md from the template with all six sections filled, each variable marked secret or config, the docs/README.md index row, placeholder lines in .env.example, the Vercel Production + Preview + Redeploy reminder, and an explicit check that no real value reached docs/ or .env.example. Use in the same change as the integration's code.
---

# Add integration

Mechanizes the permanent rule from `AGENTS.md` ("Every external integration ships a manual-steps doc") and [`docs/requirements.md` §10](../../../docs/requirements.md). The agent writes the code; the manual steps belong to the human and are forgotten immediately. This skill makes sure they are written down **in the same commit** as the code.

For an LLM provider, run `add-provider` for the code part; this skill still covers the documentation part.

## Steps

1. **Pick the folder name.** `docs/<integration>/` — lowercase, the library or service name the code imports (`nextauth`, `supabase`, `openai`), not a marketing name.

2. **Copy the template** [`docs/_template/README.md`](../../../docs/_template/README.md) to `docs/<integration>/README.md`, delete the introductory block, and fill **all six sections**. None may stay as a placeholder:
   1. **Ce face** — what it does _in SkillForge_, not what the service is in general.
   2. **Cont & chei** — where the account is created, which plan, non-obvious steps, where each credential is generated step by step, and whether it is **shown only once**.
   3. **Variabile de mediu** — the table, plus the `.env.example` block. See step 3.
   4. **Pași manuali** — dashboard configuration, **one entry per environment** (local, production, and what was decided for Vercel Preview), what to redo when the domain changes, and key rotation without downtime.
   5. **Cost & limite** — pricing model, free limits, the **official pricing page URL** and **the date it was checked** (today, read now, never from memory).
   6. **Verificare** — how to confirm in under a minute that it works, plus the concrete symptom when a variable is missing or wrong.

   Read facts from the service's **current** documentation (URLs, dashboard paths, limits, ids). A plausible-sounding invented detail costs the reader an afternoon.

3. **Mark every variable `secret` or `config`** in the table, with the consequence spelled out:
   - **secret**: if it reaches someone else, they can act on behalf of the app, and the only fix is to generate a new one. On Vercel, tick **Sensitive**.
   - **config**: it identifies or locates, it does not authorize (a public client id, a URL, a region). On Vercel, leave **Sensitive** unticked so it stays readable while debugging.

   If a value looks secret but is public by design (an OAuth client id), say explicitly why it is not a leak.

4. **Add the index row** to the table in [`docs/README.md`](../../../docs/README.md): name, the phase it entered in, link.

5. **Add the variables to `.env.example`**: commented out, **empty after `=`**, each with a comment line saying what it is, whether it is `secret` or `config`, whether it is optional, what the app does without it, and a pointer to `docs/<integration>/README.md`. Never the `NEXT_PUBLIC_` prefix on a secret.

6. **The app must start without the integration.** Missing variables are a handled state (a clear message, a disabled option, a closed route in production), never a `throw` at import time. Verify with the build-without-keys step of `pre-deploy`.

7. **Remind the human about Vercel**, in the final message and not only in the doc: add the variables on **Production AND Preview**, tick Sensitive on secrets only, then **Deployments → ⋯ → Redeploy**. If the integration depends on the domain (OAuth callbacks, webhooks, CORS), the verification must also be repeated **on the production domain**.

8. **Check that no real value leaked.** Run all three and read the output; do not skip them:

   ```sh
   # 1. every variable line in .env.example is commented and empty after "="
   grep -nE '^[[:space:]]*#?[[:space:]]*[A-Z][A-Z0-9_]*=[^[:space:]]' .env.example

   # 2. nothing key-shaped in docs/ or .env.example (common prefixes, long base64/hex runs)
   grep -rnE '(sk-[A-Za-z0-9_-]{10,}|sk-ant-|ghp_|gho_|github_pat_|AIza[0-9A-Za-z_-]{20,}|xox[bap]-|eyJ[A-Za-z0-9_-]{20,}|[A-Za-z0-9+/]{40,}={0,2}|[0-9a-f]{32,})' docs/ .env.example

   # 3. .env.local is not tracked
   git ls-files --error-unmatch .env.local 2>/dev/null && echo "TRACKED — STOP" || echo "ok: .env.local untracked"
   ```

   Check 1 must match nothing except deliberate non-secret demo values (today only `SKILLFORGE_DEMO_MESSAGE`). It looks for a non-blank character right after `=`; `[^[:space:]]` rather than `.+`, because on a CRLF checkout the trailing carriage return would make every empty line match. Checks 1 and 2 are heuristics, so look at each match yourself. Any real-looking value gets removed before committing, and if it was real, it gets **rotated**: a key that touched a file has to be treated as leaked.

9. **`docs/requirements.md`**: if the integration changes a phase, a decision or a non-functional requirement (for example §8.1 variable names or §8.2 personal data), write it there with a change-log line.

## What this skill does not do

- It does not create accounts, generate keys or configure dashboards. Those steps stay manual; the skill only makes sure they are written down.
- It never writes real values anywhere, not even realistic-looking fake ones. Variable names only.
- It does not replace `pre-deploy`, which still runs before publishing.
