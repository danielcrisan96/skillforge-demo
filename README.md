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

### Comenzi

| Comandă                          | Ce face                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                    | Pornește serverul de dezvoltare                                              |
| `npm run build`                  | Build de producție                                                           |
| `npm run start`                  | Rulează build-ul de producție                                                |
| `npm run lint`                   | ESLint (în Next 16 nu mai rulează automat la build)                          |
| `npm run format`                 | Formatează tot cu Prettier                                                   |
| `npm run format:check`           | Verifică formatarea fără s-o modifice — de folosit în CI                     |
| `sh scripts/sync-agent-docs.sh`  | Regenerează `CLAUDE.md` și `.github/copilot-instructions.md` din `AGENTS.md` |
| `sh scripts/check-agent-docs.sh` | Verifică dacă sunt sincronizate (util ca pre-commit sau în CI)               |

### Ce există acum

Faza curentă e **F1** (vezi [`docs/requirements.md`](docs/requirements.md)). Pașii F1.1 (scheletul) și **F1.2 (interfața completă)** sunt livrați.

**Aplicația funcționează integral pe date inventate. Nu există niciun apel către un model de limbaj și nicio cheie de API** — pornește pe orice laptop, fără configurare.

Ce poți face:

- creezi, deschizi, redenumești și ștergi conversații (supraviețuiesc unui refresh)
- trimiți un mesaj și primești un răspuns simulat, cu indicator „scrie…" și buton de stop
- îți editezi profilul (nume, stack, skills, obiectiv) din preferințe
- schimbi tema — sistem, luminoasă sau întunecată, doar din preferințe
- folosești aplicația pe telefon: sidebar-ul intră într-un panou glisant

| Rută         | Ce arată                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `/`          | Aplicația: sidebar, bară de sus, conversație                                                      |
| `/demo`      | Rămășiță din F1.1 — un component client lângă unul server, ca material de curs                    |
| `/api/hello` | Route Handler care citește o variabilă de mediu pe server. Strămoșul rutei pe care va sta agentul |

Unde se schimbă datele inventate cu date reale: [`src/lib/mock/`](src/lib/mock/) și acțiunea `sendMessage` din [`src/store/useAppStore.ts`](src/store/useAppStore.ts). În rest, nimic nu știe de unde vine textul.

Codul e comentat în română și comentariile explică _de ce_ e scris așa — sunt parte din materialul de curs, nu decor.

## Documentație

| Fișier                                                       | Ce conține                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [`docs/requirements.md`](docs/requirements.md)               | **Sursa de adevăr**: ce construim, pentru cine, fazele, cerințele non-funcționale, glosarul            |
| [`AGENTS.md`](AGENTS.md)                                     | Convențiile pentru agenții AI care lucrează pe proiect (singurul fișier de instrucțiuni editat manual) |
| [`docs/_TEMPLATE-integrare.md`](docs/_TEMPLATE-integrare.md) | Șablonul pentru pașii manuali ai fiecărei integrări externe                                            |
| [`docs/vercel/README.md`](docs/vercel/README.md)             | Pașii manuali pentru repo pe GitHub și deploy pe Vercel                                                |

Fiecare integrare externă (provider de LLM, bază de date, autentificare, deploy) primește propriul `docs/<integrare>/README.md` cu partea care se face de mână: cont, generarea cheii, variabila de mediu, configurări în dashboard, costuri.

## Reguli care nu se negociază

- **Cheile de API stau doar pe server**, în `.env.local` (gitignorat), și nu ajung niciodată în browser. În documentație se scriu doar numele variabilelor.
- **Deciziile se scriu în `docs/requirements.md`**, nu doar în conversație.
- `CLAUDE.md` și `.github/copilot-instructions.md` sunt **generate** — se editează `AGENTS.md` și se rulează scriptul de sync.
