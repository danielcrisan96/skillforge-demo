# Șablon: `docs/<integrare>/README.md`

> Acest fișier este **șablonul**, nu o integrare reală. Se copiază la fiecare integrare externă nouă (provider de LLM, bază de date, autentificare, deploy, monitorizare) în `docs/<integrare>/README.md` și se completează.
>
> Regula e definită în [`requirements.md` §10](./requirements.md#10-convenția-de-documentare-a-integrărilor) și impusă prin `AGENTS.md`.
>
> **Ce se documentează aici: doar partea pe care o face omul, manual.** Codul e treaba agentului și se citește din repo. Pașii manuali nu se văd nicăieri și se uită imediat — la reinstalare, pe alt calculator sau la deploy ar fi căutați de la zero.
>
> **Nu se scriu niciodată chei sau valori reale — doar numele variabilelor.** Nici măcar exemple false care arată a chei adevărate.

Șterge acest bloc introductiv după ce copiezi șablonul.

---

# <Numele integrării>

**Pentru ce o folosim:** <o frază — ce face în SkillForge>
**Faza în care a intrat:** <F1 / F4 / F6 / F7 — vezi requirements.md §7>
**Link către dashboard:** <URL>

## 1. Cont

- Unde se creează contul: <URL>
- Ce plan e necesar: <free / plan plătit / necesită card>
- Pași care nu sunt evidenți: <verificare email, activarea unei organizații, aprobare care durează etc.>

## 2. Cheia / credențialele

- De unde se generează, pas cu pas: <Dashboard → Settings → API keys → Create>
- Ce permisiuni sau scope i se dau: <...>
- **Se afișează o singură dată?** <da / nu — dacă da, spune explicit că trebuie copiată atunci>
- Unde o pui local: `.env.local` (fișier gitignorat)

| Variabilă de mediu | Ce conține | Obligatorie |
|---|---|---|
| `NUME_VARIABILA` | <descriere, fără valoare> | da / nu |

## 3. Configurări în dashboard-ul lor

Ce trebuie bifat/setat manual și nu se poate face din cod:

- <ex: adăugarea unui URL de redirect pentru autentificare>
- <ex: activarea unei regiuni sau a unui model anume>
- <ex: setarea unei limite de cheltuială>

## 4. Costuri

- Model de tarifare: <per token / per lună / per rând stocat>
- Ce e gratuit și până unde: <limitele planului free>
- Pagina oficială de prețuri: <URL>
- **Verificat la data:** <AAAA-LL-ZZ>
- Unde se vede consumul curent: <URL sau drum în dashboard>
- Limită de cheltuială configurată: <da, cât / nu>

> Prețurile se schimbă. Scrie data verificării, ca să se știe cât de veche e informația.

## 5. Verificare că merge

Cum confirmi, în mai puțin de un minut, că integrarea e configurată corect:

1. <comandă sau acțiune în aplicație>
2. <ce trebuie să vezi>
3. <ce vezi dacă cheia lipsește sau e greșită — mesajul concret de eroare>

## 6. Rotația și revocarea cheii

- Cum se revocă o cheie compromisă: <pași>
- Cum se generează una nouă fără downtime: <pași>
- Unde mai trebuie actualizată în afară de `.env.local`: <platforma de deploy, CI etc.>

## 7. Capcane întâlnite

Lucruri care ne-au costat timp, ca să nu se repete:

- <ex: cheia nu funcționează imediat după creare>
- <ex: numele variabilei diferă între SDK și documentație>
