import type { ModelPricing, ProviderId } from "@/lib/types";

// Registrul providerilor de model. SINGURA listă de providere din aplicație.
//
// ⚠️ FIȘIERUL ĂSTA AJUNGE ÎN BROWSER. E importat din composer (`provider-picker.tsx`),
// deci conținutul lui e cod de client: oricine deschide DevTools îl poate citi.
// De aceea aici nu intră NICIO cheie și niciun `process.env`. Ce ține de chei stă
// în `providers.server.ts`, care nu e importat niciodată dintr-un component.
//
// Ce e în joc, concret: `apiKeyEnvVar` de mai jos e NUMELE variabilei, nu valoarea
// ei. Numele e public oricum (e scris în `.env.example` și în documentație) și
// folosește la un mesaj de eroare util; valoarea nu are voie să treacă granița.
//
// De ce un registru și nu un lanț de `if (provider === "anthropic") … else if`:
// testul abstracției nu e cât de elegant arată, ci câte fișiere trebuie atinse ca
// să adaugi a doua implementare. Cu un registru, un provider nou = o intrare aici
// + o ramură în `getModel` (pe care compilatorul o CERE, vezi acolo). Composer-ul,
// preferințele și ruta de chat nu se ating — ele iterează lista, nu o cunosc pe
// de rost. Cu `if`-uri, fiecare din cele trei locuri ar fi trebuit editat, iar la
// al patrulea provider ai patru ramuri în trei fișiere, care se desincronizează.

export type ProviderInfo = {
  id: ProviderId;
  /** Numele companiei, pentru interfață. */
  label: string;
  /**
   * Id-ul de model trimis către API. NU e text de afișat: o greșeală aici e o
   * eroare de la provider, nu o etichetă urâtă.
   *
   * Se citește din documentația CURENTĂ a providerului, niciodată din memorie
   * sau prin analogie cu alt provider. Un id inventat („gpt-5-turbo", care sună
   * plauzibil și nu există) dă un 404 care arată exact ca un bug de cod, deși e
   * o problemă de citit documentația.
   */
  modelId: string;
  /** Cum se numește modelul pentru un om. Poate diferi de `modelId`. */
  modelLabel: string;
  /**
   * NUMELE variabilei de mediu în care stă cheia — niciodată valoarea.
   *
   * Stă în registru, deși e folosit doar pe server, ca „un provider nou = o
   * intrare nouă" să rămână adevărat: altfel numele ar fi fost a doua listă, în
   * alt fișier, și s-ar fi desincronizat de asta. Clientul îl folosește doar ca
   * text într-un mesaj („lipsește OPENAI_API_KEY"), niciodată ca să citească
   * `process.env` — vezi avertismentul din capul fișierului.
   */
  apiKeyEnvVar: string;
  /**
   * Prețul modelului de mai sus (`modelId`), cu data verificării.
   *
   * Stă AICI, lângă `modelId`, și nu într-un tabel separat, din același motiv ca
   * restul registrului: prețul aparține modelului. Într-un fișier separat, cineva
   * ar schimba `modelId` și ar uita prețul — iar aplicația ar afișa liniștită
   * costul vechiului model pentru răspunsurile noului model.
   *
   * Cifrele se citesc din pagina oficială de prețuri a providerului, niciodată
   * din memorie. Aceleași cifre, cu aceeași dată, stau în `docs/<provider>/README.md`
   * la „Cost & limite" — când se schimbă una, se schimbă amândouă.
   *
   * E informație publică (e pe site-ul providerului), deci nu e o problemă că
   * fișierul ajunge în browser.
   */
  pricing: ModelPricing;
};

/**
 * Ordinea de aici e ordinea din interfață — `Object.keys` păstrează ordinea de
 * inserare pentru chei-text, deci lista din composer nu are nevoie de o sortare
 * separată (care ar fi fost al doilea loc de ținut în sinc).
 *
 * Anthropic rămâne PRIMUL și implicit: pe creditele lui rulează cursul.
 */
export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    modelId: "claude-haiku-4-5",
    modelLabel: "Claude Haiku 4.5",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    // platform.claude.com/docs/en/about-claude/pricing — „Base input tokens" și
    // „Output tokens" pentru Claude Haiku 4.5.
    pricing: { inputPerMillionUsd: 1, outputPerMillionUsd: 5, verifiedAt: "2026-09-16" }
  },

  openai: {
    id: "openai",
    label: "OpenAI",
    // Citit din documentația oficială la 2026-09-14
    // (developers.openai.com/api/docs/models, /api/docs/pricing): modelul din
    // familia curentă optimizat pentru volum și cost — echivalentul de rol al
    // lui Haiku de mai sus, ca cele două opțiuni să fie comparabile la preț.
    modelId: "gpt-5.6-luna",
    modelLabel: "GPT-5.6 Luna",
    apiKeyEnvVar: "OPENAI_API_KEY",
    // developers.openai.com/api/docs/pricing — tier Standard, context scurt.
    // Peste pragul de context lung, OpenAI taxează dublu la intrare ($0,40) și
    // mai mult la ieșire ($1,80); conversațiile din SkillForge nu ajung acolo,
    // dar dacă ar ajunge, costul afișat ar fi SUB cel real — vezi docs/openai.
    pricing: { inputPerMillionUsd: 0.2, outputPerMillionUsd: 1.2, verifiedAt: "2026-09-16" }
  }
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/**
 * Providerul cu care pornește aplicația și modelul lui.
 *
 * E și valoarea pe care se cade când clientul cere ceva ce nu există în registru
 * (vezi `resolveProviderId`). Anthropic, pentru că pe creditele lui rulează
 * cursul — un fallback care ar comuta tăcut pe celălalt provider ar cheltui din
 * alt buget decât cel așteptat.
 */
export const DEFAULT_PROVIDER_ID: ProviderId = "anthropic";

export const DEFAULT_MODEL_ID = PROVIDERS[DEFAULT_PROVIDER_ID].modelId;

/**
 * Validează un id de provider venit din exterior, contra registrului.
 *
 * `unknown`, nu `ProviderId`, fiindcă exact asta primim: o valoare din corpul
 * unei cereri HTTP sau din `localStorage`. Tipul din TypeScript e o promisiune
 * de la compilare, iar nimic din cele două nu trece prin compilatorul nostru —
 * `localStorage` poate conține un provider șters între timp dintr-o versiune mai
 * veche a aplicației, iar corpul cererii poate fi scris de mână cu `curl`.
 *
 * Funcția stă AICI, nu în `providers.server.ts`, pentru că e validare pură
 * contra unei liste — nu atinge nicio cheie și niciun SDK. Serverul o folosește
 * ca să nu trimită mai departe o valoare fabricată; clientul, ca să nu afișeze
 * un provider care nu mai există.
 */
export function resolveProviderId(value: unknown): ProviderId {
  return typeof value === "string" && value in PROVIDERS ? (value as ProviderId) : DEFAULT_PROVIDER_ID;
}
