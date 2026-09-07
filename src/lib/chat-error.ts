/**
 * Textul de eroare care se arată utilizatorului.
 *
 * De ce e nevoie de funcția asta, deși ruta trimite deja un mesaj frumos:
 * pentru că cele două căi de eroare arată diferit, iar una dintre ele trece
 * printr-un loc care nu știe ce e JSON.
 *
 * 1. Eroare ÎN TIMPUL streamului (cheie refuzată, rate limit): trece prin
 *    `onError` din rută și ajunge aici deja ca text curat.
 * 2. Eroare ÎNAINTE de stream (răspuns 400, cazul „cheia lipsește"): SDK-ul
 *    face `new Error(await response.text())` — adică ia CORPUL BRUT al
 *    răspunsului și îl pune ca mesaj. Corpul nostru e JSON, deci fără funcția
 *    asta utilizatorul ar citi pe ecran `{"error":"Cheia de API nu e ..."}`,
 *    acolade cu tot.
 *
 * Nu schimbăm forma răspunsului rutei ca să evităm asta: un endpoint care
 * întoarce JSON pentru erori e contractul corect, iar dezambalarea e treaba
 * clientului.
 */
export function chatErrorMessage(error: Error): string {
  const raw = error.message.trim();

  if (raw.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
        const { error: message } = parsed as { error: unknown };
        if (typeof message === "string" && message.length > 0) return message;
      }
    } catch {
      // Nu era JSON valid, deși începea cu `{`. Cade pe textul brut de mai jos —
      // mai bine un mesaj ciudat decât niciunul.
    }
  }

  return raw || "Ceva n-a mers, dar serverul n-a spus ce.";
}
