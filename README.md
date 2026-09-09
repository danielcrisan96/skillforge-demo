# SkillForge

Copilot personal de skills și carieră: o aplicație web în care un agent AI îți cunoaște profilul real — stack, skill-uri cu nivel, obiectiv — și îți răspunde **în contextul tău**, cu pași concreți de învățare spre acel obiectiv.

Spre deosebire de un chat generic, profilul e salvat, crește în timp și stă la baza fiecărui răspuns.

Se construiește modul cu modul, ca proiect-fir-roșu al unui curs despre integrarea unui LLM într-o interfață web reală.

## Cum se rulează

Ai nevoie de **Node.js 20.9+** (Next 16 nu pornește sub această versiune).

```sh
npm install
cp .env.example .env.local    # valorile reale intră aici; fișierul e gitignorat
npm run dev                   # http://localhost:3000
```

`.env.local` nu se comite niciodată. `.env.example` se comite și spune ce variabile există — el e lista de referință.

### Dacă vii din Vite + React

|                    | Vite + React                                                                                    | Next.js (App Router)                                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rutare             | manuală, cu o bibliotecă (react-router) și un component `<Route>` per pagină                    | **de fișiere**: un folder cu `page.tsx` sub `src/app/` = o rută. `src/app/demo/page.tsx` devine `/demo` fără nicio înregistrare                                                                       |
| Unde rulează codul | totul în browser — Vite servește un bundle static, fără server propriu                          | ambele: component **server** (implicit) rulează doar pe server și nu ajunge în bundle; `"use client"` marchează explicit ce ajunge și în browser                                                      |
| Variabile de mediu | orice `VITE_*` e injectată în bundle-ul de client la build — vizibilă oricui deschide aplicația | fără prefix, o variabilă există **doar pe server**; ajunge în browser doar dacă începe cu `NEXT_PUBLIC_`. Regula e pe dos față de Vite — de asta o cheie de API stă aici fără prefix, niciodată cu el |
| Deploy             | un folder de fișiere statice (`dist/`), servit de orice hosting static                          | necesită o platformă care rulează Node (Vercel, sau orice altceva cu suport Next) — codul de server chiar rulează la fiecare cerere, nu doar la build                                                 |

### Comenzi

| Comandă                             | Ce face                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                       | Pornește serverul de dezvoltare                                              |
| `npm run build`                     | Build de producție                                                           |
| `npm run start`                     | Rulează build-ul de producție                                                |
| `npm run lint`                      | ESLint (în Next 16 nu mai rulează automat la build)                          |
| `npm run format`                    | Formatează tot cu Prettier                                                   |
| `npm run format:check`              | Verifică formatarea fără s-o modifice — de folosit în CI                     |
| `sh scripts/sync-agent-docs.sh`     | Regenerează `CLAUDE.md` și `.github/copilot-instructions.md` din `AGENTS.md` |
| `sh scripts/check-agent-docs.sh`    | Verifică dacă sunt sincronizate (util ca pre-commit sau în CI)               |
| `sh scripts/sync-skills.sh`         | Copiază skill-urile din `.claude/skills/` în oglinda `.github/skills/`       |
| `sh scripts/sync-skills.sh --check` | Verifică dacă oglinda e la zi, fără s-o scrie (util ca pre-commit sau în CI) |

### Aplicația publicată

**F2.5** (vezi [`docs/requirements.md`](docs/requirements.md)): aplicația e publicată pe Vercel, cu cheia de Anthropic configurată în platformă — nu pe laptop. Pașii manuali sunt în [`docs/vercel/README.md`](docs/vercel/README.md).

> Link-ul public: _de completat aici, imediat după importul din GitHub în Vercel și configurarea variabilelor (vezi `docs/vercel/README.md`)._

### Ce există acum

Faza curentă e **F2.5** (vezi [`docs/requirements.md`](docs/requirements.md)). Pașii F1.1 (scheletul), F1.2 (interfața completă), F1.3 (streaming de la server), F1.4 (chat cu model real) și F2 (profil și system prompt personalizat) sunt livrați.

