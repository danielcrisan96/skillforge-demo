/**
 * Ce fel de eroare e. Interfața alege aspectul după tip, dintr-un registru
 * (vezi `message-list.tsx`), nu dintr-un lanț de `if`-uri pe textul mesajului.
 *
 * „rate-limit" e separat pentru că NU e o defecțiune: e aplicația care se
 * protejează singură. Afișată cu roșu și „nu a putut fi generat", ar părea că s-a
 * stricat ceva — și omul ar apăsa din nou, exact ce limita încearcă să oprească.
 *
 * „unauthenticated" e separat din același motiv: fără cont, refuzul e comportamentul
 * CORECT al serverului, nu o eroare. Omul are nevoie de un pas („conectează-te"),
 * nu de un triunghi roșu.
 */
export type ChatErrorKind = "rate-limit" | "unauthenticated" | "error";

export type ChatErrorDescription = {
  kind: ChatErrorKind;
  message: string;
};

/**
 * Textul de eroare care se arată utilizatorului, plus tipul lui.
 *
 * De ce e nevoie de funcția asta, deși ruta trimite deja un mesaj frumos:
 * pentru că cele două căi de eroare arată diferit, iar una dintre ele trece
 * printr-un loc care nu știe ce e JSON.
 *
 * 1. Eroare ÎN TIMPUL streamului (cheie refuzată, limită la provider): trece
 *    prin `onError` din rută și ajunge aici deja ca text curat.
 * 2. Eroare ÎNAINTE de stream (400 „cheia lipsește", 429 „prea multe cereri"):
 *    SDK-ul face `new Error(await response.text())` — adică ia CORPUL BRUT al
 *    răspunsului și îl pune ca mesaj. Corpul nostru e JSON, deci fără funcția
 *    asta utilizatorul ar citi pe ecran `{"error":"..."}`, acolade cu tot.
 *
 * Nu schimbăm forma răspunsului rutei ca să evităm asta: un endpoint care
 * întoarce JSON pentru erori e contractul corect, iar dezambalarea e treaba
 * clientului.
 *
 * Tipul se deduce din FORMA corpului (`retryAt` sau `reason` prezent), nu din cod: SDK-ul
 * nu păstrează statusul HTTP pe eroarea pe care o aruncă, iar ghicitul din text
 * s-ar strica la prima reformulare a mesajului.
 */
export function describeChatError(error: Error): ChatErrorDescription {
  const raw = error.message.trim();

  if (raw.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
        const { error: message, retryAt, reason } = parsed as { error: unknown; retryAt?: unknown; reason?: unknown };
        if (typeof message === "string" && message.length > 0) {
          if (reason === "unauthenticated") return { kind: "unauthenticated", message };
          const retryTime = typeof retryAt === "string" ? formatRetryTime(retryAt) : null;
          if (retryTime) {
            return { kind: "rate-limit", message: `${message} Poți trimite din nou de la ora ${retryTime}.` };
          }
          return { kind: "error", message };
        }
      }
    } catch {
      // Nu era JSON valid, deși începea cu `{`. Cade pe textul brut de mai jos —
      // mai bine un mesaj ciudat decât niciunul.
    }
  }

  return { kind: "error", message: raw || "Ceva n-a mers, dar serverul n-a spus ce." };
}

/**
 * Momentul reîncercării, în ora LOCALĂ a utilizatorului. Serverul trimite un
 * moment absolut (ISO, UTC) tocmai ca formatarea să se facă aici, unde se știe
 * fusul orar. O dată invalidă nu produce „Invalid Date" pe ecran — doar lipsește.
 */
function formatRetryTime(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
