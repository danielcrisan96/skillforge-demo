# SkillForge

Copilot personal de skills și carieră: o aplicație web în care un agent AI îți cunoaște profilul real — stack, skill-uri cu nivel, obiectiv — și îți răspunde **în contextul tău**, cu pași concreți de învățare spre acel obiectiv.

Spre deosebire de un chat generic, profilul e salvat, crește în timp și stă la baza fiecărui răspuns.

Se construiește modul cu modul, ca proiect-fir-roșu al unui curs despre integrarea unui LLM într-o interfață web reală.

## Cum se rulează

**Încă nu există cod.** Faza curentă (F0) pune la punct documentația și convențiile; scheletul Next.js + TypeScript și primul chat cu streaming intră în faza F1.

Singurele comenzi disponibile acum țin de fișierele de instrucțiuni pentru agenți:

```sh
sh scripts/sync-agent-docs.sh    # regenerează CLAUDE.md și .github/copilot-instructions.md din AGENTS.md
sh scripts/check-agent-docs.sh   # verifică dacă sunt sincronizate (util ca pre-commit sau în CI)
```

## Documentație

| Fișier | Ce conține |
|---|---|
| [`docs/requirements.md`](docs/requirements.md) | **Sursa de adevăr**: ce construim, pentru cine, fazele, cerințele non-funcționale, glosarul |
| [`AGENTS.md`](AGENTS.md) | Convențiile pentru agenții AI care lucrează pe proiect (singurul fișier de instrucțiuni editat manual) |
| [`docs/_TEMPLATE-integrare.md`](docs/_TEMPLATE-integrare.md) | Șablonul pentru pașii manuali ai fiecărei integrări externe |

Fiecare integrare externă (provider de LLM, bază de date, autentificare, deploy) primește propriul `docs/<integrare>/README.md` cu partea care se face de mână: cont, generarea cheii, variabila de mediu, configurări în dashboard, costuri.

## Reguli care nu se negociază

- **Cheile de API stau doar pe server**, în `.env.local` (gitignorat), și nu ajung niciodată în browser. În documentație se scriu doar numele variabilelor.
- **Deciziile se scriu în `docs/requirements.md`**, nu doar în conversație.
- `CLAUDE.md` și `.github/copilot-instructions.md` sunt **generate** — se editează `AGENTS.md` și se rulează scriptul de sync.
