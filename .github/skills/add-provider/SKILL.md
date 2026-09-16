---
name: add-provider
description: The complete recipe for adding a new LLM provider to SkillForge — SDK package, registry entry with model ids read from the provider's current docs, the getModel branch, the environment variable in .env.example and Vercel, the integration doc, and the check that the UI updated itself. Use whenever a provider is added, swapped, or its model is changed.
---

# Add a provider

Adding a provider must touch **the registry and the server-side factory, and nothing else in the UI**. That is the whole point of the abstraction introduced in F4 — see [`docs/requirements.md` F4](../../../docs/requirements.md) and [`docs/openai/README.md`](../../../docs/openai/README.md) for how the second one went in.

If you find yourself editing the composer or the preferences list to make a provider appear, stop: the abstraction has leaked. Fix it at the leak, do not work around it. See **Signs something went wrong** below.

## Steps, in order

1. **Install the provider's SDK package.**

   ```sh
   npm install @ai-sdk/<provider>
   ```

   Match the major version of the packages already there (`@ai-sdk/anthropic`, `@ai-sdk/openai`) — they are versioned together with `ai`. A mismatched major fails at the type level, not at runtime, so `npx tsc --noEmit` catches it immediately.

2. **Read the model id out of the provider's current documentation.** Never from memory, never by analogy with another provider's naming. Fetch the provider's models page and its pricing page, and take the exact API id string plus the human-readable name.

   This is the step that looks skippable and is not. An invented id that sounds plausible (`gpt-5-turbo`, `claude-4-sonnet-latest`) produces a 404 from the provider, which surfaces as a generic failure and reads like a bug in the code — so the hunt starts in the wrong place. Pick the tier that matches what the other providers are set to: the course runs on small, cheap models, and comparing a nano model against a flagship one compares prices, not answers.

3. **Add the type, then the registry entry.**
   - `ProviderId` in [`src/lib/types.ts`](../../../src/lib/types.ts) — the union is closed on purpose.
   - An entry in `PROVIDERS` in [`src/lib/providers.ts`](../../../src/lib/providers.ts): `id`, `label`, `modelId`, `modelLabel`, `apiKeyEnvVar`, `pricing`.
   - `pricing` is input/output USD per million tokens **plus `verifiedAt`**, read from the provider's official pricing page on the day you add it — the same figures and date go into the provider doc's "Cost & limite" (step 6). Without it the compiler stops you; with a guessed number, every cost shown in the app is silently wrong.

   Order matters: the registry's order is the order shown in the UI, and **Anthropic stays first and default** — the course runs on its credits. Put the new provider after it.

   ⚠️ `providers.ts` is imported by client components, so **it ends up in the browser bundle**. No keys, no `process.env`, not even a `Boolean(process.env.X)`. `apiKeyEnvVar` holds the variable's **name**, never its value.

4. **Add the branch in `getModel`.** In [`src/lib/providers.server.ts`](../../../src/lib/providers.server.ts), add one line to `MODEL_FACTORIES`:

   ```ts
   <provider>: modelId => <provider>(modelId)
   ```

   You do not have to remember this step — `MODEL_FACTORIES` is a `Record<ProviderId, …>`, so TypeScript refuses to compile a registry entry without its factory. That is deliberate: it makes "an option that looks fine in the UI and explodes on send" impossible.

   `getModel` is the **only** place in the app allowed to instantiate a provider SDK. Nothing else imports `@ai-sdk/*`.

5. **Add the environment variable in both places it lives.**
   - `.env.example`, commented, with **no value** — a short note on what breaks without it.
   - Vercel → Project → Settings → Environment Variables, on **Production AND Preview**, then **Redeploy**. A variable set only on Production means every preview URL shows an option disabled for no visible reason. A variable added without a redeploy does not apply to the deployment that already ran.

   Never write a real key into a doc, a comment, or a test — not even a fake-looking one.

6. **Write `docs/<provider>/README.md`** from [`docs/_template/README.md`](../../../docs/_template/README.md), all six sections, **in the same commit as the code**. Then add its row to the table in [`docs/README.md`](../../../docs/README.md).

   The account path, the exact menu route to the key, whether the key is shown once, how to set a spend limit, and what it costs with the date checked — that is the part the agent cannot do and the human forgets within a week.

7. **Verify the UI updated itself — do not assume it.**

   ```sh
   npm run dev
   curl -s http://localhost:3000/api/providers    # verdicts only, never key values
   ```

   Then, in the app: open the picker next to the composer. The new provider must be there, **with its model name under it**, with no UI code written. Send the same question to two providers and read two different answers.

   Also check the unconfigured path, because it is the one nobody tests: with the key absent, the option must appear **disabled, with the reason in a tooltip** — not missing from the list — and the app must keep working on the first provider. A forced request must return a `400` with a clear message, never a `500`.

8. **Close the loop:** `npm run build` (it must pass with no keys at all), `npm run format`, and a line in the change log of `docs/requirements.md`. Before publishing, run the `pre-deploy` skill.

## Signs something went wrong

- **You had to edit the composer or the preferences section** to make the provider show up. Both iterate `PROVIDER_IDS` and read `PROVIDERS[id]`; if a name had to be written by hand anywhere in the UI, the registry is missing a field the UI needs. Add the field to the registry — do not special-case the component.
- **You wrote `if (providerId === "…")`** anywhere. There are zero such branches in the app, by design; `getModel`'s record replaces all of them. At four providers, a chain of ifs in three files is three places to forget.
- **A key or a `process.env` read appeared in `providers.ts`** or in any client component. Keys live only in `providers.server.ts`, which is imported exclusively by route handlers.
- **"Configured" is being decided in the browser.** It is a property of the server; the client only ever receives a rendered verdict plus a reason from `GET /api/providers`. Never a key value, not even truncated, and never a `NEXT_PUBLIC_*_CONFIGURED` flag.
- **The model id came from memory.** If you cannot point at the documentation page you read it from, go back to step 2.
