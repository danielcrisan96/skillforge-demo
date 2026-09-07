# Vercel (deploy)

**Pentru ce o folosim:** publică aplicația pe un URL public, direct din repo-ul de GitHub. În SkillForge e „versiunea de siguranță": o aplicație care merge, online, înainte de orice integrare cu un model de limbaj.
**Faza în care a intrat:** F1.2 (mutat din F7 — vezi decizia D-16 din [`requirements.md` §6](../requirements.md))
**Link către dashboard:** https://vercel.com/dashboard

> **Pasul acesta nu are nevoie de nicio cheie de API.** Aplicația rulează pe date inventate, deci deployul se face fără să configurezi nicio variabilă de mediu. Ăsta e și rostul lui: dacă ceva pică la deploy, știi sigur că problema e de build sau de configurare, nu de la un provider de LLM.

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

**Niciuna, în pasul acesta.** Nu există chei de API în F1.2.

| Variabilă de mediu        | Ce conține                              | Obligatorie                                      |
| ------------------------- | --------------------------------------- | ------------------------------------------------ |
| `SKILLFORGE_DEMO_MESSAGE` | Textul întors de ruta demo `/api/hello` | nu — ruta răspunde cu o eroare explicită fără ea |

Când se conectează providerii (F1.3 și F4), cheile lor se adaugă în Vercel la **Project → Settings → Environment Variables**, cu aceleași nume ca în `.env.example`. **Nu se pun niciodată în cod și nu se comit.**

## 4. Configurări în dashboard-ul lor

1. **Add New → Project**, apoi importă repo-ul de GitHub.
2. Vercel detectează singur Next.js. Lasă setările implicite — nu suprascrie comanda de build.
3. **Deploy.**

Nimic altceva nu trebuie bifat pentru pasul acesta. Fiecare `git push` pe branch-ul principal declanșează un deploy nou; fiecare pull request primește un URL de previzualizare separat.

## 5. Costuri

- Model de tarifare: gratuit pe planul **Hobby**, cu limite lunare (lățime de bandă, timp de build, invocări de funcții). Peste ele, deployurile se opresc — nu se facturează automat.
- Pagina oficială de prețuri: https://vercel.com/pricing
- **Verificat la data:** 2026-09-02
- Unde se vede consumul curent: Dashboard → contul tău → **Usage**
- Limită de cheltuială configurată: nu e cazul pe Hobby (nu există facturare)

> Prețurile și limitele se schimbă. Verifică pagina de mai sus înainte să te bazezi pe cifrele de aici.

## 6. Verificare că merge

1. Deschide URL-ul dat de Vercel (`https://<proiect>.vercel.app`).
2. Trebuie să vezi ecranul de conversație nouă, cu salutul și cele patru sugestii. Deschide o conversație din stânga și verifică mesajele.
3. Schimbă tema din rândul de utilizator → **Aspect**, dă refresh: tema trebuie să rămână.
4. Dacă vezi o pagină albă, deschide consola browserului. Cel mai probabil e o eroare de hidratare, nu una de deploy.

Local, aceleași verificări:

```sh
npm run build && npm run start
```

Dacă `npm run build` trece local dar pică pe Vercel, diferența e aproape sigur majuscula din numele fișierelor: Windows nu face diferența între `Chat.tsx` și `chat.tsx`, Linux-ul de pe Vercel o face.

## 7. Rotația și revocarea cheii

Nu se aplică încă (nu există chei). Când vor exista:

- se revocă din dashboard-ul providerului, nu din Vercel;
- se generează una nouă și se actualizează în **Vercel → Settings → Environment Variables**, apoi se face un **Redeploy** — variabilele nu se aplică retroactiv unui deploy existent;
- locurile de actualizat: `.env.local` (local) și Vercel. Nicăieri altundeva.

## 8. Capcane întâlnite

- **Variabilele de mediu nu se aplică singure la deployurile deja făcute.** După ce adaugi una, trebuie **Redeploy**.
- **Diferența de majuscule în numele fișierelor** (vezi §6) — cea mai frecventă cauză pentru „merge local, pică pe Vercel".
- **Planul Hobby e necomercial.** Dacă proiectul devine unul pe bani, planul trebuie schimbat.
