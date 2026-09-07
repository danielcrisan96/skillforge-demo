import * as React from "react";

// Fișier generat de shadcn odată cu componenta `sidebar`, rescris intenționat.
//
// Varianta livrată folosea `useState` + `useEffect` și pica la `npm run lint`,
// pe regula `react-hooks/set-state-in-effect`: seta starea direct în corpul
// efectului, ceea ce provoacă o randare în plus la fiecare montare.
//
// `useSyncExternalStore` e unealta potrivită pentru exact cazul ăsta — o valoare
// care trăiește în afara React (aici, `matchMedia`) și pe care React trebuie doar
// s-o citească și s-o urmărească. În plus, primește un instantaneu separat pentru
// server, deci randarea de pe server nu mai trebuie să ghicească lățimea
// ecranului: pornește de la „nu e mobil" și se corectează în browser.

const MOBILE_BREAKPOINT = 768;

const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // Instantaneul de server: pe server nu există fereastră, deci presupunem
    // desktop. Sidebar-ul se corectează singur la prima randare din browser.
    () => false
  );
}
