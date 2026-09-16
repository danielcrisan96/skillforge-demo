import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";

import { AUTH_PROVIDERS, AUTH_PROVIDER_IDS, AUTH_SECRET_ENV_VAR } from "@/lib/auth-providers";
import type { AuthAvailability, AuthProviderId } from "@/lib/types";

// Autentificarea, partea de SERVER. Importat doar din Route Handlere și din
// componente de server — niciodată dintr-un fișier cu „use client".
//
// ⚠️ Versiunea contează aici mai mult decât oriunde în proiect. `next-auth` v4
// (cea din aproape toate exemplele de pe internet) se configura cu un OBIECT
// exportat (`export const authOptions = {...}`) pasat apoi la `getServerSession`.
// În v5 (Auth.js), instalată aici, `NextAuth(...)` se cheamă O SINGURĂ DATĂ și
// întoarce FUNCȚIILE: `handlers` (pentru ruta catch-all), `auth` (citește
// sesiunea pe server), `signIn`, `signOut`. `getServerSession` nu mai există —
// codul din exemplele vechi nu compilează.
//
// Fără bază de date, intenționat: sesiunea e un JWT criptat, ținut într-un cookie
// (strategia implicită când nu există adapter). Serverul nu salvează nimic despre
// utilizator — doar verifică, la fiecare cerere, că cookie-ul a fost semnat cu
// `AUTH_SECRET`. Consecința: cine are secretul își poate FABRICA o sesiune
// validă pentru oricine. De aceea e marcat „secret" în `docs/nextauth/README.md`.

/**
 * Tipul sesiunii, extins cu `id`.
 *
 * Librăria nu pune niciun identificator în sesiune în mod implicit — doar nume,
 * email și poză, „pentru afișare". Iar fără bază de date, `user.id` intern e un
 * UUID generat din nou la FIECARE login, deci n-ar identifica pe nimeni de la o
 * zi la alta. Construim noi un id stabil — vezi callback-ul `jwt` de mai jos.
 */
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

/**
 * Singurul loc care leagă un id din registru de providerul din librărie.
 *
 * `Record<AuthProviderId, …>`, nu `switch`: compilatorul cere o intrare pentru
 * fiecare furnizor din registru. De aceea Google e deja aici, deși e „în curând":
 * activarea lui nu cere cod nou, doar `status: "active"` în `auth-providers.ts`.
 *
 * Credențialele se dau EXPLICIT, din numele scrise în registru. Librăria le-ar
 * găsi și singură (`AUTH_GITHUB_ID`…), dar atunci numele ar trăi în două locuri —
 * în registru pentru verificare și în convenția librăriei pentru folosire — iar
 * „e configurat?" ar putea spune altceva decât ce folosește librăria de fapt.
 */
const AUTH_PROVIDER_FACTORIES: Record<AuthProviderId, (credentials: OAuthCredentials) => Provider> = {
  github: credentials => GitHub(credentials),
  google: credentials => Google(credentials)
};

type OAuthCredentials = { clientId: string; clientSecret: string };

