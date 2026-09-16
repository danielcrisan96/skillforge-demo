import { createHash } from "node:crypto";
import type { ModelMessage } from "ai";

import type { ProviderId, TokenUsage } from "@/lib/types";

// Cache-ul de răspunsuri. RULEAZĂ DOAR PE SERVER (`node:crypto`, memoria procesului).
//
// SINGURUL mod de a ajunge la cache e prin acest fișier. Ruta de chat nu știe că
// dedesubt e un `Map` — și exact asta îl face migrabil: interfața de mai jos are
// două funcții, fără nimic specific memoriei în semnătură.
//
// ⚠️ Ce NU e cache-ul ăsta, spus explicit: NU e un mecanism de reducere a costului.
// Cheia conține system prompt-ul, iar system prompt-ul conține PROFILUL. Doi
// utilizatori diferiți nu împart deci niciodată un răspuns, iar rata de nimeriri
// va fi mică. Ce face, de fapt: protejează la RETRIMITERI IDENTICE — același om,
// aceeași întrebare, același context, trimisă de două ori (un dublu-clic, un tab
// deschis de două ori, aceeași sugestie din ecranul gol într-o conversație nouă).
//
// Un cache care ar ignora profilul ar avea o rată de nimeriri mult mai bună și ar
// fi o SCURGERE DE DATE: răspunsul construit pe skill-urile și obiectivul unui om
// ar fi servit altuia. Nu e o optimizare de negociat.

/**
 * Contractul oricărui cache din aplicație.
 *
 * Asincron, deși `Map` e sincron: un cache extern (Redis, Upstash, KV-ul
 * platformei) răspunde peste rețea. Dacă semnătura de azi ar fi sincronă, mutarea
 * ar schimba fiecare apelant; așa, se schimbă doar implementarea de mai jos.
 *
 * Fără `ttl`, `maxEntries` sau `delete` în semnătură: acelea sunt decizii ale
 * implementării, nu ale apelantului.
 */
export type Cache<V> = {
  get(key: string): Promise<V | undefined>;
  set(key: string, value: V): Promise<void>;
};

/**
 * Implementarea în memorie: limită de intrări + timp de expirare.
 *
 * Limitele există pentru că memoria procesului nu e gratuită: fără `maxEntries`,
 * fiecare întrebare nouă ar rămâne pentru totdeauna, iar serverul ar crește până
 * cade. `ttlMs` e scurt (minute, nu zile) pentru că scopul e retrimiterea
 * ACCIDENTALĂ, care se întâmplă în câteva secunde: cine pune aceeași întrebare
 * peste o oră probabil vrea un răspuns proaspăt, nu o copie.
 *
 * Evacuarea e „cel mai vechi scris iese primul": `Map` păstrează ordinea de
 * inserare, iar `set` pe o cheie existentă o mută la coadă. Nu e un LRU complet
 * (o citire nu reîmprospătează), dar pentru protecția la retrimiteri e suficient.
 *
 * Limitări asumate, de spus la curs: memoria e PER INSTANȚĂ (pe Vercel, fiecare
 * instanță de funcție are cache-ul ei — o retrimitere poate ajunge pe alta și se
 * plătește din nou), se golește la fiecare repornire și la fiecare cold start.
 */
function createMemoryCache<V>({ maxEntries, ttlMs }: { maxEntries: number; ttlMs: number }): Cache<V> {
  const entries = new Map<string, { value: V; expiresAt: number }>();

  return {
    async get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;

      // Expirarea se verifică la citire, nu cu un `setInterval`: un timer ar ține
      // procesul ocupat degeaba și ar trebui oprit la repornirea modulului în dev.
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },

    async set(key, value) {
      entries.delete(key);
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });

      while (entries.size > maxEntries) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey === undefined) break;
        entries.delete(oldestKey);
      }
    }
  };
}

/** Ce se păstrează pentru un răspuns: textul final și consumul lui original. */
export type CachedResponse = {
  text: string;
  /**
   * Tokenii răspunsului ORIGINAL. Nu se plătesc a doua oară la o nimerire, dar
   * rămân utili: sunt context care va fi retrimis la mesajul următor, deci intră
   * în calculul „cât din cost e istoric".
   */
  usage: TokenUsage;
};

export const responseCache: Cache<CachedResponse> = createMemoryCache<CachedResponse>({
  maxEntries: 200,
  ttlMs: 10 * 60 * 1000
});

/**
 * Cheia de cache = provider + model + system prompt + hash pe mesaje.
 *
 * Regula: cheia conține TOT ce influențează răspunsul. Orice lipsă aici e un
 * răspuns servit în alt context decât cel în care a fost generat:
 * - fără provider/model, o întrebare pusă pe OpenAI ar primi răspunsul lui Claude;
 * - fără system prompt (deci fără profil), un utilizator ar primi răspunsul
 *   construit pe profilul altuia — scurgere de date;
 * - fără mesaje, orice întrebare ar primi același răspuns.
 *
 * Se hash-uiesc mesajele în formatul trimis MODELULUI (`ModelMessage`), nu
 * `UIMessage`: acelea au `id`-uri generate în browser, diferite la fiecare
 * trimitere, deci aceeași întrebare n-ar da niciodată aceeași cheie.
 *
 * Totul trece prin SHA-256 ca un singur obiect JSON, nu prin concatenare de
 * șiruri: la concatenare, „ab" + „c" și „a" + „bc" ar da aceeași cheie. Iar
 * cheia nu conține textul în clar — un cache extern n-ar trebui să vadă profilul
 * utilizatorului în numele cheilor.
 */
export function buildResponseCacheKey(input: {
  providerId: ProviderId;
  modelId: string;
  systemPrompt: string;
  messages: ModelMessage[];
}): string {
  const messagesHash = createHash("sha256").update(JSON.stringify(input.messages)).digest("hex");
  const contextHash = createHash("sha256")
    .update(JSON.stringify({ systemPrompt: input.systemPrompt, messagesHash }))
    .digest("hex");

  return `chat:${input.providerId}:${input.modelId}:${contextHash}`;
}
