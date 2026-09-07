import { anthropic } from "@ai-sdk/anthropic";
import { APICallError, convertToModelMessages, streamText, type UIMessage } from "ai";

import { DEFAULT_MODEL_ID } from "@/lib/providers";

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

export const runtime = "nodejs";

/**
 * Ce trimite clientul: mesajele în formatul de UI.
 *
 * Sunt DOUĂ formate de mesaj în joc, iar confuzia dintre ele e capcana clasică
 * a pasului. `UIMessage` descrie ce se AFIȘEAZĂ — are `id` (React are nevoie de
 * el la randare) și `parts`, o listă de bucăți tipate: text, raționament, apel
 * de unealtă. `ModelMessage` descrie ce se TRIMITE modelului și nu conține
 * nimic din ce ține de afișare.
 *
 * `convertToModelMessages` face traducerea. Trimis direct, un `UIMessage` ar
 * duce la provider câmpuri pe care acesta nu le înțelege.
 */
type ChatRequestBody = {
  messages: UIMessage[];
};

export async function POST(request: Request) {
  // Cheia se citește AICI, în handler, nu la nivel de modul.
  //
  // Diferența nu e cosmetică. Un `throw` scris lângă `import`-uri se execută
  // când Next încarcă fișierul — inclusiv în timpul lui `next build`. Rezultat:
  // proiectul n-ar mai compila pe niciun calculator fără `.env.local`, deci
  // nimeni n-ar putea nici măcar să-l pornească ca să vadă despre ce e vorba.
  // Citită în handler, lipsa cheii afectează un singur request.
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // 400, nu 500.
    //
    // 500 înseamnă „serverul s-a stricat" și trimite omul să caute un bug care
    // nu există. Cheia lipsă e o CONFIGURARE incompletă, adică o cerere pe care
    // serverul refuză s-o onoreze — și e ceva ce utilizatorul poate repara.
    // Textul spune numele variabilei și fișierul, niciodată vreo valoare.
    return Response.json(
      {
        error:
          "Cheia de API nu e configurată. Adaugă ANTHROPIC_API_KEY în .env.local și repornește serverul (vezi docs/anthropic/README.md)."
      },
      { status: 400 }
    );
  }

  const { messages }: ChatRequestBody = await request.json();

  const result = streamText({
    // Modelul vine din registru, nu scris aici. Vezi `src/lib/providers.ts`
    // pentru de ce id-ul de model are voie să existe într-un singur loc.
    //
    // Cheia nu se pasează explicit: providerul citește singur
    // `ANTHROPIC_API_KEY` din mediu. Verificarea de mai sus există ca să dăm un
    // mesaj bun ÎNAINTE să ajungem aici, nu ca să transportăm noi secretul.
    model: anthropic(DEFAULT_MODEL_ID),

    // `await`: în AI SDK 7 conversia e ASINCRONĂ, fiindcă unele părți de mesaj
    // (fișiere, atașamente) pot avea nevoie să fie descărcate. Fără `await`, în
    // `messages` ar ajunge un `Promise` — TypeScript prinde greșeala, dar în
    // JavaScript simplu ar fi trecut și ar fi eșuat abia la provider.
    messages: await convertToModelMessages(messages)
  });

  return result.toUIMessageStreamResponse({
    /**
     * Traducerea erorilor de provider în text citibil.
     *
     * Două motive, ambele serioase. Primul: mesajul brut al SDK-ului poate
     * conține detalii de cont — id-uri de organizație, limite, uneori fragmente
     * din cerere. Trimis în interfață, ajunge în fața oricui deschide aplicația.
     * Al doilea: „AI_APICallError: 401" nu-i spune nimic omului care trebuie să
     * repare configurarea.
     *
     * Ce se întoarce de aici ajunge în `error` din `useChat`. Cheia nu se
     * loghează niciodată — nici aici, nici altundeva.
     */
    onError: error => {
      // Loghează pe server forma completă (utilă la depanare), fără să o
      // trimită mai departe. `console.error` scrie în terminalul serverului,
      // nu în browser.
      console.error("Apelul către provider a eșuat:", error);

      // Ramificare pe STATUS, prin tipul de eroare al SDK-ului — nu pe textul
      // mesajului.
      //
      // Tentația e să scrii `error.message.includes("401")`. Nu merge: pentru o
      // cheie greșită, mesajul e „API key is invalid." și nu conține nicăieri
      // numărul. Textele se schimbă între versiuni și sunt traduse de provider;
      // codul HTTP nu.
      if (APICallError.isInstance(error)) {
        switch (error.statusCode) {
          case 401:
          case 403:
            return "Cheia de API a fost refuzată de Anthropic. Verifică ANTHROPIC_API_KEY în .env.local.";
          case 429:
            return "Ai atins limita de cereri sau creditul contului Anthropic. Încearcă din nou peste puțin.";
          case 404:
            return "Modelul cerut nu există sau contul nu are acces la el. Vezi modelId din src/lib/providers.ts.";
        }
      }

      return "Apelul către model a eșuat. Detaliile complete sunt în terminalul serverului.";
    }
  });
}
