# OpenAI (GPT)

**Faza în care a intrat:** F4 — al doilea provider, cel care justifică abstracția (vezi [`requirements.md` §7](../requirements.md#7-cerințe-pe-faze))
**Link către dashboard:** <https://platform.openai.com/>

## Ce face

Este **al doilea creier** din spatele conversației, cel care se alege de lângă
caseta de scris când vrei altă părere la aceeași întrebare. Nu înlocuiește
Anthropic: comutatorul din composer trimite mesajul următor la providerul ales,
iar restul aplicației (profilul, system prompt-ul, streamingul) rămâne identic.

Rostul lui e și didactic. O interfață de provider „schimbabilă" scrisă cu un
singur provider e o presupunere; abia al doilea arată dacă ține. Aici a ținut:
OpenAI a intrat cu o intrare în registru (`src/lib/providers.ts`) și o ramură în
`getModel` (`src/lib/providers.server.ts`). Composer-ul, preferințele și ruta de
chat n-au fost atinse.

Providerul e chemat tot prin **AI SDK-ul Vercel** (`ai` + `@ai-sdk/openai`), nu
prin SDK-ul OpenAI direct — vezi D-20. Fiecare provider vine cu propriul pachet,
scris de altă echipă, peste alt API HTTP; ce le face interschimbabile e că toate
expun aceeași formă către `streamText`.

## Cont & chei

- Unde se creează contul: <https://platform.openai.com/>
- Ce plan e necesar: **cont de dezvoltator cu credit preplătit**. Nu e același
  lucru cu un abonament ChatGPT Plus/Pro — acela e pentru aplicația de chat și
  **nu** dă acces la API. Sunt două facturi separate, iar confuzia asta e cea mai
  frecventă la primul apel: cheia pare validă, dar orice cerere cade pe lipsă de
  credit.
- Pași care nu sunt evidenți:
  - trebuie confirmat emailul și, la conturi noi, un număr de telefon;
  - cheia aparține unui **proiect** din organizație. Dacă ești în mai multe
    organizații sau proiecte, verifică sus ce ai selectat înainte să creezi
    cheia — altfel consumul se duce pe alt buget decât crezi;
  - creditul trebuie adăugat **înainte** de primul apel; nu există plată la
    sfârșitul lunii pentru conturile noi.
- De unde se generează cheia, pas cu pas:
  **platform.openai.com → API keys** (<https://platform.openai.com/api-keys>) →
  **Create new secret key** → îi dai un nume (ex. `skillforge-local`), alegi
  proiectul → **Create secret key**.
- Ce permisiuni sau scope i se dau: la creare se poate alege între **All**
  (implicit) și **Restricted**, unde se bifează pe resurse. Pentru SkillForge e
  de ajuns accesul de scriere la **Model capabilities** (apelurile de chat).
  Se poate pune și o **dată de expirare** — recomandat de OpenAI, și o idee bună
  pentru o cheie de curs care altfel rămâne validă la nesfârșit.
- **Se afișează o singură dată?** **Da.** Cheia e vizibilă integral doar în
  dialogul de creare. Dacă îl închizi fără s-o copiezi, nu mai poate fi
  recuperată — se șterge și se face alta.

## Variabile de mediu

| Variabilă de mediu | Ce conține                                   | Fișier       | Obligatorie                                 |
| ------------------ | -------------------------------------------- | ------------ | ------------------------------------------- |
| `OPENAI_API_KEY`   | Cheia de API a proiectului, citită pe server | `.env.local` | nu — fără ea, doar opțiunea OpenAI e oprită |

**Fără prefix `NEXT_PUBLIC_`.** Nu e un detaliu de stil: în Next, prefixul acela
e chiar mecanismul prin care o variabilă e inclusă în bundle-ul trimis
browserului. `NEXT_PUBLIC_OPENAI_API_KEY` ar publica cheia în codul pe care
oricine îl poate citi din DevTools, iar aplicația ar merge perfect — de asta e o
greșeală ușor de făcut și greu de observat.

Numele nu e ales de noi: `@ai-sdk/openai` citește singur exact `OPENAI_API_KEY`
din mediu, la fel cum `@ai-sdk/anthropic` citește `ANTHROPIC_API_KEY`. Nicăieri
în cod nu se pasează valoarea unei chei — codul verifică doar dacă variabila
există (`isProviderConfigured`), ca să dea un mesaj bun în loc de o eroare de
provider.

Rândul corespunzător, în `.env.example` (comentat, fără valoare):

```sh
# Al doilea provider de LLM (F4). Fără el, opțiunea OpenAI apare dezactivată,
# cu motivul scris — restul aplicației merge mai departe pe Anthropic.
# OPENAI_API_KEY=
```

**Variabila e opțională, prin construcție.** Fără ea, aplicația pornește,
compilează și răspunde normal pe Anthropic; în composer, opțiunea OpenAI apare
**dezactivată, cu motivul într-un tooltip** — nu dispare din listă, ca să nu
rămână întrebarea „de ce nu văd OpenAI?" fără răspuns.

## Pași manuali

Ce nu poate face agentul — se face o singură dată, de mână:

- **Adăugarea de credit**: **Settings → Billing → Add to credit balance**. Fără
  credit, cheia e validă dar orice apel eșuează cu 429, ceea ce în interfață
  arată ca „ai atins limita de cereri sau creditul contului".
- **Setarea unei limite de cheltuială**: **Settings → Limits**, unde se pun un
  prag de notificare și unul de oprire. Merită făcută înainte de prima rulare:
  e singurul lucru care oprește o buclă greșită din a cheltui necontrolat.
- **Dezactivarea reîncărcării automate**, dacă a fost pornită la adăugarea
  creditului — altfel limita de mai sus se reîncarcă singură.
- **Copierea cheii în `.env.local`** și repornirea serverului. Next citește
  fișierul la pornire — o cheie adăugată în timp ce `npm run dev` rulează nu e
  văzută până la restart. Semnul că ai uitat restartul: opțiunea rămâne
  dezactivată în composer, deși cheia e în fișier.
- **Adăugarea variabilei în Vercel**, pe **Production ȘI Preview**, urmată de
  **Redeploy** — vezi [`docs/vercel/README.md`](../vercel/README.md). Fără acest
  pas, comutatorul merge local și e mort pe linkul public, iar simptomul (o
  opțiune dezactivată) arată exact ca un bug de cod.
- **Rotația cheii** (dacă a ajuns într-un commit, într-un screenshot sau într-un
  chat): **API keys → Create new secret key**, pui cheia nouă peste tot, apoi
  **Delete** pe cea veche. Aici ordinea e invers decât la Anthropic: creezi
  întâi, ca aplicația să nu rămână fără cheie între cei doi pași. Dacă suspectezi
  o scurgere reală, ștergi prima. Locurile de actualizat în afară de
  `.env.local`: variabilele din Vercel și orice CI, dacă apare.

## Cost & limite

- **Model de tarifare:** per token, separat la intrare și la ieșire. Nu există
  abonament: plătești ce consumi.
- **Modelul folosit:** `gpt-5.6-luna` — vezi intrarea `openai` din
  [`src/lib/providers.ts`](../../src/lib/providers.ts), singurul loc unde sunt
  scrise id-ul și prețul lui. E ales ca echivalent de rol pentru Claude Haiku 4.5
  de pe cealaltă parte: tierul optimizat pentru volum și cost, ca să se compare două
  opțiuni comparabile ca preț, nu un model mic cu unul mare.

**Prețul care intră în registru** — aceleași cifre, cu aceeași dată, ca în
`pricing` din `src/lib/providers.ts`. Când se schimbă una, se schimbă amândouă,
în același commit:

| Model (folosit) | `modelId`      | Intrare / 1M tokeni | Ieșire / 1M tokeni | Verificat la |
| --------------- | -------------- | ------------------- | ------------------ | ------------ |
| GPT-5.6 Luna    | `gpt-5.6-luna` | $0,20               | $1,20              | 2026-09-16   |

Tier Standard, context scurt. Pagina mai listează, pentru același model: intrare din
cache $0,02, iar peste pragul de context lung $0,40 intrare / $1,80 ieșire.
Registrul ține doar prețul de bază, deci pe conversații foarte lungi costul afișat
de aplicație e o **aproximare**: OpenAI cachează automat prefixele repetate (mai
ieftin decât afișăm), dar peste pragul de context lung taxează mai scump (mai scump
decât afișăm). Pentru conversațiile obișnuite din SkillForge, cifra afișată e cea
de pe factură.

Pentru comparație (nefolosite în aplicație): `gpt-5.6-terra` $2 / $12,
`gpt-5.6-sol` $4 / $20 — verificate la 2026-09-14.

**Pentru a schimba modelul:** editezi `modelId`, `modelLabel` și `pricing` din
intrarea `openai` a registrului — toate trei. Eticheta de lângă composer și costul
de sub răspuns vin din același loc, deci nu pot minți despre cine a răspuns și cât
a costat.

- **Ce vede aplicația din cost (F4.2):** sub fiecare răspuns — tokenii raportați de
  OpenAI și costul calculat cu prețul de mai sus; în bara de sus — totalul
  conversației și cât din el e context retrimis. Un răspuns oprit cu „Stop" se
  plătește fără să aibă consum raportat.
- **Ce umflă factura exact aici:** ca la orice provider, API-ul e **fără stare**,
  deci la fiecare mesaj se retrimite **toată conversația** plus system prompt-ul —
  costul de intrare crește cu pătratul lungimii conversației. Comutarea de
  provider nu resetează nimic: istoricul plecat spre OpenAI e același istoric,
  facturat a doua oară, la tariful lui. Aplicația nu deduce „contextul retrimis"
  peste o comutare (alt tokenizer numără altfel) și afișează „—" acolo.
- **Limitele de cereri care ne pot afecta** (`gpt-5.6-luna`, pe tier de utilizare;
  tier-ul crește cu suma plătită):

  | Tier | Condiție       | Cereri / minut | Tokeni / minut |
  | ---- | -------------- | -------------- | -------------- |
  | 1    | $5 plătiți     | 500            | 500.000        |
  | 2    | $50 plătiți    | 5.000          | 2.000.000      |
  | 3    | $100 plătiți   | 5.000          | 4.000.000      |
  | 4    | $250 plătiți   | 10.000         | 10.000.000     |
  | 5    | $1.000 plătiți | 30.000         | 180.000.000    |

  Peste limită, API-ul răspunde `429` (cu antetele `x-ratelimit-*` și, uneori,
  `Retry-After`); tot `429` vine și la credit epuizat. În interfață: „Ai atins
  limita de cereri sau creditul contului OpenAI".

  Pentru un singur utilizator, nici tier-ul 1 nu e cel care ne oprește: **limita
  aplicației** (10 cereri pe minut, `src/lib/rate-limit.ts`) intervine cu mult
  înainte și are propriul mesaj („Pauză scurtă").

- **Ce e gratuit și până unde:** nimic garantat pentru conturi noi — se pornește
  de la creditul cumpărat.
- **Pagina oficială de prețuri:** <https://developers.openai.com/api/docs/pricing>
- **Pagina oficială de limite:** <https://developers.openai.com/api/docs/models/gpt-5.6-luna>
  (limitele per model) și <https://developers.openai.com/api/docs/guides/rate-limits>
  (tier-urile)
- **Verificat la data:** 2026-09-16
- **Unde se vede consumul curent:** platform.openai.com → **Usage** (tokeni și
  cost, pe zi, pe model și pe proiect) și **Settings → Billing** pentru creditul
  rămas. Tier-ul curent: **Settings → Limits**.

> Prețurile și numele de modele se schimbă. Id-ul de model și prețul se iau **din
> documentația curentă**, niciodată din memorie sau prin analogie: un id care
> sună plauzibil dar nu există dă un 404 care arată exact ca un bug de cod, iar un
> preț vechi dă un cost afișat greșit, fără nicio eroare.

## Verificare

1. Pune cheia în `.env.local` și **repornește** serverul: `npm run dev`.
2. Întreabă serverul ce știe despre provideri — răspunsul nu conține nicio
   cheie, doar verdictul:

   ```sh
   curl -s http://localhost:3000/api/providers
   ```

   Trebuie să vezi `"id":"openai","configured":true`.

3. În aplicație: apasă pe numele providerului de lângă caseta de scris. Lista
   trebuie să arate ambii provideri, fiecare **cu numele modelului dedesubt**.
   Alege OpenAI și trimite un mesaj — răspunsul curge la fel, iar eticheta de
   lângă casetă arată cine a răspuns.
4. Verificare din afara browserului, dacă vrei să vezi că providerul chiar se
   schimbă — aceeași întrebare, doi provideri:

   ```sh
   curl -N -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"providerId":"openai","modelId":"gpt-5.6-luna","messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"ce model esti?"}]}]}'
   ```

**Ce vezi dacă ceva nu e în regulă:**

| Situație                              | Ce apare                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cheia lipsește                        | Opțiunea e **dezactivată** în composer, cu „Lipsește OPENAI_API_KEY pe server". Trimis forțat: HTTP 400 |
| Cheia e în fișier, dar tot dezactivat | Ai uitat restartul serverului — Next citește `.env.local` doar la pornire                               |
| Cheia e greșită                       | „Cheia de API a fost refuzată de OpenAI. Verifică OPENAI_API_KEY în .env.local."                        |
| Credit epuizat / prea multe cereri    | „Ai atins limita de cereri sau creditul contului OpenAI. Încearcă din nou peste puțin."                 |
| `modelId` greșit                      | „Modelul gpt-5.6-luna nu există sau contul OpenAI nu are acces la el."                                  |
| Merge local, nu merge pe link         | Variabila lipsește din Vercel, sau a fost adăugată fără Redeploy — vezi Pașii manuali                   |
| Aceeași întrebare trimisă de două ori | A doua apare „din cache · … · 0,00 USD" — fără apel către OpenAI, fără cost                             |
| Prea multe cereri într-un minut       | Alertă „Pauză scurtă" cu ora de la care se poate trimite din nou (limita aplicației, nu a providerului) |

Mesajele astea sunt traduse în `onError` din
[`src/app/api/chat/route.ts`](../../src/app/api/chat/route.ts) și sunt compuse
din registru, nu scrise cu numele unui provider anume — de asta spun „OpenAI" și
„OPENAI_API_KEY" când vina e a lui, nu numele celuilalt provider. Eroarea brută a
SDK-ului rămâne doar în terminalul serverului: poate conține detalii de cont, și
nu are ce căuta pe ecran.
