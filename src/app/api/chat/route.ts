import { APICallError, convertToModelMessages, streamText, type UIMessage } from "ai";

import { buildSystemPrompt } from "@/lib/system-prompt";
import { PROVIDERS, resolveProviderId } from "@/lib/providers";
import { getModel, isProviderConfigured } from "@/lib/providers.server";

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
};

export async function POST(request: Request) {
  const { messages, profile, providerId, modelId }: ChatRequestBody = await request.json();

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
