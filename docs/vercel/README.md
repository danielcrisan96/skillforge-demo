# Vercel (deploy)

**Pentru ce o folosim:** publică aplicația pe un URL public, direct din repo-ul de GitHub. În SkillForge e „versiunea de siguranță": o aplicație care merge, online, înainte de orice integrare cu un model de limbaj.
**Faza în care a intrat:** F1.2 (mutat din F7 — vezi decizia D-16 din [`requirements.md` §6](../requirements.md)); extins la F2.5 cu cheile reale de provider, configurate în platformă.
**Link către dashboard:** https://vercel.com/dashboard

> **La F1.2, pasul n-a avut nevoie de nicio cheie de API.** Aplicația rula pe date inventate, deci primul deploy s-a făcut fără nicio variabilă de mediu — ca să se știe sigur că, dacă ceva pică, e o problemă de build sau de configurare, nu de la un provider de LLM. **La F2.5** cheile devin reale: secțiunile 3, 4, 6 și 7 de mai jos sunt cele care s-au schimbat.

## 1. Cont

- Unde se creează contul: https://vercel.com/signup
- Ce plan e necesar: **Hobby** (gratuit). Nu cere card.
- Pași care nu sunt evidenți:
  - Autentifică-te **cu contul de GitHub**. Altfel va trebui să legi ulterior, manual, accesul la repo-uri.
  - Planul Hobby e **doar pentru proiecte necomerciale**. Un proiect de curs intră aici; un produs pe care încasezi bani, nu.

## 2. Repo pe GitHub (înainte de Vercel)

Vercel se leagă la un repo, deci ăsta e primul pas.

1. Creează un repo **gol** pe https://github.com/new — fără README, fără `.gitignore` (le avem deja).
2. Din rădăcina proiectului:

```sh
git add .
git commit -m "SkillForge UI on mock data"
git remote add origin https://github.com/<utilizator>/<repo>.git
git push -u origin master
```

3. Verifică pe GitHub că **`.env.local` NU apare** în repo. Trebuie să vezi doar `.env.example`. Dacă apare, oprește-te și rezolvă `.gitignore` înainte de orice deploy.

## 3. Cheia / credențialele

La F1.2 nu exista nicio cheie. La **F2.5**, aplicația cheamă Claude, deci `ANTHROPIC_API_KEY` devine reală și trebuie pusă în Vercel — niciodată în repo.

| Variabilă de mediu        | Ce conține                                      | Obligatorie                                                               |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `SKILLFORGE_DEMO_MESSAGE` | Textul întors de ruta demo `/api/hello`         | nu — ruta răspunde cu o eroare explicită fără ea                          |
| `ANTHROPIC_API_KEY`       | Cheia de la Anthropic, folosită de `/api/chat`  | nu — fără ea, `/api/chat` întoarce 400 cu „provider neconfigurat", nu 500 |
| `OPENAI_API_KEY`          | Al doilea provider, F4 — încă nefolosită de cod | nu                                                                        |

Regula de aur, deja scrisă în `.env.example`: **numele variabilei decide** dacă ajunge în browser. Fără prefix `NEXT_PUBLIC_`, o variabilă există doar pe server — și așa trebuie să rămână orice cheie.

**Unde se adaugă, pas cu pas:** Vercel → proiectul tău → **Settings → Environment Variables** → nume variabilă + valoare → bifează **atât Production, cât și Preview** (fără Preview, un pull request n-ar mai avea un chat funcțional de revizuit) → **Save**.

