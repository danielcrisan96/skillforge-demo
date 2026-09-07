import { useSyncExternalStore } from "react";

import { useAppStore } from "@/store/useAppStore";

/** Abonament gol: „sunt în browser" nu se schimbă niciodată după prima randare. */
const subscribe = () => () => {};

/**
 * Spune dacă interfața are voie să afișeze datele salvate.
 *
 * Problema pe care o rezolvă:
 * `persist` citește `localStorage` SINCRON, încă de la crearea store-ului — adică
 * înainte ca React să randeze prima dată în browser. Deci steagul `hasHydrated`
 * din store e deja `true` la prima randare de client, în timp ce serverul a
 * randat cu `false`. Cele două randări ar produce HTML diferit, React ar raporta
 * o eroare de hidratare și ar arunca marcajul primit de la server.
 *
 * `useSyncExternalStore` cu două instantanee diferite e exact unealta pentru
 * asta: pe server întoarce `false`, în browser `true`, iar React știe că
 * diferența e intenționată și nu o tratează ca pe o nepotrivire.
 *
 * De ce nu `useState` + `useEffect`, varianta pe care o vezi peste tot: face
 * același lucru, dar printr-o randare în plus declanșată dintr-un efect — exact
 * tiparul pe care regula `react-hooks/set-state-in-effect` îl semnalează.
 *
 * De ce combinăm cu `hasHydrated`: dacă stocarea devine asincronă (IndexedDB, sau
 * baza de date din F6), montarea s-ar termina înaintea citirii. `hasHydrated`
 * acoperă acel caz, `isClient` îl acoperă pe acesta.
 */
export function useHydrated(): boolean {
  const hasHydrated = useAppStore(state => state.hasHydrated);

  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  return isClient && hasHydrated;
}
