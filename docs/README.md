# Documentație SkillForge

- [`requirements.md`](./requirements.md) — sursa de adevăr: ce construim, pentru cine, fazele, cerințele non-funcționale, glosarul. Se citește înainte de orice modul nou.
- [`_template/README.md`](./_template/README.md) — șablonul pentru documentul unei integrări externe noi.

## Integrări externe

Fiecare integrare externă (provider de LLM, bază de date, autentificare, deploy, monitorizare) are propriul folder, cu pașii pe care îi face omul de mână — cont, cheie, configurări în dashboard, cost. Regula completă e în [`requirements.md` §10](./requirements.md#10-convenția-de-documentare-a-integrărilor).

| Integrare | La ce pas a intrat | Link                                                |
| --------- | ------------------ | --------------------------------------------------- |
| Vercel    | F1.2 → F2.5        | [`docs/vercel/README.md`](./vercel/README.md)       |
| Anthropic | F1.4               | [`docs/anthropic/README.md`](./anthropic/README.md) |
