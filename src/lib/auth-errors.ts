// Codurile de eroare ale autentificării, traduse pentru om — ÎNTR-UN SINGUR LOC.
//
// Codurile vin pe `/?error=<cod>` din două surse:
// - de la furnizor, prin ruta noastră catch-all, cu motivul păstrat întreg
//   (`access_denied` = omul a apăsat „Cancel");
// - de la librărie, prin `pages.error`/`pages.signIn` din `auth.ts`
//   (`OAuthSignin`, `OAuthCallbackError`, `Configuration`…).
//
// Fișierul e pur (fără `document`, fără store): primește un cod, întoarce un text.
// De aceea se poate citi, verifica și extinde fără browser.

export type AuthErrorTone =
  /** Nu s-a stricat nimic — ex.: utilizatorul s-a răzgândit. Afișat neutru. */
  | "info"
  /** Chiar a eșuat ceva și merită reîncercat sau raportat. */
  | "error";

export type AuthErrorDescription = {
  tone: AuthErrorTone;
  title: string;
  description: string;
};

const GENERIC: AuthErrorDescription = {
  tone: "error",
  title: "Conectarea nu a reușit",
  description:
    "Ceva n-a mers în timpul autentificării. Încearcă din nou; dacă se repetă, detaliile sunt în jurnalul serverului."
};

/**
 * Registru, nu `switch`: un cod nou înseamnă o intrare aici, iar interfața nu se
 * atinge. `Partial`, pentru că lista librăriei e lungă și se schimbă între versiuni —
 * ce nu e aici cade pe mesajul generic.
 */
const AUTH_ERRORS: Partial<Record<string, AuthErrorDescription>> = {
  // De la furnizor (OAuth 2.0, RFC 6749 §4.1.2.1).
  access_denied: {
    tone: "info",
    title: "Conectare anulată",
    description:
      "Ai renunțat la furnizor, așa că nu te-am conectat. Poți folosi aplicația în continuare și te poți conecta oricând."
  },
  temporarily_unavailable: {
    tone: "error",
    title: "Furnizorul nu răspunde acum",
    description: "Serviciul de autentificare e indisponibil momentan. Încearcă din nou peste câteva minute."
  },
  server_error: {
    tone: "error",
    title: "Furnizorul a avut o eroare",
    description: "Autentificarea a eșuat de partea furnizorului, nu a aplicației. Încearcă din nou peste câteva minute."
  },

  // De la librărie. Verificat în `@auth/core/errors.js` (`clientErrors`): doar o
  // listă scurtă de tipuri ajunge în URL cu numele lor; ORICE altă eroare
  // (`InvalidCheck`, `OAuthSignInError`, `MissingSecret`…) ajunge ca `Configuration`,
  // ca să nu scape detalii interne spre browser. Deci nu are rost să traducem aici
  // coduri care n-au cum să sosească.
  OAuthCallbackError: GENERIC,
  MissingCSRF: {
    tone: "error",
    title: "Conectarea a expirat",
    description:
      "Pagina a stat deschisă prea mult sau cererea a venit din alt tab. Reîncarcă pagina și conectează-te din nou."
  },
  AccessDenied: {
    tone: "error",
    title: "Acces refuzat",
    description: "Contul acesta nu are voie să se conecteze la aplicație."
  },
  Configuration: {
    tone: "error",
    title: "Autentificarea e configurată greșit",
    description:
      "Autentificarea a eșuat din cauza unei probleme pe server (de exemplu credențiale OAuth greșite). Detaliile sunt în jurnalul serverului."
  },
  NotConfigured: {
    tone: "info",
    title: "Autentificarea nu e configurată",
    description: "Serverul acesta rulează fără autentificare. Vezi docs/nextauth/README.md."
  }
};

/**
 * Textul pentru un cod de eroare. Niciodată codul brut pe ecran și niciodată
 * mesajul librăriei (în engleză): un cod necunoscut dă mesajul generic.
 *
 * `Object.hasOwn`, nu `AUTH_ERRORS[code]` direct: codul vine din URL, iar un
 * `?error=toString` ar fi nimerit o proprietate moștenită de orice obiect.
 */
export function describeAuthError(code: string): AuthErrorDescription {
  return (Object.hasOwn(AUTH_ERRORS, code) ? AUTH_ERRORS[code] : undefined) ?? GENERIC;
}
