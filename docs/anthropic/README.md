# Anthropic (Claude)

**Faza în care a intrat:** F1.4 — primul apel real către un model (vezi [`requirements.md` §7](../requirements.md#7-cerințe-pe-faze))
**Link către dashboard:** <https://platform.claude.com/>

## Ce face

Este creierul din spatele conversației. De la F1.4, ce scrii în chat pleacă la
`/api/chat`, de acolo la Claude, iar răspunsul se întoarce în streaming — bucată
cu bucată, prin exact protocolul SSE scris de mână la F1.3.

Providerul e chemat prin **AI SDK-ul Vercel** (`ai` + `@ai-sdk/anthropic`), nu
prin SDK-ul Anthropic direct. Motivul e D-4: providerul trebuie să fie
schimbabil, iar AI SDK-ul dă o interfață comună peste Anthropic și OpenAI, deci
al doilea provider (F4) nu cere rescrierea rutei.

## Cont & chei

- Unde se creează contul: <https://platform.claude.com/>
- Ce plan e necesar: **cont de dezvoltator cu credit preplătit**. Nu e același
  lucru cu un abonament Claude Pro/Max — acela e pentru aplicația de chat și
  **nu** dă acces la API. Contul nou primește un mic credit gratuit de test;
  după ce se termină, API-ul răspunde cu eroare până adaugi credit.
- Pași care nu sunt evidenți:
  - trebuie confirmat emailul și, la unele conturi, un număr de telefon;
  - cheia se creează **într-o organizație**; dacă ești în mai multe, verifică în
    stânga sus că ești în cea corectă, altfel cheia trage din creditul altcuiva.
- De unde se generează cheia, pas cu pas:
  **platform.claude.com → Settings → API keys → Create key** → îi dai un nume
  (ex. `skillforge-local`) → **Add**.
- Ce permisiuni sau scope i se dau: cheile obișnuite de API au acces la Messages
  API, adică tot ce ne trebuie. Nu e nevoie de cheie de tip **Admin**.
- **Se afișează o singură dată?** **Da.** Cheia e vizibilă integral doar la
  creare. Dacă închizi dialogul fără s-o copiezi, nu mai poate fi recuperată — se
  șterge și se face alta.

## Variabile de mediu

| Variabilă de mediu  | Ce conține                                    | Fișier       | Obligatorie                   |
| ------------------- | --------------------------------------------- | ------------ | ----------------------------- |
| `ANTHROPIC_API_KEY` | Cheia de API a organizației, citită pe server | `.env.local` | da, pentru a primi răspunsuri |

**Fără prefix `NEXT_PUBLIC_`.** Nu e un detaliu de stil: în Next, prefixul acela
e chiar mecanismul prin care o variabilă e inclusă în bundle-ul trimis
browserului. `NEXT_PUBLIC_ANTHROPIC_API_KEY` ar publica cheia în codul pe care
oricine îl poate citi din DevTools, iar aplicația ar merge perfect — de asta e o
greșeală ușor de făcut și greu de observat.

Rândul corespunzător, în `.env.example` (comentat, fără valoare):

```sh
# Cheia providerului de LLM. Fără ea, /api/chat răspunde cu 400 și un mesaj clar.
# ANTHROPIC_API_KEY=
```

Aplicația **compilează și pornește fără cheie** — `npm run build` trece pe orice
calculator. Doar conversația nu funcționează, și spune de ce.

## Pași manuali

Ce nu poate face agentul — se face o singură dată, de mână:

- **Adăugarea de credit**: Settings → Billing → adaugi un card și cumperi credit.
  Fără credit, cheia e validă dar orice apel eșuează.
- **Setarea unei limite de cheltuială**: Settings → Billing → **Spend limits**.
  Merită făcută înainte de prima rulare: e singurul lucru care oprește o buclă
  greșită din a cheltui necontrolat. Poți pune și o alertă pe email la un prag.
- **Copierea cheii în `.env.local`** și repornirea serverului. Next citește
  fișierul la pornire — o cheie adăugată în timp ce `npm run dev` rulează nu e
  văzută până la restart.
- **Rotația cheii** (dacă a ajuns într-un commit, într-un screenshot sau într-un
  chat): Settings → API keys → **Delete** pe cea veche, apoi **Create key**.
  Ordinea contează — ștergi întâi, ca una compromisă să nu mai poată fi
  folosită. Locurile unde mai trebuie actualizată în afară de `.env.local`:
  variabilele de mediu din Vercel (vezi [`docs/vercel/README.md`](../vercel/README.md))
  și orice CI, dacă apare.

## Cost & limite

- **Model de tarifare:** per token, separat la intrare și la ieșire. Nu există
  abonament: plătești ce consumi.
- **Modelul folosit de aplicație:** `claude-haiku-4-5` (Claude Haiku 4.5) — vezi
  intrarea `anthropic` din [`src/lib/providers.ts`](../../src/lib/providers.ts),
  singurul loc unde sunt scrise id-ul și prețul lui.

**Prețul care intră în registru** — aceleași cifre, cu aceeași dată, ca în
`pricing` din `src/lib/providers.ts`. Când se schimbă una, se schimbă amândouă,
în același commit:

| Model (folosit)  | `modelId`          | Intrare / 1M tokeni | Ieșire / 1M tokeni | Verificat la |
| ---------------- | ------------------ | ------------------- | ------------------ | ------------ |
| Claude Haiku 4.5 | `claude-haiku-4-5` | $1                  | $5                 | 2026-09-16   |

Pentru comparație (nefolosite în aplicație, aceeași pagină, aceeași dată): Claude
Sonnet 5 $2 / $10, Claude Opus 5 $5 / $25. **Pentru a schimba modelul:** editezi
`modelId`, `modelLabel` și `pricing` din intrarea `anthropic` a registrului — toate
trei, altfel aplicația afișează costul modelului vechi pentru răspunsurile celui
nou.

- **Ce vede aplicația din cost (F4.2):** sub fiecare răspuns — tokenii raportați de
  Anthropic și costul calculat cu prețul de mai sus; în bara de sus — totalul
  conversației și cât din el e context retrimis. Nu e factura: prompt caching-ul
  Anthropic nu e activat în SkillForge, deci nu apar tarifele de cache, iar un
  răspuns oprit cu „Stop" se plătește fără să aibă consum raportat.
- **Ce umflă factura exact aici:** API-ul e **fără stare**, deci la fiecare mesaj
  se retrimite **toată conversația** plus system prompt-ul. Costul de intrare al
  unei conversații crește cu pătratul lungimii ei — ponderea „context retrimis"
  din bara de sus arată asta pe conversația ta.
- **Limitele de cereri care ne pot afecta** (Messages API, Claude Haiku 4.5,
  limitele standard ale tier-urilor):

  | Tier  | Cereri / minut | Tokeni intrare / minut | Tokeni ieșire / minut |
  | ----- | -------------- | ---------------------- | --------------------- |
  | Start | 1.000          | 2.000.000              | 400.000               |
  | Build | 5.000          | 5.000.000              | 1.000.000             |
  | Scale | 10.000         | 10.000.000             | 2.000.000             |

  Organizațiile noi pot porni într-un tier de evaluare, **sub** aceste cifre, până
  își construiesc istoricul. Peste limită, API-ul răspunde `429` cu antet
  `retry-after`; peste plafonul lunar de cheltuieli al tier-ului (Start: $500),
  tot `429`, dar fără `retry-after`, până la începutul lunii următoare. În
  interfață ambele apar ca „Ai atins limita de cereri sau creditul contului
  Anthropic".

  Pentru un singur utilizator, limitele Anthropic nu sunt cele care ne opresc:
  **limita aplicației** (10 cereri pe minut, `src/lib/rate-limit.ts`) intervine cu
  mult înainte și are propriul mesaj („Pauză scurtă").

- **Ce e gratuit și până unde:** creditul mic primit la înregistrare.
- **Pagina oficială de prețuri:** <https://platform.claude.com/docs/en/about-claude/pricing>
- **Pagina oficială de limite:** <https://platform.claude.com/docs/en/api/rate-limits>
- **Verificat la data:** 2026-09-16
- **Unde se vede consumul curent:** platform.claude.com → **Usage** (tokeni și
  cost, pe zi și pe model) și **Billing** pentru creditul rămas. Tier-ul curent și
  limitele exacte ale contului: **Settings → Limits**.

## Verificare

1. Pune cheia în `.env.local` și pornește: `npm run dev`.
2. Scrie ceva în chat și apasă Enter. Trebuie să vezi întâi indicatorul „scrie…",
   apoi textul apărând **bucată cu bucată**, nu dintr-o dată. Butonul de trimitere
   devine „Stop" cât timp curge.
3. Verificare din afara browserului, dacă vrei să vezi protocolul brut:

   ```sh
   curl -N -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"salut"}]}]}'
   ```

   Răspunsul e `text/event-stream`, cu evenimente `data: {...}` și `data: [DONE]`
   la final — același format ca la F1.3.

**Ce vezi dacă ceva nu e în regulă:**

| Situație                              | Ce apare                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cheia lipsește                        | HTTP 400 și, în interfață: „Cheia de API nu e configurată. Adaugă ANTHROPIC_API_KEY în .env.local…"     |
| Cheia e greșită                       | „Cheia de API a fost refuzată de Anthropic. Verifică ANTHROPIC_API_KEY în .env.local."                  |
| Credit epuizat / prea multe cereri    | „Ai atins limita de cereri sau creditul contului Anthropic. Încearcă din nou peste puțin."              |
| `modelId` greșit                      | „Modelul cerut nu există sau contul nu are acces la el."                                                |
| Aceeași întrebare trimisă de două ori | A doua apare „din cache · … · 0,00 USD" — fără apel către Anthropic, fără cost                          |
| Prea multe cereri într-un minut       | Alertă „Pauză scurtă" cu ora de la care se poate trimite din nou (limita aplicației, nu a providerului) |

Mesajele astea sunt traduse în `onError` din
[`src/app/api/chat/route.ts`](../../src/app/api/chat/route.ts). Eroarea brută a
SDK-ului rămâne doar în terminalul serverului — poate conține detalii de cont, și
nu are ce căuta pe ecran.
