import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { PROVIDERS, resolveProviderId } from "@/lib/providers";
import type { ProviderId } from "@/lib/types";

// Partea de provider care are voie să atingă chei și SDK-uri. RULEAZĂ DOAR PE SERVER.
//
// De ce e un fișier separat de `providers.ts`, deși cele două descriu „același"
// lucru: registrul e importat din composer, deci ajunge în bundle-ul de browser.
// Fișierul ăsta nu e importat din niciun component — doar din Route Handlere.
// Sufixul `.server` e pentru cititor; garanția reală e lista de importuri: dacă
// un component client l-ar importa vreodată, `process.env` de mai jos ar fi gol
// în browser și TOȚI providerii ar părea neconfigurați — o eroare care arată a
// cheie lipsă, deși e o graniță încălcată.
//
// Ce e didactic aici: fiecare provider vine cu PROPRIUL pachet de SDK
// (`@ai-sdk/anthropic`, `@ai-sdk/openai`) — sunt biblioteci diferite, scrise de
// echipe diferite, cu API-uri HTTP diferite dedesubt. Ce le face schimbabile e
// că fiecare expune aceeași formă către AI SDK-ul Vercel: o funcție care
// primește un id de model și întoarce un `LanguageModel`. De aceea `streamText`
// din ruta de chat nu știe și nu trebuie să știe cu cine vorbește.

/**
 * Singurul loc din aplicație care alege SDK-ul unui provider.
 *
 * E un `Record<ProviderId, …>`, nu un `switch`, și asta e o alegere cu dinți:
 * fiind indexat pe `ProviderId`, COMPILATORUL cere o intrare pentru fiecare
 * provider din registru. Un provider adăugat în `providers.ts` fără ramura de
 * aici nu compilează — deci nu poate exista o opțiune care apare frumos în
 * interfață și explodează la prima trimitere. Un `switch` cu `default` ar fi
 * trecut tăcut.
 */
const MODEL_FACTORIES: Record<ProviderId, (modelId: string) => LanguageModel> = {
  anthropic: modelId => anthropic(modelId),
  openai: modelId => openai(modelId)
};

/**
 * Are providerul ăsta o cheie configurată pe server?
 *
 * „Configurat" e o proprietate a SERVERULUI, nu a browserului: cheile stau în
 * `.env.local` (local) sau în variabilele de mediu ale platformei (Vercel), iar
 * browserul nu are cum să le vadă — și nici nu trebuie. De aceea răspunsul la
 * întrebarea asta se calculează aici și călătorește spre interfață ca DATĂ DE
 * AFIȘAT (`true`/`false` plus un motiv), niciodată ca valoare de cheie, nici
 * măcar trunchiată.
 *
 * Detaliu de Next care contrazice un obicei: `process.env.FOO` scris cu punct e
 * ÎNLOCUIT la build în codul de client, deci acolo indexarea dinamică
 * (`process.env[nume]`) n-ar merge niciodată. Pe server, `process.env` e chiar
 * obiectul din Node, citit la RULARE — deci indexarea după numele din registru
 * funcționează, și e chiar ce ne trebuie ca să nu scriem numele variabilei a
 * doua oară aici.
 *
 * Se verifică și că nu e șir gol: o variabilă declarată în Vercel și lăsată fără
 * valoare există, dar nu ține loc de cheie.
 */
export function isProviderConfigured(providerId: ProviderId): boolean {
  const value = process.env[PROVIDERS[providerId].apiKeyEnvVar];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Construiește modelul cerut, validat contra registrului.
 *
 * Ambele argumente sunt `unknown` pentru că exact asta sunt: câmpuri dintr-un
 * corp de cerere HTTP. Pot fi o stare veche rămasă în `localStorage` (un
 * provider scos între timp din registru) sau o cerere fabricată de mână cu
 * `curl`. Nici una din cele două nu trece prin compilatorul nostru, deci tipul
 * declarat n-ar fi o garanție, ci o presupunere.
 *
 * Regula: ce nu e în registru NU se trimite mai departe. Se cade pe implicit,
 * fiindcă un răspuns dat de modelul implicit e mai bun decât o eroare 404 de la
 * provider — iar un id de model venit din exterior și pasat direct ar însemna
 * că browserul alege ce model plătim.
 */
export function getModel(providerId: unknown, modelId: unknown): LanguageModel {
  const id = resolveProviderId(providerId);
  const provider = PROVIDERS[id];

  // Azi registrul are un model per provider, deci „cunoscut" înseamnă exact
  // acela. Când un provider va avea mai multe, aici se caută în lista lui —
  // restul aplicației nu se schimbă, pentru că nimeni altcineva nu decide ce
  // model e valid.
  if (modelId !== provider.modelId) {
    // Tăiat la 80 de caractere: e text venit din afară, iar un log de server nu
    // se umple cu ce a trimis cineva în corpul unei cereri.
    const requested = typeof modelId === "string" ? modelId.slice(0, 80) : String(modelId);
    console.warn(`Model necunoscut cerut pentru "${id}": "${requested}". Se folosește ${provider.modelId}.`);
  }

  return MODEL_FACTORIES[id](provider.modelId);
}
