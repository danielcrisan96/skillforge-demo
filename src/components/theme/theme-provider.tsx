"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { ResolvedTheme } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

// Traduce preferința utilizatorului („sistem" / „light" / „dark") în tema care
// se vede efectiv, și o aplică pe `<html>`.
//
// De ce e nevoie de un component separat, și nu de o linie în butonul de temă:
// „sistem" nu e o valoare fixă, ci o legătură vie cu sistemul de operare. Cineva
// care schimbă tema din Windows în timp ce aplicația e deschisă trebuie să vadă
// schimbarea imediat, fără refresh. Asta cere un listener activ pe toată durata
// vieții aplicației — deci un loc care trăiește cât aplicația.
//
// De ce nu `next-themes`, deși vine instalat cu shadcn: tema e deja în store,
// persistată împreună cu restul preferințelor. Cu două biblioteci care rețin
// tema, ar exista două surse de adevăr care se pot contrazice — clasica
// situație în care interfața arată light iar setarea spune dark.

/**
 * Tema efectivă, expusă componentelor care au nevoie de ea ca VALOARE, nu doar
 * ca stil moștenit din CSS. Concret: `Toaster` (sonner) își desenează notificările
 * în afara arborelui nostru și trebuie să i se spună în cuvinte ce temă e activă.
 */
const ResolvedThemeContext = createContext<ResolvedTheme>("light");

export function useResolvedTheme(): ResolvedTheme {
  return useContext(ResolvedThemeContext);
}

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppStore(state => state.theme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const media = window.matchMedia(DARK_MEDIA_QUERY);

    const apply = () => {
      // Singurul loc din aplicație care decide ce înseamnă „sistem".
      const resolved: ResolvedTheme = theme === "system" ? (media.matches ? "dark" : "light") : theme;

      // Clasa `.dark` e ce activează al doilea set de tokeni din `globals.css`.
      // Fără ea, `bg-background` ar rămâne pe valorile din `:root` și tema n-ar
      // părea că se schimbă, deși setarea s-a salvat.
      document.documentElement.classList.toggle("dark", resolved === "dark");

      // Spune și browserului ce temă folosim, ca elementele desenate de el
      // (bare de scroll, câmpuri native) să nu rămână albe pe fundal întunecat.
      document.documentElement.style.colorScheme = resolved;

      setResolvedTheme(resolved);
    };

    apply();

    // Listener-ul contează doar când preferința e „sistem", dar îl atașăm mereu:
    // `apply` recalculează oricum din preferința curentă, iar o singură cale de
    // execuție e mai greu de stricat decât două ramuri care trebuie ținute în sinc.
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return <ResolvedThemeContext.Provider value={resolvedTheme}>{children}</ResolvedThemeContext.Provider>;
}