/** Valoarea unei variabile de mediu, sau `null` dacă lipsește ori e șir gol. */
function readEnv(name: string): string | null {
  // Indexare dinamică: pe server `process.env` e obiectul din Node, citit la
  // RULARE — vezi comentariul din `providers.server.ts` despre de ce în codul de
  // client asta n-ar merge niciodată.
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function credentialsFor(id: AuthProviderId): OAuthCredentials | null {
  const provider = AUTH_PROVIDERS[id];
  const clientId = readEnv(provider.clientIdEnvVar);
  const clientSecret = readEnv(provider.clientSecretEnvVar);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Activ în registru ȘI cu credențiale pe server — doar atunci se poate apăsa. */
function availableProviderIds(): AuthProviderId[] {
  return AUTH_PROVIDER_IDS.filter(id => AUTH_PROVIDERS[id].status === "active" && credentialsFor(id) !== null);
}

/**
 * E autentificarea configurată pe serverul ăsta?
 *
 * Lipsa configurării e o STARE a aplicației, nu o excepție: cine clonează
 * proiectul și nu ajunge să creeze o aplicație OAuth trebuie să poată rula tot
 * restul. Nimic din fișierul ăsta nu aruncă la import — totul se citește în
 * funcții, la cerere, din același motiv ca cheile de model: un `throw` la nivel
 * de modul ar strica `next build` pe orice calculator fără `.env.local`.
 */
export function isAuthConfigured(): boolean {
  return readEnv(AUTH_SECRET_ENV_VAR) !== null && availableProviderIds().length > 0;
}

/** Verdictele pentru interfață — niciodată valori. Vezi `AuthAvailability`. */
export function getAuthAvailability(): AuthAvailability {
  const configured = isAuthConfigured();
  return { configured, availableProviderIds: configured ? availableProviderIds() : [] };
}

/**
 * Inițializarea „leneșă": `NextAuth` primește o FUNCȚIE, nu un obiect.
 *
 * Diferența e momentul în care se citesc variabilele de mediu. Cu obiect, lista de
 * provideri s-ar construi o dată, la importul modulului; cu funcție, la fiecare
 * cerere — aceeași regulă ca pentru cheile de model („citește în handler, nu la
 * nivel de modul"), deci nimic nu se evaluează în timpul lui `next build`.
 */
export const { handlers, auth, signOut } = NextAuth(() => ({
  providers: availableProviderIds().map(id => AUTH_PROVIDER_FACTORIES[id](credentialsFor(id)!)),

  /**
   * Paginile librăriei, redirecționate în aplicație.
   *
   * Fără asta, orice eșec ar ateriza pe `/api/auth/error` sau `/api/auth/signin` —
   * pagini generate de librărie, în engleză, care arată a „s-a stricat ceva" și
   * din care nu există drum înapoi. Cu „/", librăria redirecționează la
   * `/?error=<Cod>`, iar `auth-error-notice.tsx` traduce codul în română.
   *
   * Anularea la furnizor NU ajunge pe drumul ăsta: e prinsă înainte, în ruta
   * catch-all, fiindcă pe drumul librăriei motivul se pierde. Vezi acolo.
   */
  pages: { signIn: "/", error: "/" },

  callbacks: {
    /**
     * Rulează când se creează sau se reîmprospătează JWT-ul din cookie.
     *
     * `account` există DOAR la momentul loginului. Atunci compunem id-ul stabil:
     * furnizorul + id-ul contului la furnizor (la GitHub, id-ul numeric, care nu se
     * schimbă nici dacă omul își redenumește contul). E exact ce pune în `sub` un
     * sistem cu bază de date, doar că fără tabel — iar la pasul de persistență
     * devine cheia după care se caută utilizatorul.
     *
     * Prefixul cu furnizorul nu e decor: id-urile numerice de la doi furnizori
     * diferiți se pot suprapune, iar „12345" de pe GitHub nu e „12345" de pe Google.
     */
    jwt({ token, account }) {
      if (account) token.sub = `${account.provider}:${account.providerAccountId}`;
      return token;
    },

    /** Copiază id-ul din token în sesiunea citită de `auth()` și de `useSession()`. */
    session({ session, token }) {
      if (token?.sub) session.user.id = token.sub;
      return session;
    }
  }
}));

/**
 * Rezultatul verificării de acces pentru o rută care costă bani.
 *
 * `userId: null` apare într-un singur caz: dezvoltare locală fără autentificare
 * configurată. Nu e un utilizator „anonim" acceptat în producție — acolo nu se
 * ajunge niciodată la `allowed: true` fără sesiune (vezi mai jos).
 */
export type PaidRouteAccess =
  { allowed: true; userId: string | null } | { allowed: false; status: 401 | 503; message: string };

/**
 * Verificarea care CONTEAZĂ — pe server, în ruta care vorbește cu modelul.
 *
 * Un buton ascuns în interfață nu protejează nimic: ruta e un URL public, oricine
 * o poate chema cu `curl`, fără să deschidă vreodată aplicația. De aceea sesiunea
 * se citește AICI, cu `await auth()` — funcția de server —, nu se deduce din ce
 * spune browserul („sunt autentificat"), care e input neîncredere ca orice corp de
 * cerere.
 *
 * ⚠️ Contradicția dintre „autentificarea e opțională" și „ruta e protejată", rezolvată
 * explicit:
 *
 * - DEZVOLTARE (`next dev`) fără configurare → ruta rămâne DESCHISĂ. E singura
 *   cale ca toată grupa să poată rula proiectul fără o aplicație OAuth, iar
 *   `localhost` nu e un domeniu pe care îl știe toată lumea.
 * - PRODUCȚIE fără configurare → ruta e ÎNCHISĂ (503). Altfel, un deploy în care
 *   cineva a uitat variabilele ar publica din nou ruta de model, deschisă oricui
 *   are linkul, adică exact problema pe care o rezolvă pasul ăsta. Închisă, uitarea
 *   se vede imediat ca „chatul nu merge"; deschisă, s-ar vedea abia în factură.
 *
 * `NODE_ENV === "production"` acoperă și `next start` local și toate deploy-urile
 * de pe Vercel (inclusiv Preview) — intenționat: orice build de producție e tratat
 * ca putând fi public.
 */
export async function authorizePaidRoute(): Promise<PaidRouteAccess> {
  if (!isAuthConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return {
        allowed: false,
        status: 503,
        message:
          "Autentificarea nu e configurată pe server, așa că întrebările către model sunt oprite (în producție, fără autentificare, ruta rămâne închisă). Vezi docs/nextauth/README.md."
      };
    }
    return { allowed: true, userId: null };
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      allowed: false,
      status: 401,
      message: "Ca să poți întreba, conectează-te — butonul „Conectează-te” e jos, în bara din stânga."
    };
  }

  return { allowed: true, userId };
}
