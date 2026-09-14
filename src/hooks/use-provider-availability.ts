import { useSyncExternalStore } from "react";

import type { ProviderAvailability, ProviderId } from "@/lib/types";

// Aduce de pe server răspunsul la „ce provideri au cheie", o singură dată.
//
// De ce trebuie adus, în loc să fie citit direct: „configurat" e o proprietate a
// SERVERULUI. Cheile stau în `.env.local` sau în variabilele platformei, iar
// browserul n-are cum să le vadă — și nici nu trebuie. Clientul nu atinge
// niciodată `process.env`, nici măcar pentru un `Boolean(...)`; primește un
// verdict deja calculat, ca dată de afișat (vezi `GET /api/providers`).
//
// De ce un modul cu abonați și `useSyncExternalStore`, în loc de `useState` +
// `useEffect` cu `fetch` în fiecare component:
//
//   1. Răspunsul se schimbă doar când repornește serverul (sau la un redeploy),
//      deci o cerere per încărcare de pagină e exact cât trebuie. Cu `useEffect`
//      în composer, ar pleca o cerere nouă la FIECARE remontare — iar composer-ul
//      se remontează la fiecare comutare de conversație (`key={conversationId}`).
//   2. Îl folosesc două locuri (composer-ul și secțiunea din preferințe), dar
//      cererea rămâne una singură, indiferent câte componente îl cer.
//   3. Evită `setState` chemat din corpul unui efect — tiparul semnalat de
//      `react-hooks/set-state-in-effect`, evitat la fel și în
//      `useClipboardAvailable` și `useHydrated`.

export type ProviderAvailabilityMap = Partial<Record<ProviderId, ProviderAvailability>>;

let snapshot: ProviderAvailabilityMap | null = null;
let hasStarted = false;
const listeners = new Set<() => void>();

function start(): void {
  if (hasStarted) return;
  hasStarted = true;

  void fetch("/api/providers")
    .then(response => response.json())
    .then((data: { providers?: ProviderAvailability[] }) => {
      const next: ProviderAvailabilityMap = {};
      for (const entry of data.providers ?? []) next[entry.id] = entry;

      snapshot = next;
      for (const listener of listeners) listener();
    })
    .catch(() => {
      // Rămâne `null`, adică „încă nu știu". Intenționat nu marcăm nimic drept
      // indisponibil: dacă sondajul ăsta cade (offline, server repornit exact
      // atunci), varianta proastă ar fi să dezactivăm opțiuni care funcționează
      // perfect. Trimiterea mesajului spune oricum adevărul — un provider fără
      // cheie răspunde cu 400 și cu motivul scris.
    });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Disponibilitatea providerilor, sau `null` cât timp încă nu s-a primit.
 *
 * `null` nu înseamnă „niciunul" — înseamnă „nu știu încă", iar interfața tratează
 * cele două diferit: cât timp nu știe, nu dezactivează nimic. Altfel, la fiecare
 * încărcare, opțiunile ar clipi o clipă ca dezactivate înainte să se afle că sunt
 * bune — iar un utilizator rapid ar da peste un buton mort fără motiv.
 */
export function useProviderAvailability(): ProviderAvailabilityMap | null {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    // Instantaneul de server: pe server nu există `fetch` către noi înșine și
    // nici nevoia — HTML-ul inițial se randează fără verdicte, iar clientul le
    // completează imediat după hidratare.
    () => null
  );
}
