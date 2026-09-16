// Limitarea numărului de cereri pe minut către ruta de chat. RULEAZĂ DOAR PE SERVER.
//
// ⚠️ E o protecție de BUN-SIMȚ, nu o măsură de securitate. Motivele, concret:
// - contorul stă în memoria procesului, deci pe un serviciu cu mai multe instanțe
//   (Vercel pornește câte instanțe are nevoie) fiecare instanță numără SEPARAT —
//   limita reală poate fi de N ori mai mare decât cea scrisă aici;
// - la repornire (deploy, cold start, salvare de fișier în `next dev`) contorul
//   se resetează;
// - clientul e identificat după IP-ul din `x-forwarded-for`, pe care un atacator
//   îl poate varia, iar în spatele unui NAT mai mulți oameni au același IP.
//
// Ce face bine, totuși: oprește cazul pentru care există — cineva care ține
// apăsat pe „mai încearcă" sau un script scăpat de sub control nu mai golește
// creditul contului în câteva minute. O limită reală, partajată între instanțe,
// cere un depozit extern (Redis/KV) — și atunci devine integrare, cu doc propriu.

export const CHAT_RATE_LIMIT = {
  /**
   * 10 pe minut: mult peste ce scrie un om care chiar citește răspunsurile, dar
   * suficient de jos încât o buclă să se oprească după câțiva cenți. Limitele
   * providerilor sunt de ordinul sutelor sau miilor pe minut (vezi docs/anthropic
   * și docs/openai) — deci nu ele ne protejează creditul, ci asta.
   */
  maxRequests: 10,
  windowMs: 60_000
} as const;

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      /** Câte secunde până se eliberează un loc — pentru antetul `Retry-After`. */
      retryAfterSeconds: number;
      /**
       * MOMENTUL (ISO, UTC) de la care se poate reîncerca. Absolut, nu relativ:
       * interfața îl formatează în ora locală a utilizatorului, iar textul rămâne
       * corect oricând e citit — „peste 40 de secunde" ar minți după un minut.
       */
      retryAt: string;
    };

/**
 * Pentru fiecare client, momentele cererilor din ultima fereastră.
 *
 * Fereastră GLISANTĂ (listă de momente), nu fereastră fixă („minutul 14:03"): la
 * fereastra fixă, 10 cereri la 14:03:59 și încă 10 la 14:04:00 ar trece toate, adică
 * 20 într-o secundă. Costul în memorie e mic — cel mult `maxRequests` numere per client.
 */
const requestLog = new Map<string, number[]>();

export function checkRateLimit(clientKey: string, now: number = Date.now()): RateLimitResult {
  const { maxRequests, windowMs } = CHAT_RATE_LIMIT;
  const recent = (requestLog.get(clientKey) ?? []).filter(timestamp => timestamp > now - windowMs);

  if (recent.length >= maxRequests) {
    requestLog.set(clientKey, recent);
    // Se eliberează un loc când cea mai veche cerere din fereastră iese din ea.
    const freedAt = recent[0] + windowMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((freedAt - now) / 1000)),
      retryAt: new Date(freedAt).toISOString()
    };
  }

  // O cerere refuzată NU se înregistrează: altfel, cine insistă și-ar prelungi
  // singur blocarea la nesfârșit, iar momentul afișat în interfață ar fi fals.
  recent.push(now);
  requestLog.set(clientKey, recent);
  sweepExpired(now);
  return { allowed: true };
}

/**
 * Curățenie ocazională: fără ea, fiecare IP văzut vreodată ar rămâne în `Map`
 * pentru totdeauna. Rulează doar când lista e mare, ca să nu parcurgă toată
 * memoria la fiecare cerere.
 */
function sweepExpired(now: number) {
  if (requestLog.size < 1000) return;
  for (const [key, timestamps] of requestLog) {
    if (timestamps.every(timestamp => timestamp <= now - CHAT_RATE_LIMIT.windowMs)) requestLog.delete(key);
  }
}

/**
 * Cine face cererea. Primul IP din `x-forwarded-for` — pe Vercel, antetul e pus
 * de platformă. Local nu există, deci toate cererile cad pe aceeași cheie, ceea ce
 * pentru un singur dezvoltator e exact comportamentul corect.
 */
export function clientKeyFromRequest(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "local";
}
