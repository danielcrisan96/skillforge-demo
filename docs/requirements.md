# SkillForge — Cerințe

> **Acest fișier este sursa de adevăr pentru ce construim.**
> Orice decizie luată pe parcurs se scrie aici, nu doar în conversație. Vezi [Cum se modifică acest document](#11-cum-se-modifică-acest-document).

Ultima actualizare: 2026-09-09

---

## 1. Ce este SkillForge

SkillForge este un **copilot personal de skills și carieră**: o aplicație web în care un agent AI îți cunoaște profilul real — stack-ul cu care lucrezi, skill-urile tale și nivelul la fiecare, obiectivul spre care mergi — și îți răspunde **în contextul tău**, propunându-ți pași concreți de învățare spre acel obiectiv.

Profilul nu se re-explică la fiecare conversație: el este salvat, crește în timp și devine baza fiecărui răspuns.

Aplicația este în același timp **proiectul-fir-roșu al unui curs**: se construiește modul cu modul, iar fiecare modul adaugă o bucată reală de integrare între un LLM și o interfață web — nu un exemplu de o singură pagină.

## 2. Pentru cine

Pentru oricine vrea să crească profesional și are nevoie de un plan, indiferent din ce direcție vine:

| Persona                | Punct de plecare                        | Obiectiv tipic                     |
| ---------------------- | --------------------------------------- | ---------------------------------- |
| Backend spre AI        | Java/C#/Go, ani de experiență pe server | Web modern + AI engineering        |
| Frontend care lărgește | React/TypeScript solid                  | Python sau Java, partea de backend |
| QA spre automatizare   | Testare manuală, cunoștințe de domeniu  | Automatizare, CI, cod de test      |
| Junior nedecis         | Bazele, fără direcție clară             | Să afle ce merită aprofundat       |

**Numitorul comun nu este tehnologia, ci faptul că fiecare pornește din alt punct spre alt obiectiv.** De aici greutatea disproporționată pe care o are profilul în această aplicație: fără el, orice răspuns este generic; cu el, același model dă un răspuns util.

## 3. De ce nu e suficient un chat generic

Într-un chat obișnuit:

- sfaturile sunt **generice** — nu știe ce știi deja, deci îți repetă lucruri învățate sau sare peste lipsuri reale;
- **uită între sesiuni** cine ești — profilul se re-explică de fiecare dată, cu alte cuvinte, deci și răspunsurile diferă;
- **progresul nu se acumulează** — nu există noțiunea de „am terminat modulul ăsta, ce urmează".

SkillForge există ca să fie **unealta ta**: profilul persistă, se actualizează pe măsură ce înveți, iar aplicația este a ta, online, nu un tab de chat.

## 4. Ce NU este

- **Nu e o clonă de ChatGPT.** Chatul e interfața, nu produsul. Produsul e agentul care lucrează cu profilul tău.
- **Nu e o platformă de cursuri.** Nu găzduiește lecții și nu livrează conținut educațional propriu; recomandă direcții și pași.
- **Nu e un job board.** Nu caută locuri de muncă și nu face matching cu anunțuri.
- **Nu e un tracker de task-uri.** Planul de învățare e un rezultat al conversației, nu un sistem de project management.

## 5. Cazuri canonice de utilizare

Acestea sunt întrebările la care aplicația trebuie să răspundă bine. Ele se folosesc mai târziu ca **teste de acceptanță** — la fiecare fază verificăm dacă răspunsul s-a îmbunătățit față de faza anterioară.

**UC-1 — Analiză de lipsuri (gap analysis)**

> „Ce-mi lipsește ca să trec de la Java backend la AI engineer?"

Răspunsul bun pornește de la skill-urile din profil și numește ce lipsește **raportat la ele**, nu o listă generică de subiecte.

**UC-2 — Plan pe termen determinat**

> „Fă-mi un plan de 3 luni pentru Next.js + AI SDK."

Răspunsul bun ține cont de nivelul curent și de timpul disponibil, și produce pași concreți, ordonați.

**UC-3 — Continuitate între sesiuni**

> „Ține minte că am terminat modulul de streaming — ce urmează?"

Răspunsul bun presupune că aplicația reține informația și că **următoarea sesiune** o folosește fără să i se reamintească.

## 6. Decizii de arhitectură fixate

Aceste decizii sunt luate și nu se redeschid la fiecare modul. Dacă una se schimbă, se schimbă **aici**.

| #    | Decizie                                                                                                        | De ce                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | **În centru stă un agent**, nu un formular care trimite text la model și afișează rezultatul                   | Agentul primește context (profil, memorie) și, din faza F5, decide singur să folosească unelte. Această diferență dictează structura codului de la început.                                                                                                                                                                                                                                                                                                                                              |
| D-2  | **Next.js + TypeScript (strict)**                                                                              | Un singur proiect care conține și UI-ul, și codul de server. TypeScript pentru că tipurile care traversează granița client/server (profil, mesaje, contract de provider) trebuie să fie explicite, nu presupuse.                                                                                                                                                                                                                                                                                         |
| D-3  | **Modelul se cheamă exclusiv de pe server**                                                                    | Cheia de API nu ajunge niciodată în browser. Orice cod care atinge o cheie trăiește în partea de server.                                                                                                                                                                                                                                                                                                                                                                                                 |
| D-4  | **Provider de LLM schimbabil**, în spatele unei interfețe tipizate                                             | Ca să putem compara răspunsuri și costuri între Anthropic și OpenAI fără să rescriem aplicația.                                                                                                                                                                                                                                                                                                                                                                                                          |
| D-5  | **Răspuns în streaming**                                                                                       | Cerință de UX, nu detaliu tehnic: un plan de învățare e un răspuns lung, iar așteptarea în gol face aplicația să pară blocată.                                                                                                                                                                                                                                                                                                                                                                           |
| D-6  | **System prompt construit din profilul real**                                                                  | Este mecanismul prin care „răspunde în contextul meu" devine concret.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D-7  | **Un singur profil acum, `userId` în model de la început**                                                     | Faza 1 nu are login, dar datele se modelează ca și cum ar avea. Autentificarea (F6) devine astfel un modul adăugat, nu o rescriere.                                                                                                                                                                                                                                                                                                                                                                      |
| D-8  | **Fără chei reale în documentație** — doar numele variabilelor                                                 | Documentația se comite în git; cheile nu.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D-9  | **Orice element de UI vine din shadcn/ui** (`src/components/ui/`), nu scris de mână                            | shadcn copiază codul în proiect, deci rămâne modificabil. Câștigul real e consistența stărilor ușor de uitat: focus la navigarea cu tastatura, `disabled`, contrast în tema întunecată.                                                                                                                                                                                                                                                                                                                  |
| D-10 | **Formatarea e fixată de Prettier**, cu setările comise în repo                                                | Fără ele, diferențele dintre commit-uri ar fi spații și ghilimele, nu cod — iar la doi oameni cu editoare diferite, fiecare salvare ar rescrie fișierul.                                                                                                                                                                                                                                                                                                                                                 |
| D-11 | **Blocul de reguli scris de `next dev` stă în `AGENTS.md`**                                                    | `next dev` își (re)adaugă singur un bloc de instrucțiuni pentru agenți. Îl scrie într-un singur fișier și îl preferă pe `AGENTS.md` dacă acesta îl conține deja — așa `CLAUDE.md` rămâne pur generat, iar scriptul de sync nu se bate cu Next pe același fișier.                                                                                                                                                                                                                                         |
| D-12 | **Starea aplicației în Zustand cu `persist`** (`localStorage`, cheia `skillforge-app`)                         | Aceleași date sunt citite din trei locuri neînrudite în arbore (sidebar, preferințe, chat); prin props ar fi însemnat componente intermediare care car date de care nu le pasă. `persist` există ca lista de conversații să supraviețuiască unui refresh înainte să existe o bază de date.                                                                                                                                                                                                               |
| D-13 | **UI exclusiv din shadcn/ui + Tailwind; iconițe exclusiv din `lucide-react`**                                  | Zero CSS scris de mână și o singură sursă de iconițe. Extinde D-9: consecvența se obține din constrângere, nu din disciplină.                                                                                                                                                                                                                                                                                                                                                                            |
| D-14 | **Datele inventate stau doar în `src/lib/mock/`**                                                              | Ca înlocuirea lor cu date reale să fie o singură atingere, nu o vânătoare prin componente. Corolar: niciun text inventat nu se scrie direct într-un component.                                                                                                                                                                                                                                                                                                                                           |
| D-15 | **Tema se schimbă doar din preferințe**, nu dintr-un buton în bara de sus                                      | Tema e o preferință, nu o acțiune repetată. Bara de sus rămâne pentru conversație. Preferința („sistem"/„light"/„dark") e ținută separat de tema efectivă, ca „sistem" să poată urmări în timp real sistemul de operare.                                                                                                                                                                                                                                                                                 |
| D-16 | **Interfața completă, pe date inventate, ÎNAINTE de integrarea cu un model**                                   | Cu apelurile la LLM pe primul loc, timpul se duce în chei și streaming, iar aplicația nu există încă. Ordinea asta dă o versiune publicabilă peste care integrarea e o schimbare izolată — și mută deployul (inițial în F7) mai devreme, ca plasă de siguranță.                                                                                                                                                                                                                                          |
| D-17 | **Protocolul server→client e SSE** (`text/event-stream`), nu WebSocket și nu polling                           | Fluxul e într-un singur sens: serverul trimite, clientul ascultă. SSE e exact atât — merge peste HTTP obișnuit, trece prin proxy-uri și se reconectează singur. WebSocket ar aduce bidirecționalitate de care nu avem nevoie, plus o conexiune de întreținut; pollingul ar însemna ca clientul să întrebe repetat, simplu dar risipitor. E și protocolul folosit de providerii de LLM, deci nu se schimbă la pasul următor.                                                                              |
| D-18 | **Payload-ul fiecărui eveniment SSE se codează cu `JSON.stringify`**                                           | În SSE, rândul gol e separatorul de evenimente. Un text care conține el însuși linii noi — și răspunsurile conțin, au paragrafe — ar rupe protocolul: clientul ar vedea două evenimente unde s-a trimis unul. Codat, orice linie nouă devine două caractere obișnuite, iar clientul face `JSON.parse`.                                                                                                                                                                                                   |
| D-19 | **Mesajele conversației deschise aparțin lui `useChat`; store-ul ține doar lista de conversații**              | Două locuri care țin aceleași mesaje se desincronizează garantat: în timpul streamului sosesc zeci de actualizări pe secundă, iar al doilea deținător rămâne în urmă fără ca nimic să semnaleze asta. Alegerea trebuie să fie explicită. Consecința — transcrierea nu supraviețuiește unui refresh — e acceptată aici pentru că persistarea istoricului e chiar ce livrează F3, cu o bază de date, nu cu `localStorage`.                                                                                 |
| D-20 | **Providerul se cheamă prin AI SDK-ul Vercel** (`ai` + `@ai-sdk/anthropic`), nu prin SDK-ul Anthropic direct   | E fix mecanismul cerut de D-4: o interfață comună peste Anthropic și OpenAI, deci al doilea provider (F4) nu cere rescrierea rutei. Bonus pedagogic: `toUIMessageStreamResponse()` scrie **același SSE** pe care l-am scris de mână la F1.3 — se vede cu `curl` că sub `useChat` nu e nicio magie.                                                                                                                                                                                                       |
| D-21 | **Puntea de export** (`src/lib/active-conversation-bridge.ts`) **nu e o a doua sursă de adevăr** pentru mesaje | Header-ul (unde stă exportul) e un component FRATE cu `Chat`, nu descendentul lui — nu poate primi mesajele prin props sau context de sus în jos, iar D-19 interzice ținerea lor în store. Soluția: un modul scris de `chat.tsx` la fiecare schimbare de `messages`, citit de header o SINGURĂ dată — în clipa apăsării butonului de export, nu printr-un abonament reactiv. Fără nimic randat pe baza valorii, nu există ce să se desincronizeze: la următorul export se citește oricum starea curentă. |

## 7. Cerințe pe faze

Fiecare fază are un **scop**, ce **livrează** și un **criteriu de gata**. Ce nu e în faza curentă e explicit amânat, nu uitat.

### F0 — Fundația documentară ✅ _încheiată (2026-09-02)_

**Scop:** proiectul să-și țină minte singur ce construim și ce a trebuit făcut manual.

Livrează:

- `docs/requirements.md` (acest document) ca sursă de adevăr
- `AGENTS.md` + fișierele generate `CLAUDE.md` și `.github/copilot-instructions.md`
- `scripts/sync-agent-docs.sh` și `scripts/check-agent-docs.sh` pentru sincronizarea lor
- `docs/_TEMPLATE-integrare.md` — șablonul pentru pașii manuali ai oricărei integrări
- `README.md` scurt, care trimite aici

**Gata când:** citind doar acest document, se poate spune ce intră în faza următoare și ce nu, fără discuția din chat.

**Fără cod de aplicație în această fază.**

---

### F1 — Schelet și chat cu streaming ✅ _încheiată (2026-09-07)_

**Scop:** primul răspuns de la un model, ajuns în browser token cu token.

Livrează:

- ✅ proiect Next.js + TypeScript
- ✅ interfața completă de chat, funcțională pe date inventate
- ⬜ un endpoint pe server care apelează modelul și returnează un stream
- ⬜ afișarea răspunsului pe măsură ce vine
- ⬜ system prompt **static** (încă nu depinde de profil)
- ⬜ `docs/anthropic/README.md` — pașii manuali pentru cheia de API

**Gata când:** pui o întrebare și vezi răspunsul curgând, iar cheia de API nu apare nicăieri în ce ajunge la browser.

Faza s-a împărțit în trei pași, ca să nu se amestece „am învățat Next", „am construit interfața" și „am integrat un LLM". Primii doi nu conțin niciun apel la model.

#### F1.1 — Scheletul ✅ _livrat (2026-09-02)_

Livrat:

- proiect Next.js 16 (App Router) + TypeScript strict, Tailwind v4, shadcn/ui, Prettier
- rutele `/` și `/demo`, ca structura de rutare să fie stabilită înainte să existe conținut
- `Counter` (component client) lângă `ServerClock` (component server), ca granița dintre ele să fie vizibilă pe ecran
- `src/app/api/hello/route.ts` — Route Handler care citește o variabilă de mediu de pe server; strămoșul direct al lui `src/app/api/chat/route.ts`
- `.env.example` comis, `.env.local` gitignorat

A fixat deciziile **D-9** (UI din shadcn/ui), **D-10** (Prettier cu setări comise) și **D-11** (blocul `next dev` în `AGENTS.md`) — vezi §6.

**Amânat explicit la F1.2:** interfața de chat și orice apel la un model.

#### F1.2 — Interfața completă, pe date inventate ✅ _livrat (2026-09-02)_

**Scop:** o aplicație care merge și se poate publica **înainte** de orice integrare cu un model.

Motivul acestei ordini: pornind direct cu apeluri către LLM, timpul se duce în chei de API și streaming, iar aplicația încă nu există. Așa există o versiune de siguranță, deployabilă, peste care integrarea devine o schimbare izolată.

Livrat:

- trei zone: sidebar (buton de conversație nouă, listă de conversații, rândul de utilizator), bară de sus minimă, zona de conversație
- preferințe ca **fereastră separată** (`Dialog`), cu trei secțiuni: Aspect, Profilul tău, Providere
- composer cu `Enter` trimite / `Shift+Enter` linie nouă, indicator de provider și comutare `Send` / `Stop`
- toate stările de interfață: ecran gol cu sugestii, `Skeleton` la încărcare, indicator „scrie…", `Alert` pentru erori de validare
- responsive: pe mobil sidebar-ul intră în `Sheet`, verificat la 390px
- stare persistată în `localStorage` (Zustand + `persist`, cheia `skillforge-app`)
- date inventate izolate în `src/lib/mock/`

**Gata când:** se poate naviga prin toată aplicația, se pot crea, redenumi și șterge conversații, iar totul supraviețuiește unui refresh — fără nicio cheie de API și fără configurare.

A fixat deciziile **D-12** … **D-16** — vezi §6.

**Aduse mai devreme, intenționat, dar DOAR ca interfață:** formularul de profil (din F2) și selecția de provider (din F4). Ce rămâne în fazele lor: construirea system prompt-ului din profil (F2) și apelul real către al doilea provider (F4).

#### F1.3 — Streaming de la server, fără model ✅ _livrat (2026-09-07)_

**Scop:** să se vadă cu ochiul liber cum curge un răspuns de pe server, înainte să intre în ecuație un model de limbaj.

Motivul separării: streamingul și integrarea cu un LLM sunt două probleme distincte, iar amestecate se depanează prost. Când răspunsul nu curge, vrei să știi dacă de vină e protocolul sau providerul. Aici protocolul e verificat pe un text fix, fără chei de API și fără SDK — deci merge pe orice laptop, imediat.

Livrat:

- `src/app/api/about/route.ts` — Route Handler (`runtime = "nodejs"`) care întoarce un `ReadableStream` cu descrierea aplicației, tăiată în bucăți, cu ~120ms între ele
- `src/components/settings/about-form.tsx` — secțiunea „Despre aplicație” din preferințe, care citește stream-ul **de mână**: `getReader()` + `TextDecoder`, fără nicio bibliotecă
- protocol **SSE**: fiecare eveniment e `data: <payload>` urmat de un rând gol, payload-ul codat cu `JSON.stringify`, iar la final `data: [DONE]`

**Gata când:** deschizi „Despre aplicație” și vezi textul apărând bucată cu bucată; butonul „Reia” repornește efectul. Verificat și din afara browserului: primul octet la ~0,015s, ultimul la ~2,0s.

A fixat deciziile **D-17** și **D-18** — vezi §6.

**De discutat la curs, pe cod:** SSE vs WebSocket vs polling; Edge vs Node runtime — cu observația că în **Next 16 Edge Runtime e deprecat**, iar `nodejs` e implicitul. Discuția rămâne utilă (streamingul merge pe ambele, nu depinde de Edge), dar răspunsul practic azi e Node.

#### F1.4 — Chat cu model real ✅ _livrat (2026-09-07)_

**Scop:** conversația să răspundă cu un model real, în streaming, fără reîncărcarea paginii.

Livrat:

- `src/app/api/chat/route.ts` — Route Handler (`runtime = "nodejs"`) care cheamă Anthropic prin **AI SDK-ul Vercel** (`streamText` + `toUIMessageStreamResponse()`). Singurul loc din aplicație care vorbește cu providerul.
- `src/lib/providers.ts` — registrul providerilor, cu `modelId` (șirul trimis la API) și `DEFAULT_MODEL_ID`. Id-ul de model e scris într-un singur loc; ruta îl citește de acolo.
- `useChat` în `src/components/chat/chat.tsx`, cu transportul îndreptat explicit spre `/api/chat`. Indicatorul „scrie…", butonul care devine „Stop" și alerta de eroare se **derivă** din `status`-ul hook-ului.
- `docs/anthropic/README.md` + rândul din tabelul de integrări + `ANTHROPIC_API_KEY` în `.env.example`.

**Cheia nu ajunge niciodată în browser:** se citește doar pe server, doar în interiorul handler-ului. Lipsa ei nu e o eroare de server, ci un răspuns **400** cu un mesaj care spune ce variabilă lipsește — iar `npm run build` trece și fără `.env.local`, ca aplicația să poată fi pornită de oricine.

**Gata când:** scrii în casetă, apeși Enter și răspunsul apare bucată cu bucată; butonul „Stop" îl oprește la mijloc.

A fixat deciziile **D-19** și **D-20** — vezi §6.

**Ce a ieșit altfel decât scria aici înainte.** Textul acestei faze spunea că punctul de înlocuire e acțiunea `sendMessage` din store. Nu a fost: acțiunea a fost **ștearsă**, nu rescrisă. Motivul e D-19 — mesajele conversației deschise aparțin lui `useChat`, iar store-ul păstrează doar lista de conversații. Odată ce hook-ul deține transcrierea, o a doua copie în store n-ar fi fost o siguranță, ci o garanție de desincronizare.

**Consecință, asumată:** mesajele conversației deschise **nu se mai păstrează** la refresh sau la trecerea pe altă conversație. Lista de conversații și titlurile rămân (sunt în store, persistate); conversațiile inventate își păstrează conținutul, pentru că e un _seed_ din `src/lib/mock/`. Persistarea reală a istoricului e chiar ce livrează **F3**, cu o bază de date în spate — nu `localStorage`.

**De discutat la curs, pe cod:** de ce apelul stă pe server (cheia, costul, limitarea pe utilizator); Edge vs Node runtime (aceeași observație ca la F1.3 — în Next 16 Edge e deprecat); de ce ruta și interfața se fac în același pas (un endpoint fără interfață se testează cu `curl`, o interfață fără endpoint n-are ce afișa).

#### F1.5 — Ce a rămas din F1 ✅ _încheiată (2026-09-07)_

**Amânat din F1.4, intenționat:** memorie și unelte (F3, respectiv F5). Selecția de provider din preferințe rămâne, deocamdată, doar vizuală: ca serverul să asculte de ea, providerul ar trebui să călătorească în corpul cererii și să fie validat pe server — altfel clientul ar putea cere orice model. Se face în F4, o dată cu al doilea provider real.

---

### F2 — Profil și system prompt personalizat ✅ _livrată (2026-09-07)_

**Scop:** aplicația să știe cine ești; aici se naște diferența față de un chat generic.

Livrat:

- `src/lib/system-prompt.ts`, singurul loc din aplicație care compune persona: `buildSystemPrompt(profile)` întoarce trei secțiuni explicite — **rol și domeniu** (mentor tech, pași concreți, skills/învățare/carieră), **guardrail-uri** (nu inventează fapte despre utilizator, nu promite angajări/salarii, nu dă sfaturi juridice/medicale, redirecționează politicos în afara domeniului) și **datele utilizatorului**, într-o secțiune separată, etichetată explicit ca și context, nu instrucțiune
- profilul e input neîncredere: normalizat pe server, în `buildSystemPrompt` însuși — câmpuri citite explicit, text trimuit și plafonat ca lungime, niveluri de skill validate față de `SKILL_LEVELS`. Un profil gol sau cu forma greșită dă un prompt valid, fără `undefined` scris în text
- `src/app/api/chat/route.ts` primește `profile` în corpul cererii și îl trece la `streamText` prin `system: buildSystemPrompt(profile)` — construit **exclusiv pe server**, niciodată livrat din client
- pe client, `prepareSendMessagesRequest` din `DefaultChatTransport` (`src/components/chat/chat.tsx`) citește profilul din store cu `useAppStore.getState()` la FIECARE trimitere de mesaj, nu o dată la montare — altfel o schimbare de obiectiv în preferințe n-ar ajunge niciodată la model
- indicator discret de profil activ pe ecranul de conversație nouă (`EmptyState`): obiectivul, dacă există, sau un semnal clar că profilul e necompletat
- notă de transparență + buton „Șterge profilul" în formularul de profil (`ProfileForm`): unde stă profilul, cine îl vede, cum se șterge — vezi §8.2
- modelul de date pentru profil (`Profile` din `src/lib/types.ts`) rămâne cel existent — `userId`, `name`, `stack`, `skills`, `goal` — fără câmpul „timp disponibil de învățare" schițat inițial mai sus: nu era cerut acum și l-am amânat explicit, ca să nu adăugăm o formă de date nefolosită încă de niciun ecran

**Gata când:** UC-1 („ce-mi lipsește…") primește un răspuns care se sprijină vizibil pe skill-urile din profil, iar același profil dă același tip de răspuns și după refresh. Verificat: aceeași întrebare cu profil gol vs. profil completat dă două răspunsuri vizibil diferite (primul cere context și trimite spre preferințe, al doilea construiește un plan pe skill-urile reale); o întrebare complet în afara domeniului (rețetă de mâncare) e redirecționată politicos spre subiectul de carieră, fără refuz sec; o încercare de injecție de prompt prin câmpul `goal` („ignoră instrucțiunile anterioare…") nu schimbă comportamentul modelului.

**De discutat la curs:** profilul e dată personală (vezi §8.2) — la acest pas stă doar în `localStorage`, deci în browserul utilizatorului, nu pe un server; ce înseamnă asta pentru GDPR (nu există procesare pe server de reținut, dar datele circulă la fiecare mesaj către provider) și de ce e un risc acceptat conștient la acest stadiu. Plus: cât din comportamentul agentului e cod (`route.ts`, normalizarea) și cât e text de prompt (`system-prompt.ts`) — system prompt-ul se versionează și se schimbă cu aceeași grijă ca și codul.

---

### F2.5 — Deploy cu chei reale, configurate în platformă ✅ _încheiată (2026-09-09)_

**Scop:** aplicația e publicată devreme — imediat cum răspunde cu un model real (F1.4) și știe cine ești (F2) — pentru că problemele de mediu se descoperă mult mai ieftin acum, pe două funcționalități, decât mai târziu, pe zece. Deployul în sine s-a făcut deja în F1.2 (D-16); aici cheile de provider devin reale și pleacă din laptop spre platformă.

Livrează:

- proiectul importat în Vercel din repo-ul de pe GitHub — framework detectat automat, fără comenzi de build scrise de mână și fără `vercel.json` cât timp valorile implicite merg
- `ANTHROPIC_API_KEY` (și restul variabilelor din `.env.example`) configurate în **Vercel → Project → Settings → Environment Variables**, pe **Production** și pe **Preview** — niciodată în repo
- confirmarea că `npm run build` trece **și fără nicio cheie** (verificat local: `.env.local` mutat temporar deoparte) — lipsa unei chei e o stare normală a aplicației, nu o eroare de build sau un `throw` la pornire
- `docs/vercel/README.md` completat cu pașii reali de configurare a cheilor și cu verificarea că merg
- convenția de skill-uri pentru fluxuri repetitive: `.claude/skills/pre-deploy/SKILL.md`, oglindit în `.github/skills/pre-deploy/SKILL.md`, plus `scripts/sync-skills.sh` (după modelul `scripts/sync-agent-docs.sh`)
- `README.md` cu linkul aplicației publicate

**Gata când:** linkul public răspunde cu Claude adevărat, verificat pe telefon și pe laptop; un push pe un branch dă un Preview URL separat de cel de pe `main`; iar deschis fără nicio cheie configurată, chatul spune curat „provider neconfigurat" — nu o pagină de eroare.

**Ce NU intră aici:** domeniu propriu, monitorizare, analytics — pași separați, care nu au ce căuta în primul deploy cu chei reale. Monitorizarea rămâne în F7.

**De discutat la curs, pe cod:** Preview vs Production — fiecare branch primește URL-ul lui, `main` e cel public; de ce un link de preview e pentru review, nu pentru „rulează la tine"; unde se citesc logurile funcțiilor când ceva merge local și cade în producție; de ce un Route Handler nu e „gratis" la scară — rulează la fiecare cerere, iar tokenii se plătesc.

---

### F2.6 — Acțiuni pe conversație și export ✅ _încheiată (2026-09-09)_

**Scop:** conversația nu mai e doar de citit. Un răspuns nereușit se reia, un mesaj se copiază, iar planul de învățare care iese din chat se poate scoate din aplicație — ca fișier, nu doar citit pe ecran.

Motivul pentru care e un pas ieftin: nicio acțiune de aici nu adaugă o sursă de adevăr nouă. Toate operează pe lista de mesaje care există deja, prin funcțiile pe care `useChat` le expune deja (`regenerate`, `setMessages`) — vezi D-19. Exportul citește aceeași listă, o dată, în clipa apăsării butonului.

Livrează:

- **reluare pe mesaj** (buton la hover, doar pe răspunsurile asistentului): pe ULTIMUL răspuns, `regenerate()` îl înlocuiește direct — vizibil, pentru că bula veche dispare și indicatorul „scrie…" apare exact în locul ei, nu sub un al doilea răspuns. Pe un răspuns mai vechi, `regenerate({ messageId })` taie și mesajele de după el (nu doar pe cel reluat), deci cere confirmare explicită într-un `AlertDialog` înainte — asta e „golirea" distructivă despre care vorbeau cerințele pasului, nu un buton separat
- **copiere pe mesaj** (hover, orice rol), confirmată prin notificarea deja existentă în aplicație (`sonner`), nu printr-un state nou per mesaj. Butonul se ascunde dacă `navigator.clipboard` nu există — context nesecurizat (altceva decât HTTPS sau `localhost`), cazul cuiva care deschide aplicația pe IP-ul din rețeaua locală. Verificarea stă în `src/hooks/use-clipboard-available.ts`, cu `useSyncExternalStore` (nu `useState` + `useEffect`, care ar declanșa o randare suplimentară — vezi și `useHydrated`)
- **export al conversației deschise**, din meniul de sub iconița din header (D-15 ține bara de sus liberă de acțiuni pe mesaje individuale, dar exportul e o acțiune globală, nu una legată de un mesaj anume): JSON (pentru procesare) și Markdown (pentru notițe), pornind din **aceeași structură intermediară** — `buildConversationExport` din `src/lib/message-utils.ts`, singurul loc care decide ce intră în export. Funcțiile de acolo sunt PURE: primesc mesaje și profil, întorc un string, fără `document`, fără store, fără `fetch`. Descărcarea propriu-zisă (`Blob` + `URL.createObjectURL` + `<a download>`, cu `URL.revokeObjectURL` după declanșare) stă separat, în `src/lib/download-file.ts`, tocmai ca granița puritate/browser să rămână vizibilă
- numele fișierului exportat vine din **dată**, nu din titlul conversației (`skillforge-<dată-ISO>.json` / `.md`) — titlul e text liber al utilizatorului, ar putea produce un nume de fișier nevalid pe unele sisteme
- `src/lib/active-conversation-bridge.ts` — vezi **D-21**: cum ajunge header-ul, un component frate cu `Chat`, la mesajele pe care le deține `useChat`
- „Chat nou" din sidebar (existent din F1.2) — verificat că nu pierde celelalte conversații din listă

**Ce NU intră aici, amânat explicit:** export ca PDF; editarea mesajelor. Editarea ar face relevantă reluarea unui mesaj al UTILIZATORULUI (retrimite-l modificat) — acum reluarea există doar pe răspunsurile asistentului, pentru că un mesaj al tău reluat nemodificat n-ar însemna nimic.

**Gata când:** un răspuns nereușit se înlocuiește cu un clic, fără să rămână un al doilea răspuns dedesubt; reluarea unui răspuns mai vechi cere confirmare explicită înainte să șteargă ce a urmat după el; copierea arată o confirmare vizibilă, de fiecare dată; exportul JSON e valid și cel Markdown se poate deschide direct ca notiță — amândouă cu profilul, titlul conversației și data exportului incluse, ca fișierul să se înțeleagă și peste o lună.

**De discutat la curs:** de ce o funcție pură (`buildConversationExport`) se poate testa cu un array de mesaje scris de mână, fără să pornească un browser, iar una care citește direct din store nu; ce înseamnă concret că exportul scoate profilul din aplicație — un fișier pe care utilizatorul îl poate trimite mai departe, deci datele personale devin, din acel moment, responsabilitatea lui, nu a aplicației (vezi §8.2); de ce reluarea costă bani de fiecare dată — e un apel nou la model, cu tot promptul de sistem retrimis, nu o operație locală.

---

### F3 — Memorie între sesiuni ← _faza curentă_

**Scop:** progresul se acumulează; UC-3 devine posibil.

Livrează:

- istoricul conversațiilor, cu reluarea unei conversații anterioare
- **fapte reținute** — informații pe care agentul le extrage și le păstrează separat de istoric („a terminat modulul de streaming")
- o strategie explicită pentru limita de context: ce intră în prompt când istoricul crește peste ce încape

**Gata când:** închizi aplicația, o redeschizi, întrebi „ce urmează?" și răspunsul ține cont de ce ai terminat înainte.

---

### F4 — Al doilea provider și comparație

**Scop:** D-4 devine real și verificabil.

Livrează:

- interfața comună de provider, cu Anthropic și OpenAI ca implementări
- comutare de provider/model din interfață
- afișarea consumului: tokeni de intrare/ieșire și cost estimat per răspuns
- `docs/openai/README.md` — pașii manuali pentru a doua cheie

**Gata când:** aceeași întrebare poate fi trimisă la ambii provideri, iar diferența de răspuns și de cost e vizibilă.

---

### F5 — Unelte folosite de agent

**Scop:** agentul acționează, nu doar răspunde.

Livrează:

- unealtă de căutare în notițele proprii
- unealtă de actualizare a planului de învățare
- afișarea în interfață a faptului că agentul a folosit o unealtă, și care

**Gata când:** la „am terminat modulul de streaming", agentul își actualizează singur planul, fără să i se ceară explicit.

---

### F6 — Persistență reală și autentificare

**Scop:** datele supraviețuiesc browserului; aplicația devine multi-user.

Livrează:

- Supabase ca bază de date; migrarea profilului și a memoriei din `localStorage`
- autentificare; `userId` din D-7 devine utilizatorul real
- izolarea datelor între utilizatori
- `docs/supabase/README.md`

**Gata când:** te conectezi de pe alt calculator și îți regăsești profilul și istoricul.

---

### F7 — Monitorizare

**Scop:** se știe cât costă aplicația și se văd erorile fără să fie nevoie de un raport de la utilizator.

> **Deployul propriu-zis s-a mutat mai devreme, în F1.2** (vezi D-16), iar **configurarea cheilor reale în platformă s-a mutat în F2.5**: o aplicație publicată devreme, peste care fiecare funcționalitate nouă ajunge direct în producție. Pașii manuali sunt în [`docs/vercel/README.md`](./vercel/README.md). Ce rămâne aici e partea care are sens abia când există costuri reale de urmărit.

Livrează:

- ✅ deploy (mutat în F1.2)
- ✅ variabilele de mediu ale providerilor, configurate în platformă (mutat în F2.5)
- ⬜ monitorizarea erorilor și a consumului de tokeni

**Gata când:** se poate spune cât a costat ultima săptămână și unde a eșuat un răspuns, fără să fie nevoie de un raport de la utilizator.

---

### Neplanificat (idei, nu angajamente)

Export al planului, notificări/reminder-e, RAG peste documentație externă, mai mult de un agent, aplicație mobilă. Se trec la o fază reală doar când sunt decise — și atunci se scriu mai sus.

## 8. Cerințe non-funcționale

### 8.1 Secrete și chei de API

- Cheile stau în `.env.local`, fișier **negitat** (`.env*` intră în `.gitignore` din F0, înainte să existe vreo cheie).
- Numele variabilelor: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Pentru F6/F7 se adaugă variabilele de Supabase și de platformă de deploy, documentate la momentul lor.
- **Cheia nu ajunge niciodată în browser.** Concret: nicio cheie nu intră într-o variabilă expusă clientului și niciun apel către provider nu pleacă din codul de client.
- În documentație se scriu **doar numele variabilelor**, niciodată valorile.
- La deploy (F7), aceleași variabile se configurează în platformă, nu în cod.

### 8.2 Date personale

**Ce colectăm, concret** (câmpurile din `Profile`, `src/lib/types.ts`): nume, stack curent (text liber), listă de skill-uri cu nivel, obiectiv de carieră (text liber). Nu sunt date sensibile în sens legal, dar sunt date personale reale și tratamentul lor se declară explicit.

**Ce se întâmplă cu ele, pe fază:**

| Fază  | Unde stau                        | Cine le mai vede                                                                                                 |
| ----- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| F2–F5 | `localStorage`, în browserul tău | Anthropic, la fiecare mesaj (profilul intră în system prompt, construit pe server în `src/lib/system-prompt.ts`) |
| F6+   | Supabase, legate de contul tău   | Idem, plus furnizorul bazei de date                                                                              |

Rămâne așa **până la F6**: momentul migrării la Supabase, cu autentificare reală, e trigger-ul care schimbă și modelul de date personale, nu doar locul de stocare.

**De ce e un risc acceptabil deocamdată:** un singur utilizator local, fără cont și fără parteneri terți în afară de providerul LLM (deja acoperit de §8.1); nimic din profil nu e o categorie specială de date (sănătate, origine, opinii); volumul e mic (câteva câmpuri text) și complet vizibil și editabil de utilizator în orice moment, din formularul de profil — nu există procesare ascunsă. Compromisul e explicit: viteza de a ajunge la partea de agent, nu o alegere de arhitectură definitivă.

**Consecințele stocării în `localStorage`, asumate conștient în F2:**

- Datele sunt legate de **browserul curent**, nu de tine: alt calculator sau alt browser înseamnă profil gol.
- Golirea datelor de site șterge profilul și memoria, ireversibil.
- Nu există backup.
- Profilul se trimite la server la fiecare request, pentru că system prompt-ul se construiește pe server.

Acesta e un compromis deliberat pentru a ajunge repede la partea de agent. **Trigger de migrare la F6:** în momentul în care pierderea profilului devine costisitoare — practic, când memoria acumulată depășește ce ai rescrie într-un sfert de oră.

**Reguli permanente:**

- Profilul se poate șterge complet din interfață, în orice fază.
- Ce se trimite către provider se poate inspecta — la nevoie, agentul poate arăta ce system prompt a folosit.
- Profilul real nu se comite în git și nu se folosește în exemple din documentație.
- **Exportul (F2.6) scoate profilul din aplicație.** Fișierul descărcat (JSON sau Markdown) conține profilul complet, nu doar conversația — din clipa descărcării, controlul asupra lui e al utilizatorului, nu al aplicației: poate ajunge trimis mai departe, într-un e-mail sau într-un folder partajat. Interfața nu ascunde asta (numele, stack-ul și obiectivul sunt vizibile direct în fișier), dar nici nu avertizează la fiecare export — ar deveni zgomot pentru o acțiune pe care utilizatorul a cerut-o explicit.

### 8.3 Costuri

Modelul de cost este același la ambii provideri: **se plătește per token, cu tarif diferit pentru intrare și pentru ieșire**, iar prețul depinde de modelul ales — modelele mici sunt cu un ordin de mărime mai ieftine decât cele mari.

Ce contează pentru această aplicație:

- **System prompt-ul se plătește la fiecare mesaj.** Profilul intră în fiecare request, deci un profil care crește necontrolat crește costul fiecărui răspuns. La F3 asta devine o constrângere reală de design pentru memorie.
- **Istoricul conversației se retrimite** la fiecare mesaj. Costul unei conversații lungi crește neliniar.
- Streamingul nu schimbă costul, doar percepția de viteză.
- Uneltele (F5) adaugă apeluri suplimentare pentru același răspuns.

**Prețurile concrete nu se scriu aici**, ca să nu rămână greșite tăcut. Ele intră în `docs/anthropic/README.md` și `docs/openai/README.md`, cu link către pagina oficială de prețuri și data la care au fost verificate. Măsurarea reală a consumului intră în F4.

**Buget de lucru pentru curs:** dezvoltarea și testarea manuală a acestei aplicații se încadrează în câțiva dolari pe provider, dacă se folosesc modele mici pentru dezvoltare și cele mari doar pentru verificarea calității răspunsurilor.

### 8.4 Performanță

- **Primul token vizibil rapid** este cerința care contează, nu durata totală: un plan de 3 luni e un răspuns lung prin natura lui.
- Interfața arată clar că lucrează, între trimiterea întrebării și primul token.
- Un răspuns în curs poate fi oprit.

### 8.5 Erori și limite

Aplicația spune ce s-a întâmplat, în loc să eșueze mut. Situațiile care se tratează explicit:

- cheie de API lipsă sau invalidă → mesaj care spune ce variabilă lipsește (fără să afișeze valori)
- rate limit sau provider indisponibil → mesaj distinct de o eroare de cod
- stream întrerupt la mijloc → răspunsul parțial rămâne vizibil, nu dispare
- profil gol → aplicația funcționează, dar spune de ce răspunsurile sunt generice

### 8.6 Limbă

- Documentația de proiect (acest fișier, `README.md`) și interfața: română.
- Instrucțiunile pentru agenți (`AGENTS.md` și fișierele generate): engleză.
- Codul, numele de variabile și mesajele de commit: engleză. La fel cheile JSON care trec granița client/server — sunt contract între server și client, nu text afișat.
- Comentariile din cod: **română**, în fiecare fișier, inclusiv cele de configurare.

Comentariile sunt material didactic, deci au o sarcină precisă: explică **de ce** e scris codul așa — compromisul ales, eroarea pe care o previn, ce s-ar strica fără ele. Un comentariu care repetă ce spune deja linia e zgomot și se șterge. Unde o convenție diferă de ce știe cititorul din altă parte (Vite, Tailwind v3, Pages Router), diferența se spune explicit.

## 9. Glosar

Termeni folosiți cu același înțeles peste tot în proiect.

**Agent** — componenta care primește o întrebare _împreună cu context_ (profil, memorie) și produce un răspuns, iar din F5 poate decide singură să folosească unelte înainte de a răspunde. Se distinge de un simplu apel la model prin faptul că are context și inițiativă.

**Provider** — furnizorul de model de limbaj (Anthropic, OpenAI). În cod, o implementare a unei interfețe comune, ca să poată fi schimbat fără să se rescrie aplicația.

**Model** — modelul concret al unui provider. Un provider oferă mai multe modele, cu capabilități și prețuri diferite.

**Streaming** — livrarea răspunsului bucată cu bucată, pe măsură ce e generat, în loc să se aștepte răspunsul întreg. În aplicație: textul apare progresiv în chat.

**System prompt** — instrucțiunile trimise modelului înaintea conversației, care stabilesc cine e și cum răspunde. În SkillForge se construiește dinamic din profil (D-6).

**Profil** — datele despre utilizator: stack, skill-uri cu nivel, obiectiv, timp disponibil. Editabil de utilizator.

**Persona** — tipul de utilizator din §2 (backend spre AI, QA spre automatizare etc.). Se folosește pentru a valida că aplicația funcționează pentru mai mulți oameni, nu doar pentru autorul ei. **Nu** e același lucru cu profilul: persona e o categorie, profilul e o instanță reală.

**Memorie** — ce reține aplicația între sesiuni: istoricul conversațiilor plus faptele reținute despre progres. Distinctă de profil: profilul se editează manual, memoria se acumulează din conversație.

**Unealtă (tool)** — o funcție pe care agentul o poate apela singur în timpul unui răspuns (caută în notițe, actualizează planul). Agentul decide dacă și când o folosește.

**Token** — unitatea în care modelele măsoară textul și în care se facturează. Aproximativ o bucată de cuvânt. Relevant pentru cost (§8.3) și pentru limita de context.

**Fereastră de context** — cantitatea maximă de text pe care modelul o poate primi într-un request. Ce depășește limita trebuie omis sau rezumat — problema centrală a fazei F3.

## 10. Convenția de documentare a integrărilor

Regulă permanentă: **fiecare integrare externă primește un `docs/<integrare>/README.md`** cu partea care se face manual — cont, generarea cheii, variabila de mediu în care intră, configurări în dashboard-ul furnizorului, costuri. Fișierul nou intră **în același commit** cu codul integrării, iar rândul lui se adaugă în tabelul din [`docs/README.md`](./README.md) — indexul documentației.

Motivul: codul îl scrie agentul, dar pașii manuali se uită imediat dacă nu-i notează nimeni. La reinstalare, pe alt calculator sau la deploy, ar fi căutați de la zero.

Șablonul: [`docs/_template/README.md`](./_template/README.md). Regula e scrisă și în `AGENTS.md`, ca să se aplice fără să fie repetată la fiecare pas.

## 11. Cum se modifică acest document

Acest fișier este sursa de adevăr. Regulile:

1. **Orice decizie luată în conversație se scrie aici, în aceeași etapă în care e luată.** O decizie care rămâne doar în chat e o decizie pierdută.
2. Când o fază se termină, criteriul ei de gata se verifică efectiv, iar faza se marchează ca încheiată.
3. Când o cerință amânată devine actuală, se mută în faza care o preia — nu se lasă în „Neplanificat".
4. Modificările de direcție se trec în jurnalul de mai jos.
5. `README.md` nu duplică acest conținut; trimite la el.

### Jurnal de modificări

| Data       | Ce s-a schimbat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-02 | Versiune inițială: scop, persone, faze F0–F7, cerințe non-funcționale, glosar. Decizii fixate: Next.js + TypeScript, agent pe server, `localStorage` în F2 cu migrare la Supabase în F6, Anthropic + OpenAI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-02 | F0 încheiată. F1 devine faza curentă și se împarte în F1.1 (schelet, livrat) și F1.2 (chat cu streaming). Adăugate deciziile D-9 (UI din shadcn/ui), D-10 (Prettier cu setări comise), D-11 (blocul `next dev` în `AGENTS.md`). §8.6 modificată: **comentariile din cod se scriu în română** și explică _de ce_, restul codului rămâne în engleză.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-02 | F1 împărțită în trei pași; **F1.2 (interfața completă pe date inventate) livrată**, F1.3 (chat cu streaming) devine pasul curent. Adăugate deciziile D-12…D-16. Aduse mai devreme, doar ca interfață, formularul de profil (din F2) și selecția de provider (din F4). Deployul pe Vercel se mută din F7 în F1.2, ca versiune de siguranță înainte de orice integrare.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-07 | §10 actualizată: șablonul integrărilor s-a mutat din `docs/_TEMPLATE-integrare.md` în `docs/_template/README.md`, cu 6 secțiuni obligatorii (Ce face, Cont & chei, Variabile de mediu, Pași manuali, Cost & limite, Verificare); a apărut `docs/README.md` ca index, cu tabelul integrărilor. Reparate două goluri rămase din reorganizarea F1.2: pagina „/" nu mai lega spre „/demo", iar `Counter`/`ServerClock` (perechea client/server din F1.1) nu mai erau randate nicăieri. Adăugat în `README.md` un tabel de comparație Vite ↔ Next.js.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-09-07 | F1.3 redefinită: **streaming de la server fără model** (livrat) — ruta `api/about`, secțiunea „Despre aplicație”, protocol SSE citit de mână. Chatul cu model real devine **F1.4**, pasul curent. Adăugate deciziile D-17 (SSE, nu WebSocket/polling) și D-18 (payload codat cu `JSON.stringify`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-07 | F1.3 verificată pe Next 16 și corectate două detalii care veneau din obiceiuri de Next 14/15: `export const dynamic = "force-dynamic"` a fost **scos** din `api/about/route.ts` (în Next 16 Route Handlers nu se cachează implicit, cache-ul se cere cu `force-static`), iar nota despre runtime spune acum că **Edge Runtime e deprecat** în Next 16 și `nodejs` e implicitul. Streamingul nu depinde de Edge — `ReadableStream` merge pe ambele.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-07 | **F1.4 livrată**: chat cu model real (Anthropic prin AI SDK-ul Vercel), streaming în interfață, cheie doar pe server, cheie lipsă tratată ca 400 cu mesaj clar. Adăugate deciziile D-19 (mesajele conversației deschise aparțin lui `useChat`; store-ul ține lista) și D-20 (AI SDK-ul Vercel ca strat peste provideri). **Corectat față de ce scria aici**: `sendMessage` din store nu a fost rescrisă, ci ștearsă — cu consecința, asumată, că transcrierea nu supraviețuiește unui refresh până la F3. Apărut `src/lib/providers.ts` (registru cu `modelId`) și `docs/anthropic/README.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-07 | **F1.5 încheiată** (nimic de construit, doar amânări documentate) și **F2 livrată**: `src/lib/system-prompt.ts` — persona de mentor de carieră tech, cu rol/domeniu, guardrail-uri și secțiunea de profil separate explicit, plus normalizarea profilului (input neîncredere) pe server. Profilul călătorește de la client la server la fiecare mesaj prin `prepareSendMessagesRequest`, citit din store la momentul trimiterii, nu la montare. Adăugate în interfață: indicator de profil activ pe ecranul de conversație nouă și buton „Șterge profilul" cu explicația unde stă / cine îl vede. §8.2 rescrisă cu câmpurile colectate efectiv și motivul pentru care riscul `localStorage` e acceptabil până la F6. **În treacăt, reparat un bug preexistent** (necomis) în `src/lib/providers.ts`/`types.ts`: intrarea `anthropic` avea `id: "anthropic-haiku"`, rămas dintr-un refactor anterior, ceea ce rupea `npm run build`; `"anthropic-haiku"` a fost scos din `ProviderId`, fiindcă nu mai era folosit ca valoare distinctă nicăieri.                                                                 |
| 2026-09-09 | Adăugată **F2.5 — Deploy cu chei reale, configurate în platformă**, ca fază proprie, imediat după F2: cheile de provider pleacă din laptop spre Vercel (Production + Preview), cu verificarea că build-ul trece și fără nicio cheie. Mutată **cu urmă** din F7 (bulletul „variabilele de mediu ale providerilor" e marcat ✅, cu notă „mutat în F2.5"); F7 devine **doar Monitorizare** — și-a schimbat și titlul. Numerotarea F3–F7 **nu s-a schimbat**: F2.5 e sub-fază, ca F1.1–F1.5, tocmai ca să nu invalideze referirile la F3/F4/F5/F6/F7 deja scrise ca comentarii în cod (16 fișiere). Apărută convenția de skill-uri: `.claude/skills/`, oglindit în `.github/skills/`, sincronizate cu `scripts/sync-skills.sh`. **Corectat în treacăt**: marcajul „← faza curentă" rămăsese pe titlul lui F1 din F1.2 încoace, deși F1 s-a încheiat la F1.5 și F2 s-a livrat între timp — mutat acum pe F2.5, singura fază reală în lucru.                                                                                                                                                                          |
| 2026-09-09 | **F2.5 încheiată** (aplicația e publicată, cu `ANTHROPIC_API_KEY` reală în Vercel) și adăugată **F2.6 — Acțiuni pe conversație și export**, imediat livrată: reluare pe mesaj (`regenerate()`, cu confirmare doar când taie și mesaje de după cel reluat), copiere pe mesaj (cu ascundere dacă `navigator.clipboard` lipsește — context nesecurizat), export al conversației deschise ca JSON și Markdown din aceeași structură intermediară (`src/lib/message-utils.ts`, funcții pure) și descărcare directă din browser (`src/lib/download-file.ts`, fără endpoint nou). Adăugată decizia **D-21**: puntea `src/lib/active-conversation-bridge.ts`, prin care header-ul (component frate cu `Chat`) citește o dată, la export, instantaneul de mesaje publicat de `chat.tsx` — un instantaneu, nu un abonament, deci nu contrazice D-19. Adăugat `src/components/ui/alert-dialog.tsx` (shadcn) pentru confirmarea reluării unui răspuns mai vechi. §8.2 primește o regulă permanentă nouă: exportul scoate profilul din aplicație, în fișierul descărcat. **F3 — Memorie între sesiuni** devine faza curentă. |