⚠️ **Variabilele se citesc la request, nu la build.** Un deploy deja existent nu vede o variabilă adăugată sau schimbată după ce a rulat — trebuie **Deployments → ⋯ → Redeploy** (fără să bifezi „Use existing Build Cache", ca să fie clar că e un run curat). E cea mai frecventă cauză de „am pus cheia și tot nu merge".

## 4. Configurări în dashboard-ul lor

**F1.2 — importul inițial** (fără chei):

1. **Add New → Project**, apoi importă repo-ul de GitHub.
2. Vercel detectează singur Next.js. Lasă setările implicite — nu suprascrie comanda de build și nu adăuga `vercel.json` cât timp valorile implicite merg.
3. **Deploy.**

**F2.5 — cheile reale** (peste proiectul deja importat):

1. **Settings → Environment Variables** → adaugă `ANTHROPIC_API_KEY`, cu valoarea din contul tău Anthropic (vezi [`docs/anthropic/README.md`](../anthropic/README.md) pentru cum se generează).
2. Bifează **Production** și **Preview** pentru fiecare variabilă — un deploy de pe alt branch trebuie să răspundă la fel de real ca cel de pe `main`.
3. **Redeploy** pe ultimul deploy din Production (vezi avertismentul de mai sus). Fără acest pas, cheia nou-adăugată rămâne invizibilă pentru versiunea deja online.

Fiecare `git push` pe branch-ul principal declanșează un deploy nou pe **Production**; fiecare pull request (sau push pe alt branch) primește un **Preview** URL separat, cu propriile variabile.

## 5. Costuri

- Model de tarifare: gratuit pe planul **Hobby**, cu limite lunare (lățime de bandă, timp de build, invocări de funcții). Peste ele, deployurile se opresc — nu se facturează automat.
- Pagina oficială de prețuri: https://vercel.com/pricing
- **Verificat la data:** 2026-09-02
- Unde se vede consumul curent: Dashboard → contul tău → **Usage**
- Limită de cheltuială configurată: nu e cazul pe Hobby (nu există facturare)

> Prețurile și limitele se schimbă. Verifică pagina de mai sus înainte să te bazezi pe cifrele de aici.

## 6. Verificare că merge

**Fără nicio cheie configurată** (stare validă, nu eroare — verifică asta ÎNAINTE de a pune cheia, ca să știi cum arată „curat"):

1. Deschide URL-ul dat de Vercel (`https://<proiect>.vercel.app`) fără nicio variabilă de provider setată.
2. Ecranul de conversație nouă trebuie să se vadă normal. Trimite un mesaj: chatul trebuie să răspundă cu eroarea „Cheia de API nu e configurată..." (400), nu cu o pagină albă sau un 500.

**Cu `ANTHROPIC_API_KEY` pusă și un Redeploy făcut:**

3. Deschide URL-ul din nou (ideal pe telefon, nu doar pe laptop — un URL „public" care merge doar pe rețeaua ta locală nu e public).
4. Trimite un mesaj real: răspunsul trebuie să curgă token cu token, cu Claude adevărat, nu cu textul de eroare de mai sus.
5. Fă un `git push` pe un branch nou (nu `main`): trebuie să primești un **Preview URL** diferit de cel de Production, cu propriul chat funcțional (dacă ai bifat Preview la pasul 3 din §4).
6. Schimbă tema din rândul de utilizator → **Aspect**, dă refresh: tema trebuie să rămână.
7. Dacă vezi o pagină albă, deschide consola browserului. Cel mai probabil e o eroare de hidratare, nu una de deploy.

Local, aceleași verificări:

```sh
npm run build && npm run start
```

Dacă `npm run build` trece local dar pică pe Vercel, diferența e aproape sigur majuscula din numele fișierelor: Windows nu face diferența între `Chat.tsx` și `chat.tsx`, Linux-ul de pe Vercel o face.

**Unde se caută dacă ceva merge local și cade doar în producție:** Vercel → proiectul tău → **Deployments** → deploy-ul respectiv → **Runtime Logs** (sau **Functions** pe versiuni mai vechi de dashboard). Acolo ajunge exact ce scrie `console.error` din `route.ts` — nu în consola browserului.

## 7. Rotația și revocarea cheii

Se aplică din F2.5, de când există o cheie reală:

- se revocă din dashboard-ul providerului (Anthropic), nu din Vercel — vezi [`docs/anthropic/README.md`](../anthropic/README.md);
- se generează una nouă și se actualizează în **Vercel → Settings → Environment Variables**, apoi se face un **Redeploy** — variabilele nu se aplică retroactiv unui deploy existent;
- locurile de actualizat: `.env.local` (local) și Vercel (Production **și** Preview). Nicăieri altundeva.

## 8. Refacere pe alt calculator

Ce nu se ia din `git clone` și trebuie refăcut manual:

1. Contul Vercel e legat de omul care s-a autentificat cu GitHub, nu de repo — pe alt calculator te loghezi cu același cont, proiectul e deja acolo.
2. `.env.local` nu vine din git. Se recreează cu `cp .env.example .env.local`, apoi cheia se ia din contul Anthropic (o cheie nouă, dacă cea veche nu mai e la îndemână — vezi §7).
3. Variabilele din Vercel **nu trebuie reconfigurate** — ele stau la nivel de proiect, nu de calculator. Doar `.env.local`, care e local prin definiție, se reface.
4. Dacă proiectul Vercel a fost șters sau reimportat, reia pașii din §4 de la zero.

## 9. Capcane întâlnite

- **Variabilele de mediu nu se aplică singure la deployurile deja făcute.** După ce adaugi sau schimbi una, trebuie **Redeploy** — vezi avertismentul din §3.
- **O variabilă pusă doar pe Production, nu și pe Preview.** Un pull request arată atunci un chat care nu răspunde, deși pe URL-ul public merge — pare un bug de cod, e o bifă uitată.
- **Diferența de majuscule în numele fișierelor** (vezi §6) — cea mai frecventă cauză pentru „merge local, pică pe Vercel".
- **Planul Hobby e necomercial.** Dacă proiectul devine unul pe bani, planul trebuie schimbat.
