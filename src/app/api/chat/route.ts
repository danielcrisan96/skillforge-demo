import {
  APICallError,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage
} from "ai";

import { buildResponseCacheKey, responseCache, type CachedResponse } from "@/lib/cache";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { PROVIDERS, resolveProviderId, type ProviderInfo } from "@/lib/providers";
import { getModel, isProviderConfigured } from "@/lib/providers.server";
import { CHAT_RATE_LIMIT, checkRateLimit, clientKeyFromRequest } from "@/lib/rate-limit";
import type { MessageUsageMetadata } from "@/lib/types";

// Ruta pe care stă agentul.
//
// E singurul loc din aplicație care are voie să vorbească cu providerul, și
// motivul nu e stilistic. Aici se ating trei lucruri care nu au ce căuta în
// browser: CHEIA (oricine deschide DevTools ar copia-o), COSTUL (fiecare apel
// se plătește, deci trebuie să existe un loc unde poate fi limitat) și, mai
// târziu, LIMITAREA PE UTILIZATOR. Un client care cheamă direct providerul le
// pierde pe toate trei deodată.
//
// Ce e util de observat: sub `useChat`, în `chat.tsx`, nu e nicio magie. E tot
// SSE — exact protocolul scris de mână în `api/about/route.ts` la F1.3.
// `toUIMessageStreamResponse()` scrie evenimentele, hook-ul le citește și le
// adună. Diferența e că evenimentele descriu acum și părți de mesaj, nu doar
// text.
//
// De la F4, ruta nu mai știe pe de rost cu cine vorbește: providerul vine în
// corpul cererii, iar modelul se construiește prin `getModel`. Observă ce NU e
// aici — niciun `if (providerId === "openai")`. Codul de mai jos ar arăta la fel
// cu patru provideri; singura diferență ar fi lungimea registrului.
//
// De la F4.2, ruta face costul VIZIBIL și are două plase de siguranță, în ordinea
// în care le întâlnește o cerere: limita de cereri pe minut (`rate-limit.ts`) și
// cache-ul de răspunsuri identice (`cache.ts`). Consumul raportat de provider
// pleacă spre browser lipit de mesaj, ca metadate — vezi `messageMetadata` mai jos.

export const runtime = "nodejs";

/**
 * Ce trimite clientul: mesajele în formatul de UI, profilul utilizatorului și
 * providerul/modelul alese lângă composer.
 *
 * Sunt DOUĂ formate de mesaj în joc, iar confuzia dintre ele e capcana clasică
 * a pasului. `UIMessage` descrie ce se AFIȘEAZĂ — are `id` (React are nevoie de
 * el la randare) și `parts`, o listă de bucăți tipate: text, raționament, apel
 * de unealtă. `ModelMessage` descrie ce se TRIMITE modelului și nu conține
 * nimic din ce ține de afișare.
 *
 * `convertToModelMessages` face traducerea. Trimis direct, un `UIMessage` ar
 * duce la provider câmpuri pe care acesta nu le înțelege.
 *
 * `providerId` și `modelId` sunt `unknown`, nu `ProviderId` și `string`, și
 * asta e intenționat: tot ce vine din corpul unei cereri e input neîncredere,
 * iar un tip declarat aici ar fi o presupunere, nu o garanție — nimic din ce
 * trimite browserul nu trece prin compilatorul nostru. Se validează contra
 * registrului mai jos, exact ca profilul în `buildSystemPrompt`.
 */
type ChatRequestBody = {
  messages: UIMessage[];
  profile?: unknown;
  providerId?: unknown;
  modelId?: unknown;
  /**
   * Ce a declanșat cererea: un mesaj nou („submit-message") sau „mai încearcă"
   * („regenerate-message"). Tot input neîncredere — se compară doar cu o valoare
   * exactă, iar orice altceva e tratat ca mesaj obișnuit.
   */
  trigger?: unknown;
};

