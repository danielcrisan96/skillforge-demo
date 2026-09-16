# Autentificare — Auth.js (`next-auth` v5) cu GitHub

**Faza în care a intrat:** F6.1 — autentificare fără bază de date (vezi [`requirements.md` §7](../requirements.md#7-cerințe-pe-faze))
**Link către dashboard:** <https://github.com/settings/developers> (GitHub → Settings → Developer settings → OAuth Apps)

## Ce face

Aplicația **știe cine o folosește**, iar ruta care costă bani (`/api/chat`) răspunde doar cui e conectat. Fără sesiune, ruta întoarce `401` **înainte** de orice apel la providerul de model — verificarea e pe server, nu în interfață.

Conectarea se face cu un cont care există deja (GitHub acum; Google e în registru, afișat „în curând"), deci aplicația nu ține parole. **Nu se salvează nimic despre utilizator:** sesiunea e un JWT criptat într-un cookie, fără bază de date. Conversațiile rămân în `localStorage`, deci sunt ale browserului, nu ale contului — limitare cunoscută, rezolvată la pasul de persistență.

Librăria e `next-auth@5.0.0-beta.32` (Auth.js), fixată la versiunea exactă fiindcă e beta. **Exemplele de pe internet sunt în majoritate pentru v4** (`authOptions`, `getServerSession`) și nu compilează aici.

## Cont & chei

- Unde se creează contul: <https://github.com> — un cont GitHub obișnuit, cel pe care îl ai deja.
- Ce plan e necesar: **gratuit**. Aplicațiile OAuth nu au tarif.
- Pași care nu sunt evidenți:
  - aplicația OAuth se creează **pe contul tău personal** (sau pe o organizație). Oricine are drept de admin acolo vede și poate regenera secretul;
  - GitHub are două tipuri: **OAuth App** și **GitHub App**. Aici e nevoie de **OAuth App**;
  - recomandarea proiectului: **două aplicații OAuth separate**, una pentru dezvoltare (`localhost`) și una pentru producție. GitHub permite până la 10 URL-uri de callback pe aceeași aplicație, dar cu una singură secretul de pe laptop ar fi și secretul producției: un `.env.local` scăpat ar compromite și site-ul public.
- De unde se generează credențialele, pas cu pas:
  1. **github.com → poza de profil → Settings → Developer settings → OAuth Apps → New OAuth App**
  2. _Application name_: ex. „SkillForge (dev)" — utilizatorul îl vede pe pagina de autorizare
  3. _Homepage URL_: `http://localhost:3000` (dev) sau domeniul de producție
  4. _Authorization callback URL_: vezi [Pași manuali](#pași-manuali) — **exact** `<origine>/api/auth/callback/github`
  5. **Register application** → pe pagina aplicației apare **Client ID** (se copiază oricând)
  6. **Generate a new client secret** → se copiază **pe loc**
- Ce permisiuni sau scope i se dau: niciuna de configurat în GitHub. Librăria cere la login `read:user user:email` — nume, poză, email. Nimic din repo-uri.
- **Se afișează o singură dată?** **Da, secretul aplicației OAuth.** După ce pleci de pe pagină, GitHub arată doar ultimele caractere; dacă nu l-ai copiat, generezi altul. Client ID-ul rămâne vizibil.
- **Secretul de sesiune (`AUTH_SECRET`)** nu vine de la GitHub: îl generezi tu, un șir aleator lung. Oricare dintre comenzile de mai jos, rulată local (valoarea se lipește în `.env.local`, **nu** într-un doc sau un commit):

  ```sh
  openssl rand -base64 33
  # sau, fără openssl:
  node -e "console.log(require('crypto').randomBytes(33).toString('base64'))"
  ```

  Secrete **diferite** pentru dezvoltare și producție, din același motiv ca aplicațiile OAuth.

## Variabile de mediu

| Variabilă de mediu   | Tip        | Ce conține                                                                                       | Fișier       | Obligatorie                                            |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------ |
| `AUTH_SECRET`        | **secret** | Cheia cu care se criptează și se verifică cookie-ul de sesiune                                   | `.env.local` | da, pentru autentificare                               |
| `AUTH_GITHUB_SECRET` | **secret** | Client secret al aplicației OAuth GitHub                                                         | `.env.local` | da, pentru autentificare                               |
| `AUTH_GITHUB_ID`     | config     | Client ID al aplicației OAuth GitHub                                                             | `.env.local` | da, pentru autentificare                               |
| `AUTH_URL`           | config     | Originea aplicației, când nu se poate deduce din cerere (ex. `next start` în spatele unui proxy) | `.env.local` | nu — nu e nevoie local cu `next dev` și nici pe Vercel |

Pentru Google (azi „în curând"), aceleași două roluri: `AUTH_GOOGLE_SECRET` (**secret**) și `AUTH_GOOGLE_ID` (config).

**Autentificarea e „configurată"** doar când există `AUTH_SECRET` **și** perechea ID + SECRET a cel puțin unui furnizor activ. Altfel aplicația pornește ca înainte, fără buton de conectare.

### Ce înseamnă marcajul

**Secret** = dacă ajunge la altcineva, acela poate acționa **în numele aplicației**, iar singura reparație e să generezi altul.

- `AUTH_SECRET`: cine îl are își poate **fabrica** o sesiune validă pentru **orice** utilizator, fără să treacă vreodată pe la GitHub. Sesiunea e doar un cookie semnat cu el, iar serverul nu are o listă de sesiuni cu care să compare.
- `AUTH_GITHUB_SECRET`: cine îl are poate schimba coduri de autorizare pe tokenuri **ca și cum ar fi SkillForge**.

**Config** = valori care **identifică sau localizează**, nu autorizează.

- `AUTH_GITHUB_ID` **e public prin proiectare**, nu o scăpare: pleacă în URL-ul spre care te redirecționează browserul (`github.com/login/oauth/authorize?client_id=…`), deci îl citește oricine din bara de adrese. În OAuth, **id-ul spune „care aplicație"; secretul dovedește „chiar eu sunt"**. Fără secret, id-ul nu deschide nimic.
- `AUTH_URL`: o adresă, nimic de ascuns.

**Pe Vercel, distincția e un buton:** la adăugarea variabilei, opțiunea **Sensitive** face valoarea imposibil de citit după salvare. **Se bifează pe cele două secrete** și **se lasă nebifată pe config**, ca ID-ul și URL-ul să rămână verificabile dintr-o privire când depanezi („e ID-ul aplicației de dev sau de prod?").

Rândurile din `.env.example` (comentate, fără valoare):

```sh
# AUTH_SECRET=
# AUTH_GITHUB_ID=
# AUTH_GITHUB_SECRET=
# AUTH_URL=
```

Nicio variabilă de aici **nu** are prefixul `NEXT_PUBLIC_`, iar faptul că autentificarea e configurată **nu** se oglindește într-o variabilă publică: serverul o calculează și o trimite paginii ca DA/NU.

## Pași manuali

### 1. URL-urile de callback — câte unul pentru fiecare mediu

⚠️ **Pasul care se uită garantat.** GitHub trimite utilizatorul înapoi **doar** la URL-ul înregistrat. Unul greșit nu dă o eroare în aplicație, ci o pagină GitHub cu „The redirect_uri is not associated with this application", înainte ca aplicația să vadă ceva.

| Mediu      | Aplicația OAuth    | Homepage URL             | Authorization callback URL                        |
| ---------- | ------------------ | ------------------------ | ------------------------------------------------- |
| Dezvoltare | „SkillForge (dev)" | `http://localhost:3000`  | `http://localhost:3000/api/auth/callback/github`  |
| Producție  | „SkillForge"       | `https://<domeniul-tău>` | `https://<domeniul-tău>/api/auth/callback/github` |

- **Portul contează.** Dacă `next dev` pornește pe `3001` pentru că `3000` e ocupat, callback-ul nu se mai potrivește.
- **`http` local, `https` în producție.** Nu se amestecă.
- Calea `/api/auth/callback/github` nu e aleasă de noi: e ruta catch-all `src/app/api/auth/[...nextauth]/route.ts` plus id-ul providerului din librărie.

### 2. Preview-urile Vercel — decis: autentificarea NU merge pe Preview

URL-urile de Preview se schimbă la fiecare deploy (`skillforge-<hash>-<cont>.vercel.app`), deci nu pot fi înregistrate dinainte la GitHub. **Decizia proiectului:** pe Preview autentificarea nu funcționează, deci **chatul răspunde `401`**. Restul aplicației se poate verifica. Autentificarea se testează local și pe domeniul de producție.

De ce nu altă soluție, deocamdată:

- un domeniu stabil de preview (ex. branch-ul `dev` pe un subdomeniu fix) cere o a treia aplicație OAuth și un domeniu configurat. Se face când apare nevoia reală;
- `AUTH_REDIRECT_PROXY_URL` (proxy de redirect prin producție) există în librărie, dar adaugă o piesă greu de depanat pentru un beneficiu mic la curs.

Variabilele se pun **și pe Preview**, ca pe orice altă variabilă (vezi `pre-deploy`). Fără ele, Preview ar răspunde `503` în loc de `401`. Ruta e închisă oricum, dar mesajul ar fi mai înșelător.

### 3. Vercel

1. **Settings → Environment Variables**: cele trei variabile obligatorii, pe **Production** și **Preview**, cu valorile aplicației OAuth **de producție** și un `AUTH_SECRET` **diferit** de cel local. **Sensitive** bifat pe `AUTH_SECRET` și `AUTH_GITHUB_SECRET`, nebifat pe `AUTH_GITHUB_ID`. `AUTH_URL` nu e necesar pe Vercel: librăria deduce originea și are încredere în host când rulează pe Vercel.
2. **Deployments → ⋯ → Redeploy** pe ultimul deploy de producție. O variabilă nouă nu se aplică singură unui deploy care a rulat deja.

⚠️ **Între deploy și configurarea variabilelor, chatul din producție e închis** (`503`). E intenționat: un build de producție fără autentificare configurată nu lasă ruta de model deschisă.

### 4. Când se schimbă domeniul

La un domeniu nou (propriu, redenumirea proiectului Vercel):

1. în aplicația OAuth de producție: **Homepage URL** și **Authorization callback URL** pe domeniul nou;
2. dacă ai setat `AUTH_URL` undeva, actualizează-l;
3. Redeploy;
4. sesiunile vechi nu se transferă, fiindcă cookie-urile sunt legate de domeniu. Toată lumea se conectează din nou.

### 5. Rotația secretelor

- **`AUTH_GITHUB_SECRET` compromis:** în aplicația OAuth → **Generate a new client secret** → pune-l în `.env.local` / Vercel → Redeploy → abia apoi **șterge secretul vechi** din GitHub. GitHub ține două secrete active simultan, deci rotația se face fără downtime.
- **`AUTH_SECRET` compromis:** generează altul și înlocuiește-l → Redeploy. **Toate sesiunile existente devin invalide** și toată lumea se reconectează; e exact efectul dorit, fiindcă sesiunile fabricate cu secretul vechi mor și ele. Pentru o rotație fără delogare, librăria acceptă temporar și `AUTH_SECRET_1` (secretul vechi, doar pentru citire).
- Locuri de actualizat: `.env.local` pe fiecare calculator și Vercel (Production + Preview).

## Cost & limite

- Model de tarifare: **gratuit**. Aplicațiile OAuth GitHub nu se taxează, iar Auth.js e open-source (licență ISC).
- Ce e gratuit și până unde: un cont sau o organizație poate avea **până la 100 de aplicații OAuth**; până la **10 URL-uri de callback** pe aplicație.
- Pagina oficială: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app> (limitele) · <https://github.com/pricing> (planurile GitHub; aplicațiile OAuth nu apar ca serviciu plătit)
- **Verificat la data:** 2026-09-16
- Unde se vede consumul curent: nu există consum de urmărit. În aplicația OAuth, pagina arată câți utilizatori au autorizat-o.

**Costul real e cel evitat:** o rută de model publică pe un domeniu cunoscut se poate chema în buclă de oricine. Limita de 10 cereri/minut e per IP și per instanță, deci nu oprește pe cineva hotărât. Autentificarea mută întrebarea de la „câte cereri vin" la „cine are voie să ceară".

## Verificare

1. **Fără variabile** (le comentezi în `.env.local`, repornești `next dev`): aplicația pornește, în sidebar **nu** apare „Conectează-te", iar în **Preferințe → Profilul tău** **nu** apare câmpul de email. Chatul merge ca înainte, iar terminalul arată `[chat] Cerere de la utilizatorul anonim (autentificare neconfigurată, dezvoltare)`.
2. **Cu variabilele puse**, repornește: jos în sidebar apare **„Conectează-te"** → se deschide fereastra cu **GitHub** activ și **Google** „În curând" → GitHub → **Authorize** → revii în aplicație, iar rândul de jos arată poza, numele și emailul contului. În **Profilul tău**, „Emailul contului" e completat și needitabil.
3. **Ruta e protejată și din afara aplicației**, fără sesiune:

   ```sh
   curl -i -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[]}'
   ```

   Așteptat: `HTTP/1.1 401` și `{"error":"Ca să poți întreba, conectează-te…","reason":"unauthenticated"}`.

4. **Log minim:** trimite un mesaj conectat. În terminal apare `[chat] Cerere de la utilizatorul github:<id numeric>` — **și nimic altceva despre tine** (niciun email, nume sau token).
5. **Anularea, fără să apeși nimic:** cheamă callback-ul exact cum îl cheamă GitHub la „Cancel":

   ```sh
   curl -i "http://localhost:3000/api/auth/callback/github?error=access_denied&error_description=The+user+has+denied+your+application+access.&state=x"
   ```

   Așteptat: `303` cu `Location: http://localhost:3000/?error=access_denied` (motivul **întreg**, nu `OAuthCallbackError`) și **o singură linie** în terminal: `[auth] Autentificare oprită la furnizor (github): access_denied`. În browser, la adresa aceea: mesajul „Conectare anulată", iar `?error=` dispare din bara de adrese.

6. **Producție fără configurare:** `npm run build && npm run start` fără variabile de auth → același `curl` de la pasul 3 întoarce `503`, nu un răspuns de la model.
7. **Pe domeniul de producție**, pașii 2–5 încă o dată. Aici se rupe de obicei, fiindcă fluxul de redirectări depinde de domeniu. Logul de la pasul 4 se citește în Vercel → proiect → **Logs**.

Ce vezi când ceva lipsește sau e greșit:

| Simptom                                                                   | Cauza                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Nu apare „Conectează-te"                                                  | lipsește una dintre cele trei variabile obligatorii, sau serverul nu a fost repornit |
| Pagină GitHub: „The redirect_uri is not associated with this application" | callback URL greșit sau alt port/domeniu (vezi Pași manuali §1)                      |
| Revii în aplicație cu „Autentificarea e configurată greșit"               | `AUTH_GITHUB_SECRET` greșit; detaliile sunt în terminal                              |
| Chatul răspunde „Autentificarea nu e configurată pe server…" (`503`)      | build de producție fără variabile — adaugă-le în Vercel și fă Redeploy               |
| Te-ai conectat, dar după redeploy ești deconectat                         | `AUTH_SECRET` s-a schimbat — comportament corect                                     |
