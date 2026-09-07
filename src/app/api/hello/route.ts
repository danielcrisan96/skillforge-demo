// ACESTA E STRĂMOȘUL LUI src/app/api/chat/route.ts
//
// La pașii următori, pe exact același tip de rută, agentul SkillForge va chema
// modelul de limbaj și va întoarce răspunsul în streaming. Ruta de față nu face
// nimic spectaculos, dar repetă cele două lucruri de care depinde acel apel:
//
//   1. există un loc pe SERVER de unde se poate porni un apel către un provider;
//   2. cheia de API se citește dintr-o variabilă de mediu care nu ajunge la client.
//
// Un fișier numit `route.ts` sub `src/app/api/...` devine un Route Handler:
// o rută HTTP, nu o pagină. Numele funcției exportate ESTE metoda HTTP — `GET`
// de mai jos răspunde la GET. Pentru chat va fi `POST`, pentru că mesajele
// utilizatorului se trimit în corpul cererii, nu în URL.

// De ce `force-dynamic`:
// un handler GET care nu depinde de cerere poate fi prerandat la build, iar
// valorile citite din `process.env` ar rămâne înghețate din momentul acela. Aici
// vrem citirea la FIECARE cerere, ca schimbarea lui `.env.local` să se vadă fără
// rebuild. Ruta de chat va fi oricum dinamică (POST), dar mecanismul e același.
export const dynamic = "force-dynamic";

export async function GET() {
  // REGULA CENTRALĂ DE SECURITATE A PROIECTULUI
  //
  // În Next.js, o variabilă de mediu ajunge în browser DOAR dacă numele ei începe
  // cu `NEXT_PUBLIC_`. Fără prefix, ea există exclusiv în procesul de server:
  // Next nici măcar nu o include în bundle-ul trimis clientului.
  //
  // Aici e diferența față de Vite, unde regula e pe dos ca efect practic: acolo
  // orice variabilă `VITE_*` este INJECTATĂ în codul de client la build, deci
  // ajunge în sursa pe care oricine o poate citi din browser. Cine mută reflexul
  // de la Vite la Next fără să știe asta ajunge fie să nu-și găsească variabila,
  // fie — mult mai grav — să-și publice cheia.
  //
  // De asta cheia providerului de LLM se citește AICI, într-un Route Handler, și
  // niciodată în cod de client.
  const message = process.env.SKILLFORGE_DEMO_MESSAGE;

  // Cheia adevărată intră în scenă la pasul următor. O verificăm de pe acum, ca
  // să existe deja tiparul: se raportează DACĂ e configurată, niciodată valoarea.
  // O cheie afișată într-un răspuns JSON e o cheie publicată — chiar dacă
  // răspunsul pare intern, el se vede în tab-ul Network al oricui deschide
  // aplicația.
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

  if (!message) {
    // Mesaj de eroare care spune ce lipsește, fără să afișeze vreo valoare —
    // vezi docs/requirements.md §8.5.
    return Response.json(
      {
        error: "Lipsește variabila de mediu SKILLFORGE_DEMO_MESSAGE.",
        howToFix: "Copiază .env.example în .env.local și repornește `npm run dev`."
      },
      { status: 500 }
    );
  }

  // `Response.json` e API-ul web standard, disponibil direct în Route Handlers.
  //
  // Cheile răspunsului sunt în engleză, ca tot ce e cod: forma asta e un CONTRACT
  // între server și client, iar la pasul următor ea crește în contractul rutei de
  // chat. Doar textele afișate utilizatorului sunt în română.
  return Response.json({
    message,
    // Dovada că textul a fost produs pe server: ora e calculată în procesul de
    // server, nu în browser.
    generatedAt: new Date().toISOString(),
    // Doar starea cheii, nu cheia.
    hasAnthropicKey
  });
}
