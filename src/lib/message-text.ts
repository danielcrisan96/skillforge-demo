import type { UIMessage } from "ai";

/**
 * Textul unui mesaj, compus din părțile lui.
 *
 * CAPCANA PASULUI, și motivul pentru care funcția asta există într-un fișier
 * separat în loc să fie o linie scrisă în trei componente.
 *
 * Un mesaj nu are `content: string`. Are `parts` — o listă de bucăți TIPATE:
 * text, raționament, apel de unealtă, fișier. `message.content` compilează dacă
 * tipul e slab și întoarce `undefined` la rulare: pe ecran nu apare nimic, nu
 * crapă nimic, iar concluzia firească — și greșită — e „nu merge streamingul".
 *
 * De ce e o listă și nu un șir: din F5, același mesaj va conține și apeluri de
 * unealtă, nu doar text. Structura de acum e deja pregătită pentru asta.
 *
 * Aici păstrăm doar părțile de tip text, fiindcă asta afișăm în F1.4.
 */
export function messageText(message: UIMessage): string {
  return message.parts
    .filter(part => part.type === "text")
    .map(part => part.text)
    .join("");
}
