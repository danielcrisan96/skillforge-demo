import { useSyncExternalStore } from "react";

// Abonament gol, la fel ca în `useHydrated`: disponibilitatea clipboard-ului
// nu se schimbă în timp ce pagina e deschisă, doar între randarea de server
// și cea de client.
const subscribe = () => () => {};

/**
 * Spune dacă `navigator.clipboard` există — adevărat doar în context securizat
 * (HTTPS sau `localhost`). Cine deschide aplicația pe IP-ul din rețeaua locală
 * primește `undefined` la API, deci butonul de copiere trebuie să se ascundă,
 * nu doar să eșueze tăcut la apăsare.
 *
 * De ce `useSyncExternalStore` și nu `useState` + `useEffect`: a doua variantă
 * ar însemna un `setState` chemat direct din corpul efectului — exact tiparul
 * semnalat de regula `react-hooks/set-state-in-effect` (vezi și
 * `useHydrated`). Aici API-ul nu există pe server, deci instantaneul de server
 * e mereu `false`; React ştie diferenţa e intenţionată şi n-o tratează ca pe o
 * nepotrivire de hidratare.
 */
export function useClipboardAvailable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => typeof navigator !== "undefined" && Boolean(navigator.clipboard),
    () => false
  );
}
