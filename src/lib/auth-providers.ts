import type { AuthProviderId } from "@/lib/types";

// Registrul furnizorilor de autentificare — singura listă din aplicație.
//
// Ca și `providers.ts`, fișierul ăsta AJUNGE ÎN BROWSER: fereastra de login îl
// importă ca să-și deseneze butoanele. Deci aici nu intră niciun `process.env` și
// niciun secret — doar etichete, starea din registru și NUMELE variabilelor. Tot
// ce citește valori stă în `src/lib/auth.ts`, importat doar pe server.
//
// De ce un registru și nu `if (provider === "github")` în fereastră: la al doilea
// furnizor, `if`-urile ar fi în trei locuri (fereastră, configurație, documentație)
// și s-ar desincroniza. Aici, activarea lui Google = `status: "active"` + cele două
// variabile de mediu. Nimic de desenat, nicio componentă de scris.

export type AuthProviderStatus =
  /** Se poate folosi, dacă serverul are și credențialele lui. */
  | "active"
  /**
   * Afișat, dar dezactivat, cu eticheta „în curând". Nu e o schiță: siglă,
   * id și variabile sunt deja complete, ca activarea să fie o singură valoare.
   */
  | "coming-soon";

export type AuthProviderInfo = {
  /** Id-ul EXACT al providerului din `next-auth` — vezi `AuthProviderId`. */
  id: AuthProviderId;
  /** Numele de brand, afișat pe buton. */
  label: string;
  status: AuthProviderStatus;
  /**
   * NUMELE variabilelor, nu valorile. Urmează convenția pe care `next-auth` o
   * recunoaște singur (`AUTH_<ID>_ID` / `AUTH_<ID>_SECRET`), ca documentația,
   * `.env.example` și librăria să vorbească despre aceleași nume.
   */
  clientIdEnvVar: string;
  clientSecretEnvVar: string;
};

export const AUTH_PROVIDERS: Record<AuthProviderId, AuthProviderInfo> = {
  github: {
    id: "github",
    label: "GitHub",
    status: "active",
    clientIdEnvVar: "AUTH_GITHUB_ID",
    clientSecretEnvVar: "AUTH_GITHUB_SECRET"
  },
  google: {
    id: "google",
    label: "Google",
    status: "coming-soon",
    clientIdEnvVar: "AUTH_GOOGLE_ID",
    clientSecretEnvVar: "AUTH_GOOGLE_SECRET"
  }
};

/** Ordinea de afișare în fereastra de login. */
export const AUTH_PROVIDER_IDS = Object.keys(AUTH_PROVIDERS) as AuthProviderId[];

/**
 * NUMELE secretului de sesiune. `next-auth` îl citește singur din mediu; îl
 * scriem aici doar ca verificarea „e configurat?" și mesajele să nu repete șirul.
 */
export const AUTH_SECRET_ENV_VAR = "AUTH_SECRET";
