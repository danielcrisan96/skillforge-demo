# SkillForge — Cerințe

> **Acest fișier este sursa de adevăr pentru ce construim.**
> Orice decizie luată pe parcurs se scrie aici, nu doar în conversație. Vezi [Cum se modifică acest document](#11-cum-se-modifică-acest-document).

Ultima actualizare: 2026-09-16 · Faza curentă: **F3 — Memorie între sesiuni** (reluată după încheierea F4, cu F4.2)

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

| #    | Decizie                                                                                                                                                                            | De ce                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | **În centru stă un agent**, nu un formular care trimite text la model și afișează rezultatul                                                                                       | Agentul primește context (profil, memorie) și, din faza F5, decide singur să folosească unelte. Această diferență dictează structura codului de la început.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D-2  | **Next.js + TypeScript (strict)**                                                                                                                                                  | Un singur proiect care conține și UI-ul, și codul de server. TypeScript pentru că tipurile care traversează granița client/server (profil, mesaje, contract de provider) trebuie să fie explicite, nu presupuse.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D-3  | **Modelul se cheamă exclusiv de pe server**                                                                                                                                        | Cheia de API nu ajunge niciodată în browser. Orice cod care atinge o cheie trăiește în partea de server.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D-4  | **Provider de LLM schimbabil**, în spatele unei interfețe tipizate                                                                                                                 | Ca să putem compara răspunsuri și costuri între Anthropic și OpenAI fără să rescriem aplicația.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D-5  | **Răspuns în streaming**                                                                                                                                                           | Cerință de UX, nu detaliu tehnic: un plan de învățare e un răspuns lung, iar așteptarea în gol face aplicația să pară blocată.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D-6  | **System prompt construit din profilul real**                                                                                                                                      | Este mecanismul prin care „răspunde în contextul meu" devine concret.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D-7  | **Un singur profil acum, `userId` în model de la început**                                                                                                                         | Faza 1 nu are login, dar datele se modelează ca și cum ar avea. Autentificarea (F6) devine astfel un modul adăugat, nu o rescriere.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D-8  | **Fără chei reale în documentație** — doar numele variabilelor                                                                                                                     | Documentația se comite în git; cheile nu.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D-9  | **Orice element de UI vine din shadcn/ui** (`src/components/ui/`), nu scris de mână                                                                                                | shadcn copiază codul în proiect, deci rămâne modificabil. Câștigul real e consistența stărilor ușor de uitat: focus la navigarea cu tastatura, `disabled`, contrast în tema întunecată.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D-10 | **Formatarea e fixată de Prettier**, cu setările comise în repo                                                                                                                    | Fără ele, diferențele dintre commit-uri ar fi spații și ghilimele, nu cod — iar la doi oameni cu editoare diferite, fiecare salvare ar rescrie fișierul.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D-11 | **Blocul de reguli scris de `next dev` stă în `AGENTS.md`**                                                                                                                        | `next dev` își (re)adaugă singur un bloc de instrucțiuni pentru agenți. Îl scrie într-un singur fișier și îl preferă pe `AGENTS.md` dacă acesta îl conține deja — așa `CLAUDE.md` rămâne pur generat, iar scriptul de sync nu se bate cu Next pe același fișier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D-12 | **Starea aplicației în Zustand cu `persist`** (`localStorage`, cheia `skillforge-app`)                                                                                             | Aceleași date sunt citite din trei locuri neînrudite în arbore (sidebar, preferințe, chat); prin props ar fi însemnat componente intermediare care car date de care nu le pasă. `persist` există ca lista de conversații să supraviețuiască unui refresh înainte să existe o bază de date.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D-13 | **UI exclusiv din shadcn/ui + Tailwind; iconițe exclusiv din `lucide-react`**                                                                                                      | Zero CSS scris de mână și o singură sursă de iconițe. Extinde D-9: consecvența se obține din constrângere, nu din disciplină.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D-14 | **Datele inventate stau doar în `src/lib/mock/`**                                                                                                                                  | Ca înlocuirea lor cu date reale să fie o singură atingere, nu o vânătoare prin componente. Corolar: niciun text inventat nu se scrie direct într-un component.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D-15 | **Tema se schimbă doar din preferințe**, nu dintr-un buton în bara de sus                                                                                                          | Tema e o preferință, nu o acțiune repetată. Bara de sus rămâne pentru conversație. Preferința („sistem"/„light"/„dark") e ținută separat de tema efectivă, ca „sistem" să poată urmări în timp real sistemul de operare. **Reimplementată la F3.1** (2026-09-14): preferința a ieșit din store-ul Zustand (D-12) și a trecut pe `createContext`+`useContext` propriu (`src/components/theme/theme-provider.tsx`), cu cheie proprie în `localStorage` (`skillforge-theme`) — pasul didactic unde se închide, pe cod real, comparația store-vs-context pregătită la F3.1 (vezi mai jos): tema are un singur consumator logic și se schimbă rar, exact profilul pentru care lipsa lui `selectors` din context nu costă nimic.                                                                                                                                                                                                    |
| D-16 | **Interfața completă, pe date inventate, ÎNAINTE de integrarea cu un model**                                                                                                       | Cu apelurile la LLM pe primul loc, timpul se duce în chei și streaming, iar aplicația nu există încă. Ordinea asta dă o versiune publicabilă peste care integrarea e o schimbare izolată — și mută deployul (inițial în F7) mai devreme, ca plasă de siguranță.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D-17 | **Protocolul server→client e SSE** (`text/event-stream`), nu WebSocket și nu polling                                                                                               | Fluxul e într-un singur sens: serverul trimite, clientul ascultă. SSE e exact atât — merge peste HTTP obișnuit, trece prin proxy-uri și se reconectează singur. WebSocket ar aduce bidirecționalitate de care nu avem nevoie, plus o conexiune de întreținut; pollingul ar însemna ca clientul să întrebe repetat, simplu dar risipitor. E și protocolul folosit de providerii de LLM, deci nu se schimbă la pasul următor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D-18 | **Payload-ul fiecărui eveniment SSE se codează cu `JSON.stringify`**                                                                                                               | În SSE, rândul gol e separatorul de evenimente. Un text care conține el însuși linii noi — și răspunsurile conțin, au paragrafe — ar rupe protocolul: clientul ar vedea două evenimente unde s-a trimis unul. Codat, orice linie nouă devine două caractere obișnuite, iar clientul face `JSON.parse`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D-19 | **Cât timp un răspuns curge, mesajele aparțin lui `useChat`; store-ul e arhiva — lista de conversații ȘI mesajele lor, sincronizate o singură dată, la finalul streamului** (F3.1) | Două locuri care țin aceleași mesaje se desincronizează garantat: în timpul streamului sosesc zeci de actualizări pe secundă, iar al doilea deținător rămâne în urmă fără ca nimic să semnaleze asta — de-asta arhivarea așteaptă finalul, nu fiecare bucată. `persist` scrie sincron în `localStorage` la orice schimbare de stare: o sincronizare per token ar însemna sute de serializări ale întregului istoric în câteva secunde, adică o interfață care se blochează vizibil pe o conversație lungă. Compromis asumat: un răspuns întrerupt de un refresh la mijlocul streamului se pierde — o persistență care supraviețuiește și la asta cere un server (F6), nu `localStorage`. **Corectat față de ce scria aici până la F3.1**: nu mai e adevărat că mesajele nu supraviețuiesc unui refresh — supraviețuiesc, din arhiva sincronizată la final; ce nu supraviețuiește e doar un răspuns întrerupt exact la mijloc. |
| D-20 | **Providerul se cheamă prin AI SDK-ul Vercel** (`ai` + `@ai-sdk/anthropic`), nu prin SDK-ul Anthropic direct                                                                       | E fix mecanismul cerut de D-4: o interfață comună peste Anthropic și OpenAI, deci al doilea provider (F4) nu cere rescrierea rutei. Bonus pedagogic: `toUIMessageStreamResponse()` scrie **același SSE** pe care l-am scris de mână la F1.3 — se vede cu `curl` că sub `useChat` nu e nicio magie.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D-21 | **Puntea de export** (`src/lib/active-conversation-bridge.ts`) **nu e o a doua sursă de adevăr** pentru mesaje                                                                     | Header-ul (unde stă exportul) e un component FRATE cu `Chat`, nu descendentul lui — nu poate primi mesajele prin props sau context de sus în jos, iar D-19 interzice ținerea lor în store. Soluția: un modul scris de `chat.tsx` la fiecare schimbare de `messages`, citit de header o SINGURĂ dată — în clipa apăsării butonului de export, nu printr-un abonament reactiv. Fără nimic randat pe baza valorii, nu există ce să se desincronizeze: la următorul export se citește oricum starea curentă.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D-22 | **Registrul din `src/lib/providers.ts` e singura listă de provideri, iar `getModel` din `src/lib/providers.server.ts` e singurul loc care instanțiază un SDK** (F4.1)              | Testul unei abstracții nu e cât de elegant arată, ci câte fișiere trebuie atinse pentru a doua implementare. Cu registrul, un provider nou = o intrare + o ramură de fabrică, niciuna într-un component; cu `if`-uri, ar fi fost trei locuri (composer, preferințe, rută) care se desincronizează la al treilea provider. `MODEL_FACTORIES` e un `Record<ProviderId, …>` tocmai ca ramura să fie CERUTĂ de compilator: un `switch` cu `default` ar fi lăsat să existe o opțiune care arată bine în interfață și crapă la prima trimitere. Corolar de securitate: `providers.ts` e importat de composer, deci **ajunge în browser** — acolo nu intră nicio cheie și niciun `process.env`, doar NUMELE variabilei. Tot ce atinge chei stă în `providers.server.ts`, importat exclusiv din Route Handlere.                                                                                                                       |
| D-23 | **„Configurat" e o proprietate a serverului**; disponibilitatea ajunge în interfață ca date de afișat, iar un provider fără cheie se vede **dezactivat, cu motivul** (F4.1)        | Cheile stau în mediul serverului, iar browserul n-are cum să le vadă — și nici nu trebuie. Clientul nu atinge `process.env` nici măcar pentru un `Boolean(...)`: primește de la `GET /api/providers` un verdict plus un motiv gata de citit, niciodată o valoare de cheie, nici trunchiată (o cheie parțială e tot cheie). Tentația `NEXT_PUBLIC_OPENAI_CONFIGURED` e greșită de două ori: ar fi a doua sursă de adevăr, de ținut în sinc cu cheia reală, și ar normaliza obiceiul de a pune lucruri despre chei în variabile publice. Opțiunea rămâne **în listă**, dezactivată: ștearsă, ar fi lăsat întrebarea „de ce nu văd OpenAI?" fără răspuns nicăieri în interfață.                                                                                                                                                                                                                                                  |
| D-24 | **Comutatorul de provider stă lângă composer, nu în preferințe** (F4.1)                                                                                                            | E o decizie de MOMENT („vreau altă părere la întrebarea asta"), nu o setare schimbată o dată pe lună — iar un control se pune unde se ia decizia. Alegerea se aplică **mesajului următor**, nu retroactiv conversației, și se citește din store la fiecare trimitere, nu la montarea componentei (aceeași capcană ca la profil, F2: citită la montare, interfața ar fi arătat un provider și ar fi trimis la altul). În preferințe a rămas doar ce chiar e configurare: care provider are cheie și care nu. Contrazice aparent D-15 („tema se schimbă doar din preferințe"), dar exact pe criteriul din D-15: tema e o preferință rară, providerul e o acțiune repetată.                                                                                                                                                                                                                                                      |
| D-25 | **Costul se calculează într-un singur loc (`src/lib/cost.ts`), din consumul raportat de provider și din prețurile din registru, care au data verificării** (F4.2)                  | Costul apare în două locuri (lângă mesaj și ca total); cu două formule, prima modificare de preț ar ajunge într-una singură. Tokenii nu se estimează — vin din `usage`, raportat exact de provider; o valoare lipsă e „necunoscut” (—), nu 0, care ar părea gratuit. Pe mesaj se salvează ingredientele costului (tokeni, provider, model, prețul de ATUNCI), nu cifra finală: o conversație în care s-a comutat providerul se calculează corect, iar o actualizare de preț nu rescrie retroactiv trecutul. **Corectat față de F4.1**, unde scria că tarifele nu se scriu în cod: se scriu, în registru, cu data verificării, iar `docs/<provider>/README.md` are aceleași cifre.                                                                                                                                                                                                                                             |
| D-26 | **Cache de răspunsuri în memoria serverului, accesat doar prin `src/lib/cache.ts` (`get`/`set`), cu cheia = provider + model + system prompt + hash pe mesaje** (F4.2)             | Cheia conține tot ce influențează răspunsul, inclusiv system prompt-ul — deci profilul. Consecință asumată: doi utilizatori nu împart niciodată un răspuns, rata de nimeriri e mică, iar cache-ul NU e o reducere de cost, ci o protecție la retrimiteri identice. Un cache care ar ignora profilul ar servi răspunsul unui om altuia — scurgere de date. „Mai încearcă” ocolește cache-ul (altfel butonul n-ar face nimic). Interfața asincronă, cu două funcții, permite mutarea pe un cache extern fără a atinge ruta; atunci devine integrare, cu doc propriu.                                                                                                                                                                                                                                                                                                                                                            |
| D-27 | **Limită de cereri pe minut în ruta de chat, în memorie, cu `429` + momentul reîncercării** (F4.2)                                                                                 | Oprește butonul ținut apăsat și bucla scăpată de sub control înainte să golească creditul. E protecție de bun-simț, NU măsură de securitate: pe mai multe instanțe fiecare numără separat, la repornire se resetează, iar IP-ul se poate varia. O limită reală cere un depozit partajat (Redis/KV).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

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

**Consecință, asumată la acest pas:** mesajele conversației deschise **nu se mai păstrau** la refresh sau la trecerea pe altă conversație. Lista de conversații și titlurile rămâneau (sunt în store, persistate); conversațiile inventate își păstrau conținutul, pentru că era un _seed_ din `src/lib/mock/`.
**Actualizat la F3.1:** persistarea istoricului chiar a fost livrată, dar tot prin `localStorage` — prin ACELAȘI store, cu mesajele arhivate la finalul fiecărui stream (vezi D-19, actualizată, și F3.1 mai jos) — nu printr-o bază de date. O bază de date reală (Supabase) rămâne F6; până atunci, istoricul are exact aceleași limite ca profilul (§8.2): legat de browserul curent, fără backup.

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

### F3 — Memorie între sesiuni ⏸ _deschisă — F3.1 și F3.2 livrate (2026-09-14)_ ← _faza curentă_

**Scop:** progresul se acumulează; UC-3 devine posibil.

> **Rămâne deschisă intenționat.** Pașii livrați (F3.1, F3.2) au rezolvat istoricul și afișarea lui; faptele reținute și strategia pentru limita de context **nu** au fost începute. F4 a intrat înaintea lor pentru că al doilea provider e ceea ce validează D-4 — o interfață „schimbabilă" scrisă cu un singur provider e o presupunere, nu o abstracție. Ordinea nu e o renunțare: F3 se reia după pasul de cost din F4 — **reluată de la 2026-09-16**, după F4.2. Strategia pentru limita de context are acum pe ce se sprijini: ponderea contextului retrimis se vede, măsurată, în header.

Livrează:

- ✅ istoricul conversațiilor, cu reluarea unei conversații anterioare — **F3.1**, mai jos
- ⬜ **fapte reținute** — informații pe care agentul le extrage și le păstrează separat de istoric („a terminat modulul de streaming")
- ⬜ o strategie explicită pentru limita de context: ce intră în prompt când istoricul crește peste ce încape

**Gata când:** închizi aplicația, o redeschizi, întrebi „ce urmează?" și răspunsul ține cont de ce ai terminat înainte.

Faza se împarte în pași, din același motiv ca F1: „istoricul supraviețuiește refresh-ului", „agentul reține fapte separat de istoric" și „strategia de context" sunt trei probleme diferite, cu bug-uri diferite dacă se depanează amestecate.

#### F3.1 — Arhivă de conversații, sincronizată la finalul streamului ✅ _livrat (2026-09-14)_

**Scop:** o conversație supraviețuiește unui refresh și comutării pe altă conversație — bug-ul lăsat deschis la F1.4 (D-19): hook-ul deținea mesajele cât timp trăia componenta, dar nimic nu le scria înapoi în starea persistată, deci dispăreau la primul refresh sau la prima schimbare de conversație.

Livrat:

- `Conversation` (`src/lib/types.ts`) redobândește `messages: UIMessage[]`, dar cu un rol diferit de cel dinainte de F1.4: nu e sursa de adevăr cât timp răspunsul curge — aceea rămâne `useChat` — ci ARHIVA, scrisă o singură dată, la final
- `src/store/useAppStore.ts`: acțiunea `syncConversationMessages(id, messages)`, apelată din `chat.tsx` la tranziția lui `status` dinspre „submitted"/„streaming" spre „ready"/„error" — nu la fiecare token. `persist` scrie sincron în `localStorage` la orice schimbare de stare din store; sincronizat la fiecare bucată de stream, o conversație de câteva zeci de mesaje ar fi însemnat sute de serializări ale întregului istoric în câteva secunde, adică o interfață vizibil blocată
- `src/components/chat/chat.tsx`: mesajele inițiale ale lui `useChat` se citesc din arhivă (`conversations[id].messages`), o singură dată, la montare — componenta se remontează oricum pe `key={conversationId}` la schimbarea conversației (existent din F1.4), deci „citire o dată la montare" acoperă și „comutarea încarcă mesajele conversației alese", fără nicio sincronizare manuală suplimentară în efecte
- `version: 3` + `migrate` în `useAppStore.ts`: conversațiile salvate înainte de acest pas fie n-au `messages` deloc (au fost șterse explicit la `version: 2`, F1.4), fie au formatul vechi, incompatibil cu `UIMessage`; migrarea le pornește cu `messages: []`, ca primul refresh de după update să nu crape citind o formă necunoscută — același compromis asumat deja o dată, la v2
- `src/lib/mock/conversations.ts` simplificat: `MOCK_CONVERSATIONS` conține acum mesajele direct; a dispărut `MOCK_MESSAGES`, exportul separat de dinainte — acum că `Conversation` are `messages`, ținerea lor în două locuri ar fi riscat exact contradicția pe care despărțirea inițială voia s-o evite
- **D-19 actualizată** (vezi §6): store-ul redevine „arhiva" — lista de conversații ȘI mesajele lor — dar sincronizate doar la finalul streamului, nu în timp real
- comparația store (Zustand) vs. `createContext`+`useContext`, ÎNCHISĂ pe cod real, nu doar pregătită ca discuție: **tema a ieșit din `useAppStore` și a trecut pe context propriu** (`src/components/theme/theme-provider.tsx` — vezi **D-15**, reimplementată). Provider scris de mână (`createContext`+`useState`), hook `useTheme()` care aruncă eroare clară în afara providerului, `resolveTheme(preference, systemPrefersDark)` ca singură regulă de decizie, pură și exportată separat, „sistem" ascultat cu `matchMedia(...).addEventListener` doar cât timp preferința chiar e „sistem", preferința salvată sub cheia ei proprie (`skillforge-theme`), cu punte temporară din cheia veche a store-ului pentru cine avea deja o alegere salvată. `src/components/ui/sonner.tsx` (excepție documentată la regula „nu se editează manual `src/components/ui/`") trece de la `next-themes` la `useTheme()`, ca notificările să urmeze tema aleasă, nu „system" implicit. Scriptul sincron din `layout.tsx` (previne flash-ul alb la încărcare) actualizat pe cheia nouă — capcana pasului: rămas pe cheia veche, n-ar mai fi găsit nimic. Context n-are selectors (orice consumator se re-randează la orice schimbare) și cere un provider în arbore; store-ul are selectors și se citește de oriunde, dar valoarea nu apare nicăieri în arborele de componente. Concluzia rămasă valabilă: valori rare, cu puțini consumatori → context (cazul temei); stare care se schimbă des și e citită din multe locuri → store (cazul conversațiilor)

**Ce NU intră aici, amânat explicit:** un răspuns întrerupt de un refresh chiar la mijlocul streamului se pierde — arhivarea așteaptă finalul, deci nu apucă să ruleze; persistență server-side (Supabase) rămâne F6, neschimbată față de §8.2 — istoricul are, de acum, exact aceleași limite ca profilul (legat de browser, fără backup, cu limita de câțiva MB a `localStorage`).

**Gata când:** o conversație supraviețuiește unui refresh; comutarea între conversații arată mesajele conversației alese, nu pe cele ale conversației anterioare; zece deschideri succesive ale aplicației nu adaugă nicio conversație goală în plus; DevTools arată o scriere în `localStorage` o singură dată, la finalul unui răspuns — nu la fiecare token.

**De discutat la curs, pe cod:** limita de câțiva MB a `localStorage` și ce se întâmplă când istoricul o atinge (F6 o rezolvă, nu F3.1); de ce un răspuns întrerupt de un refresh la mijlocul streamului rămâne pierdut chiar și după acest pas — compromisul conștient, până la un server care primește fiecare bucată pe măsură ce vine; store vs. `createContext`+`useContext`, pe comentariul din `useAppStore.ts`.

#### F3.2 — Finisaje UX: markdown, highlighting, editare mesaje ✅ _livrat (2026-09-14)_

**Scop:** conversația e legată de infrastructura reală (streaming, `status`) încă din F1.4/F1.2, dar mesajele erau afișate ca text brut, într-un singur paragraf. Pasul ăsta nu adaugă funcționalitate nouă, dar schimbă percepția: formatare care curge odată cu răspunsul, cod colorat cu buton de copiere, și posibilitatea de a corecta o întrebare formulată prost fără să pornești o conversație nouă.

Livrat:

- `src/components/chat/markdown.tsx` — **singurul** component care randează markdown, refolosit de `MessageItem` pentru orice rol. Zero logică de formatare în `message-list.tsx` sau `message-item.tsx`. Randare **sincronă** (`Markdown` din `react-markdown`, nu `MarkdownHooks`/`MarkdownAsync`), ca formatarea să apară la fiecare randare a mesajului care crește, nu cu un cadru de întârziere printr-un `useEffect`
- **regula de securitate a pasului**: pluginul `rehype-raw` (HTML brut în markdown) NU e activat, iar `dangerouslySetInnerHTML` nu apare nicăieri pe textul modelului — vezi comentariul din capul fișierului și rândul nou din `AGENTS.md`. Textul modelului e input necontrolat exact ca profilul (F2): un `<img onerror=...>` scris de model, randat ca HTML, ar fi XSS
- link-urile din răspuns primesc `target="_blank"` și `rel="noopener noreferrer"` printr-un renderer `a` propriu
- `remark-gfm` pentru tabele (și restul extensiilor GFM) — fără el, un tabel markdown standard nu e recunoscut de `react-markdown`
- `src/components/chat/code-block.tsx` — highlighting pe blocurile de cod, cu `react-syntax-highlighter` importat pe calea **directă** către build-ul „light" (`dist/esm/prism-light`), NU din pachetul principal, care re-exportă și variantele „grele" cu toate limbajele. Înregistrate explicit doar cele șapte limbaje cerute: `typescript`, `tsx`, `javascript`, `json`, `bash`, `sql`, `python`. Un limbaj nerecunoscut (sau un fence încă neînchis, la mijlocul streamului) nu crapă randarea — cade pe text simplu, verificat cu limbajul netransmis explicit când nu e din cele șapte
- **verificat, nu presupus**: bundle-ul chunk-ului principal a crescut cu ~216 KB necomprimat (440 KB → 656 KB) pentru markdown + highlighting + 7 limbaje + 2 teme de highlight (`one-dark`/`one-light`, urmărind tema aplicației prin `useTheme()`) — măsurat cu build înainte/după pe `git stash`, nu estimat
- buton de copiere pe fiecare bloc de cod, cu aceeași verificare de context securizat ca restul copierilor din aplicație (`useClipboardAvailable`) și aceeași notificare (`sonner`) — niciun state nou pentru asta, în afara unui `copied` local pentru iconița Check/Copy
- indicatorul „scrie…" — verificat, nu rescris: era deja derivat din `status === "submitted"` din F1.4 (`chat.tsx` → `isWaiting` → `MessageList`); pasul ăsta doar confirmă că cerința era deja satisfăcută
- **editare + retrimitere pe mesajele utilizatorului** (`message-item.tsx`): buton de editare (creion), vizibil doar pe rolul `user`, care înlocuiește bula cu un `Textarea` controlat local. La salvare, `chat.tsx` apelează `sendMessage({ text, messageId })` — **exact ce oferă SDK-ul pentru asta**, nu un `setMessages` scris manual: cu `messageId`, `useChat` taie singur `state.messages` la acel mesaj (deci și răspunsul vechi de după el) și îl înlocuiește cu textul nou, într-o singură operație. Un singur fir de conversație, nu două paralele
- editarea e dezactivată cât timp `isBusy` (același prop care dezactivează și reluarea răspunsurilor) — altfel s-ar retrimite peste un stream activ, cu rezultatul depinzând de care din cele două cereri termină prima
- **optimistic UI fără o a doua sursă de adevăr**: mesajul propriu apare instant fiindcă `sendMessage` îl pune deja în lista lui `useChat` — nimic nou de ținut „ca să apară rapid"
- dependențe noi (nu integrări — fără cont, fără cheie, deci fără folder în `docs/`): `react-markdown`, `remark-gfm`, `react-syntax-highlighter` + `@types/react-syntax-highlighter`. Notate în `README.md`, la secțiunea de dependențe

**Verificat:** un răspuns lung cu titluri, listă, tabel și două blocuri de cod în limbaje diferite (TypeScript și SQL) — cerut explicit modelului — se vede formatat **cât timp curge**, nu doar la final (verificat cu Chromium headless: titlu și cod prezente în DOM înainte ca butonul „Stop" să dispară). O simulare separată, cu `react-dom/server`, a randat 570 de tăieturi progresive ale unui răspuns cu fence-uri și tabel neterminate — nicio randare n-a aruncat. Editarea unui mesaj din mijlocul unei conversații de test a lăsat exact un răspuns nou, nu două. Build-ul trece și fără nicio cheie de API (verificat ca la fiecare pas, `.env.local` mutat deoparte).

**Ce NU intră aici, amânat explicit:** editarea răspunsurilor ASISTENTULUI (rămâne doar reluare, `regenerate`); un plugin de tip „prose" pentru markdown (stilul vine din clase Tailwind puse direct pe fiecare element, în `components` din `markdown.tsx` — nicio dependență nouă doar pentru stilizare); alte limbaje de highlighting decât cele șapte cerute — un al optulea limbaj se adaugă cu o linie de import și o înregistrare, nu cu o rescriere.

**De discutat la curs:** de ce conținutul generat de un model se tratează ca input de utilizator, la fel ca profilul (§8.2) — sursa e diferită, riscul (XSS prin randare necontrolată) e același; ce înseamnă „optimistic" într-o aplicație care oricum are răspuns în streaming — aici optimistic UI înseamnă doar „nu aștepți un răspuns de la server ca să-ți vezi PROPRIUL mesaj", nu o predicție a răspunsului; de ce fiecare editare + retrimitere costă din nou tot istoricul (system prompt inclus) — nu e o operație locală, e o cerere nouă completă către model.

---

### F4 — Al doilea provider și comparație ✅ _încheiată (2026-09-16)_

**Scop:** D-4 devine real și verificabil.

Livrează:

- ✅ interfața comună de provider, cu Anthropic și OpenAI ca implementări — **F4.1**
- ✅ comutare de provider/model din interfață — **F4.1**
- ✅ afișarea consumului: tokeni de intrare/ieșire și cost per răspuns, plus totalul pe conversație — **F4.2**
- ✅ `docs/openai/README.md` — pașii manuali pentru a doua cheie — **F4.1**

**Gata când:** aceeași întrebare poate fi trimisă la ambii provideri, iar diferența de răspuns și de cost e vizibilă.

> **Criteriul e verificat în ambele jumătăți.** Aceeași întrebare pe cei doi provideri dă două răspunsuri (F4.1) și, de la F4.2, două costuri vizibile lângă răspuns: aceeași întrebare scurtă a raportat 399 → 57 tokeni pe Claude Haiku 4.5 și 366 → 22 pe GPT-5.6 Luna, la prețuri de 5× diferență pe intrare.

#### F4.1 — Comutatorul și abstracția din spatele lui ✅ _livrat (2026-09-14)_

**Scop:** providerul se schimbă din interfață, pentru mesajul următor, iar adăugarea celui de-al treilea să nu ceară cod nou prin interfață.

Motivul pentru care abstracția intră **acum** și nu la F1.4: o interfață de provider scrisă cu un singur provider e o presupunere care se verifică singură. Testul ei nu e cât de elegant arată, ci câte fișiere trebuie atinse pentru a doua implementare. Aici răspunsul a fost **două** — registrul și fabrica de modele — și niciunul din ele nu e un component.

Livrat:

- `src/lib/providers.ts` — registrul rămâne **singura** listă de provideri: `id`, `label`, `modelId`, `modelLabel` și **numele** variabilei de mediu (`apiKeyEnvVar`). Ordinea din registru e ordinea din interfață, iar Anthropic rămâne primul și implicit — pe creditele lui rulează cursul. `resolveProviderId()` validează contra registrului orice id venit din afară (corp de cerere, `localStorage`)
- `src/lib/providers.server.ts` — **fișier nou, doar de server**: `getModel(providerId, modelId)` și `isProviderConfigured(providerId)`. `getModel` e SINGURUL loc din aplicație care instanțiază un SDK de provider, iar `MODEL_FACTORIES` e un `Record<ProviderId, …>` — deci compilatorul CERE o ramură pentru fiecare intrare din registru. O opțiune care arată bine în interfață și crapă la trimitere nu poate exista
- `src/app/api/providers/route.ts` — **rută nouă**: întoarce, per provider, `configured` + `unavailableReason`. Clientul nu atinge niciodată `process.env`, nici măcar pentru un `Boolean(...)`; primește un verdict gata calculat. Nicio valoare de cheie nu pleacă spre browser, nici trunchiată
- `src/components/chat/provider-picker.tsx` — comutatorul, **lângă caseta de scris**, cu numele modelului sub fiecare opțiune. Un provider fără cheie rămâne în listă, **dezactivat, cu motivul într-un tooltip**
- `src/app/api/chat/route.ts` — primește `providerId` și `modelId` din corpul cererii, le validează contra registrului și construiește modelul prin `getModel`. Mesajele de eroare se compun din registru, nu cu numele unui provider scris de mână — altfel o cheie greșită de OpenAI ar fi trimis omul să verifice `ANTHROPIC_API_KEY`
- `src/components/settings/providers-form.tsx` — secțiunea din preferințe **nu mai e comutator**, ci stare: care provider are cheie și care nu, cu motivul. Și-a pierdut și textul devenit fals („încă nu se cheamă niciun model")
- `@ai-sdk/openai` ca dependență nouă, `docs/openai/README.md`, rândul din indexul de integrări și `OPENAI_API_KEY` în `.env.example`
- skill nou, `add-provider` (oglindit în `.github/skills/`): rețeta completă, în ordine, plus semnele că abstracția a curs

**Ce NU intră aici, amânat explicit la F4.2:** prețuri, numărat de tokeni, comparație între modele. Fiecare e un pas separat; aici s-a construit doar comutatorul și abstracția din spatele lui. Tot amânat: mai multe modele pentru același provider — registrul are azi un model per provider, iar `getModel` validează exact contra lui.

**Unde a rămas o muchie ascuțită, conștient:** dacă în `localStorage` rămâne selectat un provider căruia i s-a șters cheia între timp, aplicația **nu** comută tăcut pe altul. Trimiterea răspunde cu `400` și cu motivul scris, iar opțiunea se vede dezactivată în listă. O comutare automată ar fi însemnat că aplicația cheltuie pe alt buget decât cel arătat pe ecran — preferăm un mesaj clar unei surprize pe factură.

**Gata când:** aceeași întrebare trimisă pe cele două opțiuni dă două răspunsuri diferite; cu a doua cheie absentă, opțiunea apare dezactivată cu motiv și aplicația merge mai departe pe primul provider. **Verificat**, nu presupus: `GET /api/providers` întoarce doar verdicte (`configured` + motiv), fără nicio urmă de cheie; același mesaj a primit „Sunt Claude…" pe Anthropic și „Sunt ChatGPT…" pe OpenAI; un `providerId` fabricat (`acme-ai`) și un `modelId` fabricat (`gpt-9-turbo-ultra`) au căzut pe implicit și au răspuns normal, cu avertisment în logul serverului; un `modelId` plauzibil dar nefolosit (`gpt-4o-mini`) a rămas pe providerul cerut, dar cu modelul din registru; cu `OPENAI_API_KEY` golită, ruta a răspuns `400` cu mesajul care numește variabila, iar Anthropic a continuat să răspundă pe același server.

A fixat deciziile **D-22**, **D-23** și **D-24** — vezi §6.

**De discutat la curs, pe cod:** de ce un registru bate un lanț de `if`-uri, și cum ar arăta același cod la patru provideri (trei fișiere de editat, trei locuri de uitat); ce înseamnă că fiecare provider are propriul pachet de SDK, scris de altă echipă peste alt API HTTP, dar interfața de apel rămâne aceeași — `streamText` nu știe cu cine vorbește; și de ce „configurat" e o proprietate a **serverului**, nu a browserului, plus de ce tentația `NEXT_PUBLIC_OPENAI_CONFIGURED` e greșită de două ori (a doua sursă de adevăr, și obiceiul de a pune lucruri despre chei în variabile publice).

#### F4.2 — Consum, cost și plase de siguranță ✅ _livrat (2026-09-16)_

**Scop:** aplicația spune cât cheltuie, în loc ca utilizatorul să afle din factură. Până aici, fiecare răspuns costa ceva și nimic din interfață nu spunea cât — cea mai frecventă surpriză neplăcută a unui proiect cu LLM-uri.

Poanta pasului: costul unui răspuns **nu** e proporțional cu lungimea întrebării, ci cu lungimea **întregului context** trimis. De aceea măsurarea vine înaintea oricărei optimizări — altfel se optimizează după intuiție.

Livrat:

- **prețurile în registru** (`src/lib/providers.ts`): `pricing` per model, intrare/ieșire per milion de tokeni, cu `verifiedAt` — citite din paginile oficiale la 2026-09-16 (Claude Haiku 4.5: $1 / $5; GPT-5.6 Luna: $0,20 / $1,20). Aceleași cifre, cu aceeași dată, în `docs/anthropic/README.md` și `docs/openai/README.md`. Vezi **D-25**
- **`src/lib/cost.ts`** — singura formulă: tokeni × preț / 1.000.000, separat pe intrare și ieșire; `undefined` intră → `undefined` iese (afișat „—”, niciodată `NaN` sau `0`). Tot aici, formatarea sumelor și a tokenilor, ca aceeași valoare să arate la fel peste tot
- **consumul pe mesaj**: ruta citește `usage` raportat de provider și îl lipește de mesajul asistentului ca `metadata` (provider, model, prețul de atunci, tokeni, sursă „model”/„cache”), care se arhivează cu mesajul (D-19). Detaliu de AI SDK 7, verificat în sursă: callback-ul de final al lui `streamText` se numește acum `onEnd` (`onFinish` e `@deprecated`) și rulează DUPĂ ce evenimentul `finish` a plecat spre browser — deci metadatele pleacă prin `messageMetadata` pe partea `finish` (`totalUsage`, aceeași valoare), iar `onEnd` scrie în cache
- **sub fiecare răspuns**, discret (text mic, estompat, fără culoare de alarmă): tokeni intrare · ieșire · cost; în tooltip — cât din intrare e **context retrimis** (system prompt + istoric) și cât e nou, costul fiecărei părți, modelul și data prețului. Partea retrimisă nu se estimează: se deduce din cifrele raportate (intrarea + ieșirea răspunsului anterior), și e „—” când deducția nu e sigură (răspuns anterior nemăsurat sau alt model/tokenizer)
- **totalul pe conversație**, în header (`conversation-cost.tsx`), din arhivă — costul există abia la finalul streamului, exact când se arhivează — cu ponderea contextului retrimis, răspunsurile din cache și cele nemăsurate; cu răspunsuri nemăsurate, totalul se scrie ca minim („≥”)
- **cache** (`src/lib/cache.ts`): interfață `get`/`set` asincronă, implementare în memorie (200 de intrări, 10 minute), cheie SHA-256 peste provider + model + system prompt + mesajele în format de model (fără `id`-urile din browser). La o nimerire, textul salvat se **redă ca stream** în același protocol, iar răspunsul e marcat „din cache”, cu cost zero. Se cachează doar răspunsurile complete (`finishReason === "stop"`). Vezi **D-26**
- **„mai încearcă” ocolește cache-ul**: clientul trimite `trigger` în corp; la `regenerate-message` ruta nu citește din cache (doar scrie rezultatul nou)
- **limită de cereri** (`src/lib/rate-limit.ts`): 10 pe minut per IP, fereastră glisantă, verificată prima în rută; răspuns `429` cu `Retry-After` și `retryAt`. În interfață, o alertă neutră „Pauză scurtă” (nu roșie) cu ora locală de la care se poate trimite din nou — tipul erorii se alege dintr-un registru (`describeChatError` + `ERROR_PRESENTATION`), nu din `if`-uri pe text. Vezi **D-27**
- fără `version` nou în `persist`: `metadata` exista deja, opțional, în tipul `UIMessage`; mesajele vechi, fără el, sunt valide și se citesc ca „nemăsurate” printr-o validare explicită (`messageUsage` din `message-utils.ts`), nu printr-o migrare

**Ce NU se cachează, decis explicit:** nicio cheie care ar conține date personale fără profil (cheia include mereu system prompt-ul întreg); nimic la care utilizatorul a cerut explicit reluare; niciun răspuns incomplet (oprit, tăiat, eșuat).

**Unde a rămas o muchie ascuțită, conștient:**

- un răspuns oprit cu „Stop” sau întrerupt de o eroare **se plătește** la provider, dar nu are consum raportat — apare ca „nemăsurat” în total, nu ca gratuit;
- OpenAI cachează automat prefixele lungi și le taxează mai ieftin, iar peste pragul de context lung taxează mai scump; formula folosește doar prețul de bază, deci pentru OpenAI costul afișat e o aproximare în ambele direcții pe conversații foarte lungi (vezi `docs/openai/README.md`);
- cache-ul și contorul de cereri sunt per instanță și se golesc la repornire — pe Vercel, o retrimitere poate ajunge pe altă instanță și se plătește din nou.

**Gata când / verificat** (2026-09-16, pe `next dev`, cu chei reale):

- aceeași întrebare, cu același profil, de două ori prin `curl`: prima `source: "model"` (399 → 57 tokeni, ~1,9 s), a doua `source: "cache"`, aceiași tokeni, ~0,5 s; în browser, a doua apare „din cache · … · 0,00 USD”, iar totalul conversației nu crește;
- „mai încearcă” pe răspunsul din cache a chemat modelul (66 de tokeni de ieșire în loc de 56, cost nou) — nu a întors textul salvat;
- același mesaj cu alt obiectiv în profil a mers la model, nu la cache;
- o conversație de două mesaje: al doilea răspuns — 561 intrare, din care 541 retrimis (= 468 + 73 de la primul) și 20 noi; totalul din header e suma celor două;
- 12 cereri trimise în rafală: după a zecea din minut, `429` cu `Retry-After` și `retryAt`; în interfață, „Pauză scurtă … Poți trimite din nou de la ora 18:07:47.”

**De discutat la curs:**

- **de ce costul crește cu pătratul lungimii conversației** când se retrimite tot istoricul: mesajul _k_ trimite la intrare toate cele _k−1_ schimburi dinainte, deci o conversație de _n_ mesaje plătește la intrare ~1 + 2 + … + _n_ ≈ _n_²/2 „mesaje”. Dublezi lungimea, cvadruplezi costul de intrare. Se vede direct în aplicație: ponderea „context retrimis” din header crește cu fiecare mesaj;
- ce înseamnă asta pentru un chat lung: după câteva zeci de mesaje, aproape tot ce plătești e istoric pe care modelul l-a văzut deja — iar „o conversație nouă” e cea mai ieftină optimizare disponibilă azi;
- **cele trei pârghii reale de cost**: model mai mic (un ordin de mărime între tier-uri — vezi tabelele din `docs/`), istoric mai scurt (strategia de context din F3) și mai puține retrimiteri (cache-ul și limita de cereri de aici). Streamingul, formularea promptului sau „cuvinte mai puține în întrebare” nu sunt pârghii serioase;
- de ce cache-ul de aici NU e o reducere de cost (cheia conține profilul) și de ce un cache care ar ignora profilul ar fi o scurgere de date, nu o optimizare;
- de ce o limită de cereri în memorie nu e securitate (instanțe multiple, repornire, IP variabil) — și de ce e totuși utilă.

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
- ⬜ monitorizarea erorilor și a consumului de tokeni — **agregat, pe server**. Consumul per răspuns și per conversație se vede în interfață de la F4.2, dar doar în browserul utilizatorului; „cât a costat ultima săptămână” cere încă un loc central

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

| Fază  | Unde stau                        | Cine le mai vede                                                                                                                                                      |
| ----- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F2–F5 | `localStorage`, în browserul tău | **Providerul ales pentru mesajul respectiv** — Anthropic sau, de la F4.1, OpenAI (profilul intră în system prompt, construit pe server în `src/lib/system-prompt.ts`) |
| F6+   | Supabase, legate de contul tău   | Idem, plus furnizorul bazei de date                                                                                                                                   |

Rămâne așa **până la F6**: momentul migrării la Supabase, cu autentificare reală, e trigger-ul care schimbă și modelul de date personale, nu doar locul de stocare.

**Consecința comutatorului de provider (F4.1), spusă explicit:** de la pasul acela, profilul nu mai pleacă mereu către același destinatar. Comutarea din composer schimbă cine primește system prompt-ul — deci și profilul — pentru mesajul următor. Nu sunt date trimise în plus, dar sunt **doi** procesatori posibili în loc de unul, iar utilizatorul vede în orice moment lângă casetă către cine pleacă mesajul următor.

**De ce e un risc acceptabil deocamdată:** un singur utilizator local, fără cont și fără parteneri terți în afară de providerul LLM ales (deja acoperit de §8.1); nimic din profil nu e o categorie specială de date (sănătate, origine, opinii); volumul e mic (câteva câmpuri text) și complet vizibil și editabil de utilizator în orice moment, din formularul de profil — nu există procesare ascunsă. Compromisul e explicit: viteza de a ajunge la partea de agent, nu o alegere de arhitectură definitivă.

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

**Ce se măsoară efectiv (de la F4.2):**

- pentru fiecare răspuns: tokenii de intrare și de ieșire **raportați de provider** (nu estimați), providerul, modelul și prețul valabil la momentul generării; costul se calculează din ele într-un singur loc, `src/lib/cost.ts` (D-25);
- o valoare lipsă de la provider e „necunoscut” și se afișează „—”, niciodată `0`;
- din intrarea fiecărui răspuns, partea de **context retrimis** (system prompt + istoric), dedusă din cifrele raportate ale răspunsului anterior;
- pe conversație: totalul, ponderea contextului retrimis, răspunsurile din cache (gratuite) și cele nemăsurate (total afișat ca minim).

**Unde se vede:** sub fiecare răspuns al asistentului (discret, cu detaliile în tooltip) și în bara de sus, pentru conversația deschisă. Doar în browserul utilizatorului — nu există încă o agregare pe server (F7).

**Unde stau prețurile:** în registrul `src/lib/providers.ts`, per model, cu data verificării, citite din pagina oficială de prețuri. Aceleași cifre, cu aceeași dată, în `docs/anthropic/README.md` și `docs/openai/README.md`. Când se schimbă modelul sau prețul, se schimbă în ambele locuri, în același commit.

**Protecții existente:**

- **limită de cereri**: 10 pe minut per client, în ruta de chat, cu `429` și momentul reîncercării afișat clar (D-27) — protecție de bun-simț împotriva retrimiterilor în buclă, nu măsură de securitate;
- **cache de răspunsuri identice**: aceeași întrebare, cu același context și profil, pe același model, nu se plătește a doua oară în 10 minute (D-26) — protecție la retrimiteri, nu reducere de cost (cheia conține profilul, deci nimeririle sunt rare);
- **limita de cheltuială din contul providerului** rămâne singura plasă reală la nivel de cont — pasul manual din `docs/<provider>/README.md`.

Ce contează pentru această aplicație:

- **System prompt-ul se plătește la fiecare mesaj.** Profilul intră în fiecare request, deci un profil care crește necontrolat crește costul fiecărui răspuns. La F3 asta devine o constrângere reală de design pentru memorie.
- **Istoricul conversației se retrimite** la fiecare mesaj, deci costul de intrare al unei conversații crește cu **pătratul** lungimii ei (vezi „De discutat” la F4.2). Pârghiile reale sunt trei: model mai mic, istoric mai scurt, mai puține retrimiteri.
- Streamingul nu schimbă costul, doar percepția de viteză.
- Un răspuns oprit cu „Stop” se plătește, dar nu are consum raportat.
- Uneltele (F5) adaugă apeluri suplimentare pentru același răspuns.

**Buget de lucru pentru curs:** dezvoltarea și testarea manuală a acestei aplicații se încadrează în câțiva dolari pe provider, dacă se folosesc modele mici pentru dezvoltare și cele mari doar pentru verificarea calității răspunsurilor. Ordin de mărime măsurat: un răspuns scurt pe Claude Haiku 4.5 costă sub o zecime de cent.

### 8.4 Performanță

- **Primul token vizibil rapid** este cerința care contează, nu durata totală: un plan de 3 luni e un răspuns lung prin natura lui.
- Interfața arată clar că lucrează, între trimiterea întrebării și primul token.
- Un răspuns în curs poate fi oprit.

### 8.5 Erori și limite

Aplicația spune ce s-a întâmplat, în loc să eșueze mut. Situațiile care se tratează explicit:

- cheie de API lipsă sau invalidă → mesaj care spune ce variabilă lipsește (fără să afișeze valori)
- rate limit sau provider indisponibil → mesaj distinct de o eroare de cod
- limita de cereri a aplicației (F4.2) → alertă neutră, nu roșie, cu ora locală de la care se poate trimite din nou — nu o eroare tehnică
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

| Data       | Ce s-a schimbat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-02 | Versiune inițială: scop, persone, faze F0–F7, cerințe non-funcționale, glosar. Decizii fixate: Next.js + TypeScript, agent pe server, `localStorage` în F2 cu migrare la Supabase în F6, Anthropic + OpenAI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-09-02 | F0 încheiată. F1 devine faza curentă și se împarte în F1.1 (schelet, livrat) și F1.2 (chat cu streaming). Adăugate deciziile D-9 (UI din shadcn/ui), D-10 (Prettier cu setări comise), D-11 (blocul `next dev` în `AGENTS.md`). §8.6 modificată: **comentariile din cod se scriu în română** și explică _de ce_, restul codului rămâne în engleză.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-02 | F1 împărțită în trei pași; **F1.2 (interfața completă pe date inventate) livrată**, F1.3 (chat cu streaming) devine pasul curent. Adăugate deciziile D-12…D-16. Aduse mai devreme, doar ca interfață, formularul de profil (din F2) și selecția de provider (din F4). Deployul pe Vercel se mută din F7 în F1.2, ca versiune de siguranță înainte de orice integrare.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-07 | §10 actualizată: șablonul integrărilor s-a mutat din `docs/_TEMPLATE-integrare.md` în `docs/_template/README.md`, cu 6 secțiuni obligatorii (Ce face, Cont & chei, Variabile de mediu, Pași manuali, Cost & limite, Verificare); a apărut `docs/README.md` ca index, cu tabelul integrărilor. Reparate două goluri rămase din reorganizarea F1.2: pagina „/" nu mai lega spre „/demo", iar `Counter`/`ServerClock` (perechea client/server din F1.1) nu mai erau randate nicăieri. Adăugat în `README.md` un tabel de comparație Vite ↔ Next.js.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-09-07 | F1.3 redefinită: **streaming de la server fără model** (livrat) — ruta `api/about`, secțiunea „Despre aplicație”, protocol SSE citit de mână. Chatul cu model real devine **F1.4**, pasul curent. Adăugate deciziile D-17 (SSE, nu WebSocket/polling) și D-18 (payload codat cu `JSON.stringify`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-07 | F1.3 verificată pe Next 16 și corectate două detalii care veneau din obiceiuri de Next 14/15: `export const dynamic = "force-dynamic"` a fost **scos** din `api/about/route.ts` (în Next 16 Route Handlers nu se cachează implicit, cache-ul se cere cu `force-static`), iar nota despre runtime spune acum că **Edge Runtime e deprecat** în Next 16 și `nodejs` e implicitul. Streamingul nu depinde de Edge — `ReadableStream` merge pe ambele.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-07 | **F1.4 livrată**: chat cu model real (Anthropic prin AI SDK-ul Vercel), streaming în interfață, cheie doar pe server, cheie lipsă tratată ca 400 cu mesaj clar. Adăugate deciziile D-19 (mesajele conversației deschise aparțin lui `useChat`; store-ul ține lista) și D-20 (AI SDK-ul Vercel ca strat peste provideri). **Corectat față de ce scria aici**: `sendMessage` din store nu a fost rescrisă, ci ștearsă — cu consecința, asumată, că transcrierea nu supraviețuiește unui refresh până la F3. Apărut `src/lib/providers.ts` (registru cu `modelId`) și `docs/anthropic/README.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-07 | **F1.5 încheiată** (nimic de construit, doar amânări documentate) și **F2 livrată**: `src/lib/system-prompt.ts` — persona de mentor de carieră tech, cu rol/domeniu, guardrail-uri și secțiunea de profil separate explicit, plus normalizarea profilului (input neîncredere) pe server. Profilul călătorește de la client la server la fiecare mesaj prin `prepareSendMessagesRequest`, citit din store la momentul trimiterii, nu la montare. Adăugate în interfață: indicator de profil activ pe ecranul de conversație nouă și buton „Șterge profilul" cu explicația unde stă / cine îl vede. §8.2 rescrisă cu câmpurile colectate efectiv și motivul pentru care riscul `localStorage` e acceptabil până la F6. **În treacăt, reparat un bug preexistent** (necomis) în `src/lib/providers.ts`/`types.ts`: intrarea `anthropic` avea `id: "anthropic-haiku"`, rămas dintr-un refactor anterior, ceea ce rupea `npm run build`; `"anthropic-haiku"` a fost scos din `ProviderId`, fiindcă nu mai era folosit ca valoare distinctă nicăieri.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-09 | Adăugată **F2.5 — Deploy cu chei reale, configurate în platformă**, ca fază proprie, imediat după F2: cheile de provider pleacă din laptop spre Vercel (Production + Preview), cu verificarea că build-ul trece și fără nicio cheie. Mutată **cu urmă** din F7 (bulletul „variabilele de mediu ale providerilor" e marcat ✅, cu notă „mutat în F2.5"); F7 devine **doar Monitorizare** — și-a schimbat și titlul. Numerotarea F3–F7 **nu s-a schimbat**: F2.5 e sub-fază, ca F1.1–F1.5, tocmai ca să nu invalideze referirile la F3/F4/F5/F6/F7 deja scrise ca comentarii în cod (16 fișiere). Apărută convenția de skill-uri: `.claude/skills/`, oglindit în `.github/skills/`, sincronizate cu `scripts/sync-skills.sh`. **Corectat în treacăt**: marcajul „← faza curentă" rămăsese pe titlul lui F1 din F1.2 încoace, deși F1 s-a încheiat la F1.5 și F2 s-a livrat între timp — mutat acum pe F2.5, singura fază reală în lucru.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-09 | **F2.5 încheiată** (aplicația e publicată, cu `ANTHROPIC_API_KEY` reală în Vercel) și adăugată **F2.6 — Acțiuni pe conversație și export**, imediat livrată: reluare pe mesaj (`regenerate()`, cu confirmare doar când taie și mesaje de după cel reluat), copiere pe mesaj (cu ascundere dacă `navigator.clipboard` lipsește — context nesecurizat), export al conversației deschise ca JSON și Markdown din aceeași structură intermediară (`src/lib/message-utils.ts`, funcții pure) și descărcare directă din browser (`src/lib/download-file.ts`, fără endpoint nou). Adăugată decizia **D-21**: puntea `src/lib/active-conversation-bridge.ts`, prin care header-ul (component frate cu `Chat`) citește o dată, la export, instantaneul de mesaje publicat de `chat.tsx` — un instantaneu, nu un abonament, deci nu contrazice D-19. Adăugat `src/components/ui/alert-dialog.tsx` (shadcn) pentru confirmarea reluării unui răspuns mai vechi. §8.2 primește o regulă permanentă nouă: exportul scoate profilul din aplicație, în fișierul descărcat. **F3 — Memorie între sesiuni** devine faza curentă.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-14 | Adăugată **F3.1 — Arhivă de conversații, sincronizată la finalul streamului**, livrată: `Conversation` redobândește `messages`, dar ca ARHIVĂ (nu ca sursă de adevăr în timpul streamului) — scrisă o singură dată, la tranziția lui `status` spre „ready"/„error", prin acțiunea nouă `syncConversationMessages` din `useAppStore.ts`; mesajele inițiale ale lui `useChat` se citesc din arhivă la montare, folosind remontarea pe `key` deja existentă din F1.4. `version: 3` + `migrate` pentru conversațiile salvate fără `messages` valid. **D-19 actualizată** (vezi §6) pentru noul rol al store-ului; **corectată** afirmația din F1.4 că persistarea istoricului ar cere neapărat o bază de date — rămâne în `localStorage`, prin același store, cu aceleași limite ca profilul (§8.2), până la Supabase în F6. Compromis asumat, neschimbat: un răspuns întrerupt de refresh chiar la mijlocul streamului se pierde. `src/lib/mock/conversations.ts` simplificat (a dispărut `MOCK_MESSAGES`, separat de `MOCK_CONVERSATIONS`). Rămân neîncepute în F3: fapte reținute, strategia pentru limita de context.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-14 | **D-15 reimplementată** (nu e cerință nouă): tema a ieșit din `useAppStore` (Zustand) și a trecut pe un mecanism propriu, `createContext`+`useContext` (`src/components/theme/theme-provider.tsx`) — pasul didactic unde se închide, pe cod real, comparația store-vs-context pregătită la F3.1. Provider scris de mână (`createContext`+`useState`), `useTheme()` aruncă eroare clară dacă lipsește providerul, `resolveTheme(preference, systemPrefersDark)` rămâne singura regulă de decizie, pură și exportată separat; „sistem" ascultă `matchMedia("(prefers-color-scheme: dark)")` cu `addEventListener`, abonat doar cât timp preferința e „sistem". Preferința se salvează sub cheia ei proprie, `skillforge-theme` (nu mai sub `skillforge-app`), citită cu lazy initializer în `try/catch`; punte temporară din cheia veche pentru cine avea deja o alegere salvată. `theme`/`setTheme` au ieșit din `AppState` și din `partialize` — o singură sursă de adevăr pentru preferință. Scriptul sincron din `layout.tsx`, care previne flash-ul alb la încărcare, actualizat pe cheia nouă (capcana pasului: rămas pe cea veche, n-ar mai fi găsit nimic). `src/components/ui/sonner.tsx` trece de la `next-themes` la `useTheme()` — **excepție documentată** la regula „nu se editează manual `src/components/ui/`", altfel notificările ar fi rămas mereu pe „system"; `next-themes` rămâne în `package.json` ca dependență a lui `sonner`, nefolosită direct.                                                                                                         |
| 2026-09-14 | Adăugată **F3.2 — Finisaje UX: markdown, highlighting, editare mesaje**, imediat livrată: `src/components/chat/markdown.tsx` (singurul component de randare markdown, fără `rehype-raw`, fără `dangerouslySetInnerHTML` pe text de la model), `src/components/chat/code-block.tsx` (highlighting cu `react-syntax-highlighter`, build „light", 7 limbaje înregistrate explicit — `typescript`, `tsx`, `javascript`, `json`, `bash`, `sql`, `python` — plus buton de copiere). Bundle-ul chunk-ului principal a crescut cu ~216 KB necomprimat, măsurat înainte/după cu `git stash`, nu presupus. Editare + retrimitere pe mesajele utilizatorului, în `message-item.tsx`/`chat.tsx`: `sendMessage({ text, messageId })` — mecanismul nativ al SDK-ului, nu un `setMessages` scris manual — taie și înlocuiește un singur fir, nu două paralele; dezactivată cât timp `isBusy`. Indicatorul „scrie…" era deja derivat din `status` din F1.4 — verificat, nu rescris. Dependențe noi (nu integrări): `react-markdown`, `remark-gfm`, `react-syntax-highlighter` + `@types/react-syntax-highlighter`, notate în `README.md`. Regulă nouă de securitate în `AGENTS.md`: conținutul de la model se randează fără HTML brut, printr-un singur component reutilizat. F3 rămâne faza curentă — neîncepute încă: fapte reținute, strategia pentru limita de context.                                                                                                                                                                                                                      |
| 2026-09-14 | **F4 devine faza curentă și e livrată PARȚIAL**, prin pasul **F4.1 — Comutatorul și abstracția din spatele lui**: interfața comună de provider (Anthropic + OpenAI), comutare din interfață și `docs/openai/README.md` sunt gata; **afișarea consumului și a costului NU** — rămâne F4.2, scris explicit ca faza să nu pară închisă. `src/lib/providers.ts` rămâne singura listă (cu `apiKeyEnvVar` — NUMELE variabilei, nu valoarea) și capătă `resolveProviderId()`; a apărut `src/lib/providers.server.ts` cu `getModel()` (singurul loc care instanțiază un SDK, cu `MODEL_FACTORIES` ca `Record<ProviderId, …>`, deci ramura e cerută de compilator) și `isProviderConfigured()`; rută nouă `GET /api/providers`, care trimite spre browser doar verdicte + motiv, niciodată valori de chei; comutatorul a intrat în composer (`provider-picker.tsx`), iar secțiunea din preferințe a devenit stare de configurare, nu comutator. `/api/chat` primește `providerId`/`modelId` la fiecare mesaj, le validează contra registrului (id fabricat → implicit) și compune mesajele de eroare din registru. Câmpul `implemented` din registru a dispărut: nu mai are sens când fiecare intrare are, prin tip, o implementare. Adăugate deciziile **D-22**, **D-23**, **D-24**. §8.2 actualizată — profilul poate pleca acum spre oricare dintre cei doi provideri, în funcție de alegerea de la momentul mesajului. Skill nou: `add-provider`. **F3 rămâne deschisă** (fapte reținute, strategia pentru limita de context — neîncepute), marcată ca atare ca să nu pară încheiată. |
| 2026-09-16 | **F4.2 livrată, F4 încheiată**: consumul raportat de provider pe fiecare mesaj (metadate arhivate cu mesajul), cost per răspuns și total pe conversație, cu ponderea contextului retrimis; formula într-un singur loc (`src/lib/cost.ts`); prețurile în registru cu data verificării (**corectat** față de F4.1, unde scria că tarifele nu intră în cod); cache de răspunsuri identice în memorie (`src/lib/cache.ts`, redat ca stream, marcat în interfață, ocolit de „mai încearcă”); limită de 10 cereri/minut cu `429` și alertă clară. Adăugate deciziile **D-25**, **D-26**, **D-27**. §8.3 rescrisă cu ce se măsoară, unde se vede și ce protecții există; §8.5 completată. Header-ul arată faza curentă: **F3 reluată**. Nicio integrare externă nouă (cache-ul și contorul sunt în memorie).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
