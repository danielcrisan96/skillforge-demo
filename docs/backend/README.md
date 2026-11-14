# Backend-ul de persistență (SkillForge API)

**Faza în care a intrat:** F6.2
**Link către dashboard:** nu are — e serviciul nostru, din repo-ul [`skillforge-backend`](https://github.com/danielcrisan96/skillforge-backend). Unde rulează și unde își ține datele: `deploy/cloud-run.md` și `deploy/mongodb-atlas.md` din acel repo.

## Ce face

Păstrează profilul și conversațiile utilizatorilor conectați, ca să le regăsească pe orice dispozitiv. Fără el, datele rămân în `localStorage`, ca înainte de F6.2.

## Cont & chei

- Unde se creează contul: nu e nevoie de cont. Serviciul e al nostru.
- Singura „cheie” este cea dintre serverul Next și backend. O generezi tu, o singură dată pe mediu:
  `openssl rand -base64 32`
- Ce permisiuni dă: **toate**. Cine are cheia poate citi și scrie datele oricărui utilizator, fiindcă backend-ul crede headerul `X-User-Id` al oricărei cereri care o poartă. De aceea nu stă niciodată în browser și nu are prefixul `NEXT_PUBLIC_`.
- **Se afișează o singură dată?** Comanda de mai sus o tipărește în terminal; copiaz-o direct în cele două locuri de mai jos, nu într-un fișier.

## Variabile de mediu

În aplicația web (Next.js):

| Variabilă de mediu   | Ce conține                                         | Fișier       | Obligatorie |
| -------------------- | -------------------------------------------------- | ------------ | ----------- |
| `SKILLFORGE_API_URL` | Adresa backend-ului, fără „/” la final (config)    | `.env.local` | nu          |
| `SKILLFORGE_API_KEY` | Cheia dintre serverul Next și backend (**secret**) | `.env.local` | nu          |

Sunt opționale, dar merg doar împreună și doar cu autentificarea configurată (`docs/nextauth/README.md`). Fără ele, aplicația rămâne pe `localStorage`, fără erori.

În backend (Spring Boot):

| Variabilă de mediu       | Ce conține                                      | Unde                                                    | Obligatorie                     |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------------- | ------------------------------- |
| `SKILLFORGE_API_KEY`     | Aceeași cheie ca mai sus (**secret**)           | Secret Manager, pe Cloud Run                            | da, în afara profilului `local` |
| `SPRING_PROFILES_ACTIVE` | `local` sau `cloud`                             | mediul procesului                                       | da                              |
| `MONGODB_HOST` etc.      | Conexiunea la baza de date, pe profilul `cloud` | vezi `deploy/mongodb-atlas.md` din repo-ul backend-ului | da, pe `cloud`                  |

Profilul `local` are o cheie de dezvoltare scrisă în `application-local.yml` (`local-dev-key`). Nu protejează nimic real și nu se folosește în afara laptopului.

## Pași manuali

- **Local:** pornește backend-ul (README-ul repo-ului `skillforge-backend`, „Pornire locală”), apoi pune în `.env.local` adresa `http://localhost:8090` și cheia de dezvoltare.
- **Producție:** după ce backend-ul rulează pe Cloud Run, pune cele două variabile în Vercel (Project → Settings → Environment Variables, pentru Production) și fă **Redeploy**. Variabilele noi nu ajung într-un deploy deja făcut.
- **Rotația cheii:** generează una nouă, adaugă o versiune nouă a secretului în Secret Manager, redeployează backend-ul, apoi schimbă valoarea în Vercel și redeployează aplicația web. Între cele două redeploy-uri salvările răspund cu eroare, iar datele rămân în browser; nimic nu se pierde.

## Cost & limite

- Backend-ul în sine nu costă nimic; costă locul în care rulează și baza de date. Vezi `deploy/cloud-run.md` și `deploy/mongodb-atlas.md` din repo-ul backend-ului.
- Limite puse de noi, în cod: 500 de mesaje pe conversație, 200.000 de caractere pe mesaj, 50 de skill-uri pe profil. Sunt aceleași în `src/lib/backend.server.ts` și în validarea din backend.
- Un document MongoDB are cel mult 16 MB; limitele de mai sus țin o conversație mult sub această valoare.

## Verificare

1. Conectează-te în aplicație, poartă o conversație, apoi deschide aplicația într-un alt browser (sau într-o fereastră privată) și conectează-te cu același cont.
2. Trebuie să vezi aceeași conversație în lista din stânga și același profil în Preferințe.
3. Dacă lipsesc variabilele, nu apare nicio eroare: conversațiile pur și simplu nu trec pe celălalt browser. `GET /api/conversations` răspunde atunci `503`, cu `reason: "backend-unconfigured"`. Dacă backend-ul e oprit, apare notificarea „Conversațiile de pe server nu sunt disponibile acum”.
4. Pentru conflictul de versiune: deschide aceeași conversație în două ferestre și scrie în amândouă. A doua primește notificarea „a fost schimbată în altă fereastră”.
