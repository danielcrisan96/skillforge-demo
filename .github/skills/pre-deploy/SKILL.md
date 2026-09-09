---
name: pre-deploy
description: Runs the checklist to do before publishing SkillForge — build without any key, formatting, requirements.md freshness, and Vercel environment variables on both Production and Preview. Use before every push to the main branch, or whenever the user asks to verify the app is ready to deploy.
---

# Pre-deploy

A checklist to run before every publish, so a problem shows up now instead of in production. See [`docs/requirements.md` F2.5](../../../docs/requirements.md) and [`docs/vercel/README.md`](../../../docs/vercel/README.md) for the context behind each check.

## Steps

1. **Build without any key.** Move `.env.local` aside temporarily, run `npm run build`, then bring it back regardless of the result:

   ```sh
   mv .env.local .env.local.bak && npm run build; mv .env.local.bak .env.local
   ```

   This must pass. If it fails, the cause is almost always a module-level env read or a `throw` at import time — see the Secrets section in `AGENTS.md`.

2. **Formatting.**

   ```sh
   npm run format:check
   ```

   If it fails, run `npm run format` and review the diff before committing.

3. **`docs/requirements.md` is current.** Check, don't assume:
   - the current phase carries `← _faza curentă_` on the real one, not a closed one;
   - any decision made in the current discussion is written there, with a line in the change log;
   - a new integration, if one appeared, has its row in [`docs/README.md`](../../../docs/README.md) and its own `docs/<integration>/README.md`.

4. **Every variable in `.env.example` exists in Vercel, on Production AND Preview.** Open `.env.example`, list each variable, then in Vercel → the project → **Settings → Environment Variables** confirm each one has a value checked for **both** environments. A variable set only on Production means every pull request shows a broken chat that looks like a code bug.

5. **Redeploy after any variable change.** If step 4 added or changed anything, do **Deployments → ⋯ → Redeploy** on the latest Production deployment — a new variable does not apply itself to a deployment that already ran.

## What this skill does not do

- **Never commit `.env.local`.** If step 1 is interrupted before `mv .env.local.bak .env.local` runs, verify by hand that the file is back in place before any `git add`.
- **Never write real values into `docs/`.** Any environment-variable example in documentation stays valueless — not even a fake-looking key.
- It does not configure the variables in Vercel itself — steps 4/5 are a check, not an automation; actually adding a variable stays a manual dashboard action.
