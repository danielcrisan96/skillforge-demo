"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

import type { AuthConfig } from "@/lib/types";

// „E autentificarea configurată?" — răspuns pe care îl știe DOAR serverul.
//
// Se calculează o dată, în `page.tsx` (componentă de server, care poate citi
// `process.env`), și coboară în arbore prin contextul ăsta. De ce context și nu
// props: formularul de profil e randat dintr-un registru de secțiuni
// (`settings-dialog.tsx`), unde fiecare panou e un `ComponentType` FĂRĂ props.
// Pasat manual, `authAvailability` ar fi stricat semnătura registrului pentru o
// singură secțiune — sau ar fi trebuit cărat prin componente cărora nu le pasă.
//
// E al doilea rost al lui `useContext` în proiect, diferit de temă: acolo e o
// preferință care se SCHIMBĂ; aici e CONFIGURAȚIE citită o singură dată, care nu
// se schimbă cât timp pagina e deschisă. Tocmai de asta nu are ce căuta în store:
// n-are acțiuni, n-are persistență și nu e a utilizatorului.
//
// De la F6.2 poartă și `persistenceAvailable` („există un server de pe care datele
// contului pot reveni?”), tot calculat în `page.tsx`. Câmp nou aici, NU un context
// separat, pentru că e varianta mai simplă: un context propriu ar fi însemnat încă
// un provider în arbore și încă un fișier pentru un singur DA/NU cu un singur
// consumator (`server-sync.tsx`), care oricum citește deja contextul ăsta. Și are
// sens doar împreună cu `configured`: fără autentificare nu există persistență.

/**
 * Valoarea implicită = „neconfigurat". Dacă cineva uită providerul deasupra, ramura
 * aleasă e cea sigură: nu se montează nicio componentă care cheamă `useSession`
 * fără `SessionProvider` (ar arunca), iar `persistenceAvailable: false` înseamnă că
 * nimic nu golește `localStorage`.
 */
const AuthConfigContext = createContext<AuthConfig>({
  configured: false,
  availableProviderIds: [],
  persistenceAvailable: false
});

export function AuthConfigProvider({ value, children }: { value: AuthConfig; children: ReactNode }) {
  return (
    <AuthConfigContext.Provider value={value}>
      {/* ⚠️ `SessionProvider` se montează DOAR când autentificarea e configurată.
          Fără configurare, el ar cere `/api/auth/session` la montare și la fiecare
          revenire în tab — cereri garantat inutile.

          Consecința de ținut minte: `useSession` e legal NUMAI sub ramura asta. Cum un
          hook nu se poate chema condiționat (`if (configured) useSession()` încalcă
          regulile hook-urilor), ramura se face prin COMPONENTE SEPARATE — vezi
          `sidebar-account.tsx` și `account-email-field.tsx`: o componentă citește
          `configured` din context și o montează pe cealaltă, care cheamă hook-ul,
          doar când e sigur că providerul există. */}
      {value.configured ? <SessionProvider>{children}</SessionProvider> : children}
    </AuthConfigContext.Provider>
  );
}

/** Citește configurația de autentificare. Sigur de chemat oriunde, cu sau fără sesiune. */
export function useAuthConfig(): AuthConfig {
  return useContext(AuthConfigContext);
}