export async function POST(request: Request) {
  // Limita de cereri, PRIMA verificare — înainte de a citi corpul, de a construi
  // promptul sau de a căuta în cache. Tot ce e după ea costă ceva (CPU, memorie
  // sau bani), iar rostul ei e ca o rafală să nu ajungă la niciuna.
  //
  // Se aplică și cererilor care ar fi nimerit cache-ul: altfel limita ar depinde
  // de conținutul cererii, iar clientul n-ar putea ști dinainte dacă o respectă.
  const rateLimit = checkRateLimit(clientKeyFromRequest(request));
  if (!rateLimit.allowed) {
    // 429 cu `Retry-After` — convenția HTTP pe care o respectă și clienții
    // automați. Corpul are aceeași formă `{ error }` ca la 400, plus MOMENTUL
    // reîncercării, pe care interfața îl formatează în ora locală (vezi
    // `describeChatError`). Serverul nu formatează ora: pe Vercel rulează în UTC,
    // iar utilizatorul ar citi o oră decalată cu câteva ore.
    return Response.json(
      {
        error: `Ai trimis prea multe mesaje într-un minut (limita e de ${CHAT_RATE_LIMIT.maxRequests}). E o plasă de siguranță, ca un buton apăsat în buclă să nu consume creditul.`,
        retryAt: rateLimit.retryAt
      },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const { messages, profile, providerId, modelId, trigger }: ChatRequestBody = await request.json();

  // Corpul se citește ÎNAINTE de verificarea cheii, spre deosebire de F1.4.
  //
  // Nu e o rearanjare cosmetică: de la F4 nu mai există „cheia" la singular.
  // Care cheie trebuie să existe depinde de providerul cerut, iar providerul
  // cerut e în corpul cererii — deci nu avem ce verifica până nu-l citim.
  const provider = PROVIDERS[resolveProviderId(providerId)];

  // Cheia se citește tot în interiorul handler-ului (prin `isProviderConfigured`),
  // niciodată la nivel de modul.
  //
  // Diferența nu e cosmetică. Un `throw` scris lângă `import`-uri se execută
  // când Next încarcă fișierul — inclusiv în timpul lui `next build`. Rezultat:
  // proiectul n-ar mai compila pe niciun calculator fără `.env.local`, deci
  // nimeni n-ar putea nici măcar să-l pornească ca să vadă despre ce e vorba.
  if (!isProviderConfigured(provider.id)) {
    // 400, nu 500.
    //
    // 500 înseamnă „serverul s-a stricat" și trimite omul să caute un bug care
    // nu există. Cheia lipsă e o CONFIGURARE incompletă, adică o cerere pe care
    // serverul refuză s-o onoreze — și e ceva ce utilizatorul poate repara.
    // Textul spune numele variabilei și fișierul, niciodată vreo valoare.
    //
    // Se ajunge aici în două feluri: fie cu o cerere fabricată de mână, fie cu o
    // alegere rămasă în `localStorage` de pe vremea când cheia exista. În
    // interfață arată ca orice altă eroare de chat — vezi `error` din `useChat`.
    return Response.json(
      {
        error: `${provider.label} nu e configurat. Adaugă ${provider.apiKeyEnvVar} în .env.local și repornește serverul (vezi docs/${provider.id}/README.md).`
      },
      { status: 400 }
    );
  }

  // System prompt-ul se construiește din profil pe server, nu pe client.
  //
  // Motivele sunt critice: dacă textul personei ajunge în browser, oricine îl
  // poate citi și, mai grav, îl poate înlocui. Orice cheie de API sau detaliu
  // de implementare care ajunge în prompt ar trebui să stea pe server. Și profilul
  // e input neîncredere — se normalizează înainte să intre în prompt.
  const systemPrompt = buildSystemPrompt(profile);

  // `await`: în AI SDK 7 conversia e ASINCRONĂ, fiindcă unele părți de mesaj
  // (fișiere, atașamente) pot avea nevoie să fie descărcate. Fără `await`, în
  // `messages` ar ajunge un `Promise` — TypeScript prinde greșeala, dar în
  // JavaScript simplu ar fi trecut și ar fi eșuat abia la provider.
  //
  // Conversia se face o singură dată, aici, fiindcă AMBELE căi de mai jos au
  // nevoie de rezultat: cheia de cache și apelul către model.
  const modelMessages = await convertToModelMessages(messages);

  const cacheKey = buildResponseCacheKey({
    providerId: provider.id,
    modelId: provider.modelId,
    systemPrompt,
    messages: modelMessages
  });

  // „Mai încearcă" NU citește din cache — decis explicit. Reluarea trimite exact
  // aceleași mesaje ca prima dată, deci ar nimeri garantat cache-ul și ar întoarce
  // același text: butonul n-ar face nimic, iar utilizatorul ar crede că e stricat.
  // Cine apasă „mai încearcă" CERE un apel nou și îl plătește conștient — de asta
  // există limita de cereri de mai sus. Răspunsul nou îl înlocuiește în cache pe cel vechi.
  const isRegenerate = trigger === "regenerate-message";

  if (!isRegenerate) {
    const cached = await responseCache.get(cacheKey);
    if (cached) return replayCachedResponse(cached, provider, request.signal);
  }

  const result = streamText({
    // Aici se vede ce cumpără abstracția: `streamText` primește un `LanguageModel`
    // și nu-l interesează al cui e. Alegerea SDK-ului s-a făcut într-un singur
    // loc (`getModel`), pe baza registrului — nu aici, printr-o ramură care ar
    // fi trebuit editată la fiecare provider nou.
    //
    // Cheia nu se pasează explicit: fiecare SDK își citește singur variabila din
    // mediu. Verificarea de mai sus există ca să dăm un mesaj bun ÎNAINTE să
    // ajungem aici, nu ca să transportăm noi secretul.
    model: getModel(provider.id, modelId),

    // Persona și guardrail-uri, construite din profilul utilizatorului.
    //
    // Injectat pe server, nu livrat din client. Textul stă aici, nu în browser.
    system: systemPrompt,

    messages: modelMessages,

    /**
     * Finalul generării: aici se SCRIE în cache.
     *
     * `onEnd` e numele din AI SDK 7 pentru ce versiunile anterioare numeau
     * `onFinish` (care încă există, dar e marcat `@deprecated`). Primește textul
     * final și `usage` — consumul raportat EXACT de provider, nu estimat.
     *
     * De ce nu se salvează streamul: un stream nu se poate păstra, e o curgere
     * consumată o singură dată. Se păstrează rezultatul lui — textul acumulat — și,
     * la o nimerire, se REDĂ ca stream (`replayCachedResponse`).
     *
     * Se cachează DOAR un răspuns complet (`finishReason === "stop"`). Unul tăiat
     * de limita de tokeni sau de un filtru, salvat, ar fi servit la nesfârșit
     * într-o formă pe care modelul n-a dat-o niciodată ca răspuns întreg. Un
     * răspuns oprit cu „Stop" sau întrerupt de o eroare nu ajunge deloc aici.
     */
    onEnd: async ({ text, usage, finishReason }) => {
      if (finishReason !== "stop" || text.trim().length === 0) return;
      await responseCache.set(cacheKey, {
        text,
        usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens }
      });
    }
  });

  return result.toUIMessageStreamResponse({
    /**
     * Consumul, lipit de mesajul asistentului ca metadate.
     *
     * De ce aici și nu în `onEnd` de mai sus: `onEnd` rulează abia după ce
     * evenimentul `finish` a PLECAT deja spre browser (e apelat la închiderea
     * streamului) — metadatele scrise acolo n-ar mai avea cu ce călători. Partea
     * `finish` poartă `totalUsage`, aceeași valoare pe care `onEnd` o primește ca
     * `usage`, din același loc din SDK.
     *
     * Doar pe `finish`, nu și pe `start`: la start nu se știe nimic despre consum,
     * iar niște metadate fără tokeni ar fi afișat „—" pe tot parcursul streamului.
     */
    messageMetadata: ({ part }) => {
      if (part.type !== "finish") return undefined;
      return usageMetadata(provider, "model", {
        inputTokens: part.totalUsage.inputTokens,
        outputTokens: part.totalUsage.outputTokens
      });
    },

    /**
     * Traducerea erorilor de provider în text citibil.
     *
     * Două motive, ambele serioase. Primul: mesajul brut al SDK-ului poate
     * conține detalii de cont — id-uri de organizație, limite, uneori fragmente
     * din cerere. Trimis în interfață, ajunge în fața oricui deschide aplicația.
     * Al doilea: „AI_APICallError: 401" nu-i spune nimic omului care trebuie să
     * repare configurarea.
     *
     * Textele sunt compuse din registru (`provider.label`, `provider.apiKeyEnvVar`),
     * nu scrise cu numele unui provider anume: altfel, la al doilea provider,
     * cineva cu o cheie de OpenAI greșită ar fi citit „Verifică
     * ANTHROPIC_API_KEY" și ar fi căutat în locul greșit.
     *
     * Ce se întoarce de aici ajunge în `error` din `useChat`. Cheia nu se
     * loghează niciodată — nici aici, nici altundeva.
     */
    onError: error => {
      // Loghează pe server forma completă (utilă la depanare), fără să o
      // trimită mai departe. `console.error` scrie în terminalul serverului,
      // nu în browser.
      console.error(`Apelul către ${provider.label} a eșuat:`, error);

      // Ramificare pe STATUS, prin tipul de eroare al SDK-ului — nu pe textul
      // mesajului.
      //
      // Tentația e să scrii `error.message.includes("401")`. Nu merge: pentru o
      // cheie greșită, mesajul e „API key is invalid." și nu conține nicăieri
      // numărul. Textele se schimbă între versiuni și sunt traduse de provider;
      // codul HTTP nu. Și, de la al doilea provider, ar fi fost două seturi de
      // texte de ghicit, nu unul.
      if (APICallError.isInstance(error)) {
        switch (error.statusCode) {
          case 401:
          case 403:
            return `Cheia de API a fost refuzată de ${provider.label}. Verifică ${provider.apiKeyEnvVar} în .env.local.`;
          case 429:
            return `Ai atins limita de cereri sau creditul contului ${provider.label}. Încearcă din nou peste puțin.`;
          case 404:
            return `Modelul ${provider.modelId} nu există sau contul ${provider.label} nu are acces la el. Vezi modelId din src/lib/providers.ts.`;
        }
      }

      return `Apelul către ${provider.label} a eșuat. Detaliile complete sunt în terminalul serverului.`;
    }
  });
}

/**
 * Metadatele de consum pentru un răspuns — aceeași formă pentru ambele căi
 * (model și cache), construită într-un singur loc.
 *
 * Prețul se copiază din registru ÎN mesaj, la momentul generării: dacă registrul
 * se schimbă mâine, conversațiile de azi rămân calculate cu prețul de azi.
 */
function usageMetadata(
  provider: ProviderInfo,
  source: MessageUsageMetadata["source"],
  usage: MessageUsageMetadata["usage"]
): MessageUsageMetadata {
  return {
    providerId: provider.id,
    modelId: provider.modelId,
    pricing: provider.pricing,
    usage,
    source
  };
}

/**
 * Redă un răspuns din cache ca stream — în ACELAȘI protocol pe care îl scrie
 * `toUIMessageStreamResponse()`, deci `useChat` nu știe și nu trebuie să știe
 * de unde vine textul.
 *
 * Textul pleacă în bucăți mici, cu o pauză scurtă, nu dintr-o bucată: interfața
 * e construită pentru un text care crește, iar derularea automată și randarea
 * markdown-ului se comportă la fel ca la un răspuns real. Dar pauza e mult mai
 * scurtă decât ritmul unui model — și, mai important, mesajul e MARCAT ca venit
 * din cache (`source: "cache"`), altfel utilizatorul ar crede că modelul a
 * răspuns instantaneu și s-ar mira data viitoare de ce nu mai e la fel de rapid.
 */
function replayCachedResponse(cached: CachedResponse, provider: ProviderInfo, signal: AbortSignal): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const textId = "cached-text";
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: textId });

      // Bucăți pe cuvinte, păstrând spațiile și rândurile noi — markdown-ul (liste,
      // blocuri de cod) depinde de ele.
      for (const chunk of cached.text.match(/\S+\s*|\s+/g) ?? []) {
        // „Stop" apăsat în timpul redării: fără verificarea asta, bucla ar continua
        // să scrie într-un stream pe care nu-l mai citește nimeni.
        if (signal.aborted) return;
        writer.write({ type: "text-delta", id: textId, delta: chunk });
        await new Promise(resolve => setTimeout(resolve, 8));
      }

      writer.write({ type: "text-end", id: textId });
      writer.write({
        type: "finish",
        finishReason: "stop",
        // Tokenii ORIGINALI rămân pe mesaj (sunt context retrimis la mesajul
        // următor), dar `source: "cache"` face ca `messageCost` să-l socotească
        // gratuit — acum nu s-a plătit nimic.
        messageMetadata: usageMetadata(provider, "cache", cached.usage)
      });
    }
  });

  return createUIMessageStreamResponse({ stream });
}