Conversația răspunde acum cu **Claude, în streaming**. Pentru asta e nevoie de o cheie de API — vezi [`docs/anthropic/README.md`](docs/anthropic/README.md).

**Fără cheie aplicația tot pornește** (`npm run build` trece pe orice laptop): restul — conversațiile, profilul, tema, secțiunea „Despre aplicație" — merge pe date inventate, iar chatul spune limpede ce variabilă lipsește, în loc să dea o eroare de server.

Ce poți face:

- creezi, deschizi, redenumești și ștergi conversații (lista supraviețuiește unui refresh; **mesajele dintr-o conversație încă nu** — persistarea istoricului e F3)
- trimiți un mesaj și primești un **răspuns real de la Claude, în streaming**, cu indicator „scrie…" și buton de Stop care chiar oprește generarea
- îți editezi profilul (nume, stack, skills, obiectiv) din preferințe
- schimbi tema — sistem, luminoasă sau întunecată, doar din preferințe
- folosești aplicația pe telefon: sidebar-ul intră într-un panou glisant
- deschizi preferințele → **„Despre aplicație”** și vezi un text venind de pe server bucată cu bucată, prin SSE — fără niciun model de limbaj în spate

| Rută         | Ce arată                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `/`          | Aplicația: sidebar, bară de sus, conversație                                                                        |
| `/demo`      | Rămășiță din F1.1 — un component client lângă unul server, ca material de curs                                      |
| `/api/hello` | Route Handler care citește o variabilă de mediu pe server. Strămoșul rutei pe care va sta agentul                   |
| `/api/about` | Trimite descrierea aplicației **în streaming** (SSE). Repetiția protocolului pe care va veni răspunsul modelului    |
| `/api/chat`  | Conversația: cheamă Claude prin AI SDK-ul Vercel și întoarce răspunsul în streaming. Singurul loc care atinge cheia |

Unde se schimbă datele inventate cu date reale: [`src/lib/mock/`](src/lib/mock/) și acțiunea `sendMessage` din [`src/store/useAppStore.ts`](src/store/useAppStore.ts). În rest, nimic nu știe de unde vine textul.

Cum se citește un stream fără nicio bibliotecă: [`src/app/api/about/route.ts`](src/app/api/about/route.ts) (serverul) și [`src/components/settings/about-form.tsx`](src/components/settings/about-form.tsx) (clientul). Al doilea rămâne aproape neschimbat când sursa devine un model real — protocolul e același.

Codul e comentat în română și comentariile explică _de ce_ e scris așa — sunt parte din materialul de curs, nu decor.

## Documentație

| Fișier                                                 | Ce conține                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [`docs/requirements.md`](docs/requirements.md)         | **Sursa de adevăr**: ce construim, pentru cine, fazele, cerințele non-funcționale, glosarul            |
| [`AGENTS.md`](AGENTS.md)                               | Convențiile pentru agenții AI care lucrează pe proiect (singurul fișier de instrucțiuni editat manual) |
| [`docs/README.md`](docs/README.md)                     | Indexul documentației — tabelul cu integrările externe și la ce pas a intrat fiecare                   |
| [`docs/_template/README.md`](docs/_template/README.md) | Șablonul pentru pașii manuali ai fiecărei integrări externe                                            |
| [`docs/vercel/README.md`](docs/vercel/README.md)       | Pașii manuali pentru repo pe GitHub și deploy pe Vercel                                                |

Fiecare integrare externă (provider de LLM, bază de date, autentificare, deploy) primește propriul `docs/<integrare>/README.md` cu partea care se face de mână: cont, generarea cheii, variabila de mediu, configurări în dashboard, costuri.

## Reguli care nu se negociază

- **Cheile de API stau doar pe server**, în `.env.local` (gitignorat), și nu ajung niciodată în browser. În documentație se scriu doar numele variabilelor.
- **Deciziile se scriu în `docs/requirements.md`**, nu doar în conversație.
- `CLAUDE.md` și `.github/copilot-instructions.md` sunt **generate** — se editează `AGENTS.md` și se rulează scriptul de sync.
