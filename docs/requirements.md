# SkillForge — Cerințe

> **Acest fișier este sursa de adevăr pentru ce construim.**
> Orice decizie luată pe parcurs se scrie aici, nu doar în conversație. Vezi [Cum se modifică acest document](#11-cum-se-modifică-acest-document).

Ultima actualizare: 2026-09-02

---

## 1. Ce este SkillForge

SkillForge este un **copilot personal de skills și carieră**: o aplicație web în care un agent AI îți cunoaște profilul real — stack-ul cu care lucrezi, skill-urile tale și nivelul la fiecare, obiectivul spre care mergi — și îți răspunde **în contextul tău**, propunându-ți pași concreți de învățare spre acel obiectiv.

Profilul nu se re-explică la fiecare conversație: el este salvat, crește în timp și devine baza fiecărui răspuns.

Aplicația este în același timp **proiectul-fir-roșu al unui curs**: se construiește modul cu modul, iar fiecare modul adaugă o bucată reală de integrare între un LLM și o interfață web — nu un exemplu de o singură pagină.

## 2. Pentru cine

Pentru oricine vrea să crească profesional și are nevoie de un plan, indiferent din ce direcție vine:

| Persona | Punct de plecare | Obiectiv tipic |
|---|---|---|
| Backend spre AI | Java/C#/Go, ani de experiență pe server | Web modern + AI engineering |
| Frontend care lărgește | React/TypeScript solid | Python sau Java, partea de backend |
| QA spre automatizare | Testare manuală, cunoștințe de domeniu | Automatizare, CI, cod de test |
| Junior nedecis | Bazele, fără direcție clară | Să afle ce merită aprofundat |

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

| # | Decizie | De ce |
|---|---|---|
| D-1 | **În centru stă un agent**, nu un formular care trimite text la model și afișează rezultatul | Agentul primește context (profil, memorie) și, din faza F5, decide singur să folosească unelte. Această diferență dictează structura codului de la început. |
| D-2 | **Next.js + TypeScript (strict)** | Un singur proiect care conține și UI-ul, și codul de server. TypeScript pentru că tipurile care traversează granița client/server (profil, mesaje, contract de provider) trebuie să fie explicite, nu presupuse. |
| D-3 | **Modelul se cheamă exclusiv de pe server** | Cheia de API nu ajunge niciodată în browser. Orice cod care atinge o cheie trăiește în partea de server. |
| D-4 | **Provider de LLM schimbabil**, în spatele unei interfețe tipizate | Ca să putem compara răspunsuri și costuri între Anthropic și OpenAI fără să rescriem aplicația. |
| D-5 | **Răspuns în streaming** | Cerință de UX, nu detaliu tehnic: un plan de învățare e un răspuns lung, iar așteptarea în gol face aplicația să pară blocată. |
| D-6 | **System prompt construit din profilul real** | Este mecanismul prin care „răspunde în contextul meu" devine concret. |
| D-7 | **Un singur profil acum, `userId` în model de la început** | Faza 1 nu are login, dar datele se modelează ca și cum ar avea. Autentificarea (F6) devine astfel un modul adăugat, nu o rescriere. |
| D-8 | **Fără chei reale în documentație** — doar numele variabilelor | Documentația se comite în git; cheile nu. |

## 7. Cerințe pe faze

Fiecare fază are un **scop**, ce **livrează** și un **criteriu de gata**. Ce nu e în faza curentă e explicit amânat, nu uitat.

### F0 — Fundația documentară ← *faza curentă*

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

### F1 — Schelet și chat cu streaming

**Scop:** primul răspuns de la un model, ajuns în browser token cu token.

Livrează:
- proiect Next.js + TypeScript
- un endpoint pe server care apelează modelul și returnează un stream
- o interfață de chat care afișează răspunsul pe măsură ce vine
- system prompt **static** (încă nu depinde de profil)
- `docs/anthropic/README.md` — pașii manuali pentru cheia de API

**Gata când:** pui o întrebare și vezi răspunsul curgând, iar cheia de API nu apare nicăieri în ce ajunge la browser.

**Amânat:** profil, memorie, al doilea provider, unelte.

---

### F2 — Profil și system prompt personalizat

**Scop:** aplicația să știe cine ești; aici se naște diferența față de un chat generic.

Livrează:
- model de date pentru profil: stack curent, listă de skill-uri cu nivel, obiectiv, timp disponibil de învățare; fiecare profil are un `userId` (vezi D-7)
- formular de editare a profilului
- salvare în `localStorage` (vezi §8.2 pentru consecințe)
- construirea system prompt-ului din profil, pe server
- profilul călătorește de la client la server în corpul fiecărui request — serverul rămâne fără stare în această fază

**Gata când:** UC-1 („ce-mi lipsește…") primește un răspuns care se sprijină vizibil pe skill-urile din profil, iar același profil dă același tip de răspuns și după refresh.

---

### F3 — Memorie între sesiuni

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

### F7 — Deploy și monitorizare

**Scop:** aplicația e online și se știe cât costă.

Livrează:
- deploy, cu variabilele de mediu configurate în platformă
- monitorizarea erorilor și a consumului de tokeni
- `docs/deploy/README.md`

**Gata când:** aplicația e accesibilă pe un URL public și se poate spune cât a costat ultima săptămână.

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

Profilul conține date despre tine: stack, skill-uri și nivel, obiectiv profesional, progres. Nu sunt date sensibile în sens legal, dar sunt date personale reale și tratamentul lor se declară explicit.

**Ce se întâmplă cu ele, pe fază:**

| Fază | Unde stau | Cine le mai vede |
|---|---|---|
| F2–F5 | `localStorage`, în browserul tău | Providerul LLM, la fiecare mesaj (profilul intră în system prompt) |
| F6+ | Supabase, legate de contul tău | Idem, plus furnizorul bazei de date |

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
- Codul, comentariile și numele de variabile: engleză.

## 9. Glosar

Termeni folosiți cu același înțeles peste tot în proiect.

**Agent** — componenta care primește o întrebare *împreună cu context* (profil, memorie) și produce un răspuns, iar din F5 poate decide singură să folosească unelte înainte de a răspunde. Se distinge de un simplu apel la model prin faptul că are context și inițiativă.

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

Regulă permanentă: **fiecare integrare externă primește un `docs/<integrare>/README.md`** cu partea care se face manual — cont, generarea cheii, variabila de mediu în care intră, configurări în dashboard-ul furnizorului, costuri.

Motivul: codul îl scrie agentul, dar pașii manuali se uită imediat dacă nu-i notează nimeni. La reinstalare, pe alt calculator sau la deploy, ar fi căutați de la zero.

Șablonul: [`docs/_TEMPLATE-integrare.md`](./_TEMPLATE-integrare.md). Regula e scrisă și în `AGENTS.md`, ca să se aplice fără să fie repetată la fiecare pas.

## 11. Cum se modifică acest document

Acest fișier este sursa de adevăr. Regulile:

1. **Orice decizie luată în conversație se scrie aici, în aceeași etapă în care e luată.** O decizie care rămâne doar în chat e o decizie pierdută.
2. Când o fază se termină, criteriul ei de gata se verifică efectiv, iar faza se marchează ca încheiată.
3. Când o cerință amânată devine actuală, se mută în faza care o preia — nu se lasă în „Neplanificat".
4. Modificările de direcție se trec în jurnalul de mai jos.
5. `README.md` nu duplică acest conținut; trimite la el.

### Jurnal de modificări

| Data | Ce s-a schimbat |
|---|---|
| 2026-09-02 | Versiune inițială: scop, persone, faze F0–F7, cerințe non-funcționale, glosar. Decizii fixate: Next.js + TypeScript, agent pe server, `localStorage` în F2 cu migrare la Supabase în F6, Anthropic + OpenAI. |
