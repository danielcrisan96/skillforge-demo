# Șablon: `docs/<integrare>/README.md`

> Acest fișier este **șablonul**, nu o integrare reală. Se copiază la fiecare integrare externă nouă (provider de LLM, bază de date, autentificare, deploy, monitorizare) în `docs/<integrare>/README.md` și se completează.
>
> Regula e definită în [`requirements.md` §10](../requirements.md#10-convenția-de-documentare-a-integrărilor) și impusă prin `AGENTS.md`. Fișierul nou intră **în același commit** cu codul integrării, iar rândul lui se adaugă în tabelul din [`docs/README.md`](../README.md).
>
> **Ce se documentează aici: doar partea pe care o face omul, manual.** Codul e treaba agentului și se citește din repo. Pașii manuali nu se văd nicăieri și se uită imediat — la reinstalare, pe alt calculator sau la deploy ar fi căutați de la zero.
>
> **Nu se scriu niciodată chei sau valori reale — doar numele variabilelor.** Nici măcar exemple false care arată a chei adevărate.

Șterge acest bloc introductiv după ce copiezi șablonul.

---

# <Numele integrării>

**Faza în care a intrat:** <F1 / F4 / F6 / F7 — vezi requirements.md §7>
**Link către dashboard:** <URL>

## Ce face

<O frază: la ce ne folosește în SkillForge, nu ce e integrarea în general.>

## Cont & chei

- Unde se creează contul: <URL>
- Ce plan e necesar: <free / plan plătit / necesită card>
- Pași care nu sunt evidenți: <verificare email, activarea unei organizații, aprobare care durează etc.>
- De unde se generează cheia, pas cu pas: <Dashboard → Settings → API keys → Create>
- Ce permisiuni sau scope i se dau: <...>
- **Se afișează o singură dată?** <da / nu — dacă da, spune explicit că trebuie copiată atunci>

## Variabile de mediu

| Variabilă de mediu | Ce conține                | Fișier       | Obligatorie |
| ------------------ | ------------------------- | ------------ | ----------- |
| `NUME_VARIABILA`   | <descriere, fără valoare> | `.env.local` | da / nu     |

Rândul corespunzător, adăugat și în `.env.example` (comentat, fără valoare):

```sh
# <ce e, pe scurt>
# NUME_VARIABILA=
```

## Pași manuali

Ce nu poate face agentul — se face o singură dată, de mână, în dashboard-ul furnizorului:

- <ex: adăugarea unui URL de redirect pentru autentificare>
- <ex: activarea unei regiuni sau a unui model anume>
- <ex: setarea unei limite de cheltuială>
- Rotația cheii: cum se revocă una compromisă și cum se pune una nouă, fără downtime — inclusiv unde mai trebuie actualizată în afară de `.env.local` (platforma de deploy, CI etc.)

## Cost & limite

- Model de tarifare: <per token / per lună / per rând stocat>
- Ce e gratuit și până unde: <limitele planului free, rate limits>
- Pagina oficială de prețuri: <URL>
- **Verificat la data:** <AAAA-LL-ZZ>
- Unde se vede consumul curent: <URL sau drum în dashboard>

> Prețurile se schimbă. Scrie data verificării, ca să se știe cât de veche e informația.

## Verificare

Cum confirmi, în mai puțin de un minut, că integrarea e configurată corect:

1. <comandă sau acțiune în aplicație>
2. <ce trebuie să vezi>
3. <ce vezi dacă cheia lipsește sau e greșită — mesajul concret de eroare>
