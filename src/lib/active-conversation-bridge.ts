import type { UIMessage } from "ai";

// Puntea dintre `chat.tsx` (unde trăiesc mesajele conversației deschise, prin
// `useChat` — vezi D-19 din requirements) și `AppHeader` (unde stă exportul,
// într-un component FRATE, nu descendent, deci nu poate primi mesajele prin
// props sau context de sus în jos).
//
// NU e o a doua sursă de adevăr, deși pare o stare globală clasică: nimic nu
// se RANDEAZĂ pornind de aici. `Chat` scrie aici la fiecare schimbare de
// mesaje; header-ul citește o singură dată, în clipa apăsării butonului de
// export — un instantaneu, nu un abonament. Fără randare legată de valoarea
// asta, nu există ce să se desincronizeze: la următorul export se citește
// oricum starea curentă.
let activeMessages: UIMessage[] = [];

export function setActiveMessages(messages: UIMessage[]): void {
  activeMessages = messages;
}

export function getActiveMessages(): UIMessage[] {
  return activeMessages;
}
