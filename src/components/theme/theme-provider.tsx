"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { ResolvedTheme, ThemePreference } from "@/lib/types";

// Tema, pe mecanismul ei — `createContext` + `useContext`, NU store-ul Zustand.
//
// De ce a ieșit din `useAppStore`, deși până la acest pas stătea acolo (vezi
// istoricul din `useAppStore.ts`): e pasul didactic unde se închide comparația
// store vs. context, pe cod real. Tema are un singur consumator logic — „ce se
// vede pe ecran acum" — citit din puține locuri (fereastra de preferințe,
// `Toaster`-ul de notificări) și se schimbă RAR (un clic în preferințe, sau
// ocazional un eveniment de la sistemul de operare). Exact profilul pentru care
// lipsa selectors a lui `useContext` nu costă nimic: fiecare consumator al
// `ThemeProvider` se re-randează la orice schimbare de temă, dar sunt puțini
// consumatori și schimbarea e rară — spre deosebire de conversații (multe
// locuri, multe schimbări pe secundă în timpul streamului), unde store-ul cu
// selectors chiar contează. Regula generală rămâne scrisă în `useAppStore.ts`.
//
// De ce nu `next-themes`, deși vine instalat cu shadcn (folosit de `sonner`):
// scopul pasului e mecanismul scris de mână, nu biblioteca — vezi discuția din
// `sonner.tsx` pentru cazul concret unde asta contează.

const STORAGE_KEY = "skillforge-theme";

/**
 * Cheia veche, din perioada când preferința de temă stătea în store-ul
 * Zustand persistat (`useAppStore`, cheia `skillforge-app`). Citită DOAR ca
 * punte, o singură dată, dacă cheia nouă lipsește — ca cineva care avea deja
 * o preferință salvată să nu vadă tema resetată la „sistem" la primul refresh
 * de după acest refactor. De șters cândva, când nu mai are cine să aibă cheia
 * veche fără cea nouă.
 */
const LEGACY_STORAGE_KEY = "skillforge-app";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Singura regulă de decizie a temei efective: preferință + starea curentă a
 * sistemului. Pură și exportată separat, ca să rămână, cum spun cerințele,
 * SINGURUL loc care decide ce înseamnă „sistem" — și ca să poată fi testată
 * fără DOM, fără provider, fără `matchMedia`.
 */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference !== "system") return preference;
  return systemPrefersDark ? "dark" : "light";
}

/**
 * Lazy initializer pentru `useState`: rulează o singură dată, la primul
 * randat pe client, nu la fiecare randare. Totul e în `try/catch` pentru că
 * `localStorage` poate arunca — navigare privată, cookie-uri blocate — și pe
 * server nici măcar nu există (`ReferenceError`, prins de același `catch`).
 * În ambele cazuri aplicația trebuie să pornească pe tema sistemului, nu să
 * crape.
 */
function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isThemePreference(stored)) return stored;

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyTheme = (JSON.parse(legacyRaw) as { state?: { theme?: unknown } })?.state?.theme;
      if (isThemePreference(legacyTheme)) return legacyTheme;
    }
  } catch {
    // Stocare blocată sau inexistentă (server) — pornim pe „sistem", nu pe o
    // eroare care oprește randarea.
  }
  return "system";
}

type ThemeContextValue = {
  /** Ce a ales utilizatorul — „sistem" nu e o temă, e o instrucțiune. */
  theme: ThemePreference;
  /** Ce se vede efectiv pe ecran, calculat cu `resolveTheme`. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};

// `undefined` ca valoare implicită, intenționat — nu o temă „safe" oarecare.
// Dacă am pune aici direct un `ThemeContextValue`, un consumator folosit din
// greșeală în afara providerului n-ar crăpa la citire, ci ar primi liniștit o
// temă falsă și un `setTheme` care nu schimbă nimic: bug tăcut, descoperit
// mult mai târziu decât apariția lui. Cu `undefined`, `useTheme()` poate
// distinge „nu există provider" de „providerul chiar a ales asta" și aruncă
// imediat, cu mesaj — nu la trei fișiere distanță, într-un `useContext` care a
// întors `undefined` fără explicație.
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme() trebuie apelat dintr-un component aflat în interiorul <ThemeProvider>.");
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Alegerea rămâne validă pentru sesiunea curentă; doar nu supraviețuiește
      // unui refresh. Nu e motiv să oprim aplicația.
    }
  };

  useEffect(() => {
    // Pe „light" sau „dark", alegerea utilizatorului bate sistemul — nu are
    // sens să ascultăm evenimente de la el, un eveniment n-ar avea ce schimba.
    // Abonamentul se creează DOAR cât timp preferința e „sistem" și se strânge
    // la ieșire — fie la demontare, fie chiar la schimbarea preferinței, pentru
    // că efectul rulează din nou la fiecare schimbare a lui `theme`.
    if (theme !== "system") {
      setResolvedTheme(theme);
      return;
    }

    const media = window.matchMedia(DARK_MEDIA_QUERY);

    const apply = () => setResolvedTheme(resolveTheme("system", media.matches));

    // Nu ne mulțumim cu o citire unică la montare: apelăm `apply` acum, ca să
    // avem o valoare corectă imediat, DAR sursa de adevăr rămâne evenimentul —
    // dacă sistemul își schimbă tema cât aplicația e deschisă, `change` e cel
    // care ne anunță, nu o nouă citire la un moment ales de noi.
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    // Puntea către CSS: clasa `.dark` pe `<html>` activează al doilea set de
    // tokeni din `globals.css` (vezi `@custom-variant dark` de acolo — fără ea,
    // Tailwind v4 ar lega `dark:` de `prefers-color-scheme`, nu de clasă, și
    // comutatorul n-ar schimba nimic vizibil). `color-scheme` e pentru ce
    // desenează browserul singur — bara de scroll, câmpurile native — care nu
    // ascultă de clase Tailwind.
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}
