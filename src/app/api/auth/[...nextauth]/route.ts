import type { NextRequest } from "next/server";

import { handlers, isAuthConfigured } from "@/lib/auth";

// Ruta „catch-all" a autentificării: `[...nextauth]` prinde ORICE cale de sub
// `/api/auth/` — `/signin/github`, `/callback/github`, `/session`, `/signout`,
// `/csrf`. E fluxul de redirectări al OAuth-ului, pe care îl conduce librăria;
// noi nu scriem câte o rută pentru fiecare pas.
//
// Diferență față de Pages Router (și de exemplele cu `pages/api/auth/[...nextauth].ts`):
// aici se exportă funcții numite după metoda HTTP (`GET`, `POST`), nu un `default`.
//
// Dacă librăria ar fi fost suficientă, fișierul ar avea o linie:
// `export const { GET, POST } = handlers`. Nu e, din două motive, ambele mai jos.

export const runtime = "nodejs";

type AuthRouteContext = { params: Promise<{ nextauth: string[] }> };

export async function GET(request: NextRequest, context: AuthRouteContext) {
  // Fără configurare, nu există flux de autentificare de condus. Fără verificarea
  // asta, librăria ar arunca `MissingSecret` cu stack în terminal la orice cerere —
  // inclusiv la `/api/auth/session`, pe care nimeni n-o cheamă conștient.
  // Redirecționăm în aplicație cu un cod pe care `auth-errors.ts` îl știe.
  if (!isAuthConfigured()) return redirectToApp(request, "NotConfigured");

  const { nextauth } = await context.params;
  const [action, providerId] = nextauth;

  // ⚠️ ANULAREA LA FURNIZOR, tratată ÎNAINTE de a preda cererea librăriei.
  //
  // Când omul apasă „Cancel" pe pagina GitHub, furnizorul nu trimite niciun cod de
  // autorizare: trimite `?error=access_denied` pe URL-ul de callback. Rezultatul e
  // deci deja cunoscut — nu mai e nimic de schimbat cu furnizorul.
  //
  // Lăsată librăriei, situația se strică de două ori (verificat la rulare, chemând
  // `Auth` din `@auth/core` direct, cu `?error=access_denied`):
  // 1. librăria aruncă `OAuthCallbackError` din interiorul ei și o scrie în terminal
  //    cu stack, pentru ceva ce nu e o defecțiune;
  // 2. redirecționează la `/?error=OAuthCallbackError` — MOTIVUL s-a pierdut pe drum.
  //    „Am anulat eu" și „furnizorul a căzut" ajung la același cod generic și nu se
  //    mai pot deosebi în interfață.
  //
  // Nu se poate repara nici dintr-un `logger` configurat în librărie: acolo a ajuns
  // doar `{ name: "OAuthCallbackError", message: "OAuth Provider returned an error…" }`,
  // fără `access_denied` nicăieri. Deci se citește aici, din URL, cât încă există.
  const providerError = request.nextUrl.searchParams.get("error");
  if (action === "callback" && providerError) {
    const code = sanitizeErrorCode(providerError);

    // O SINGURĂ linie, fără stack: anularea e o acțiune normală. Zgomotul din
    // terminal se păstrează pentru erorile care chiar cer atenție. Nu se loghează
    // `error_description` sau alt text venit din URL — e scris de altcineva.
    console.info(`[auth] Autentificare oprită la furnizor (${sanitizeErrorCode(providerId ?? "necunoscut")}): ${code}`);

    return redirectToApp(request, code);
  }

  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  // POST-urile vin din `signIn`/`signOut` din client. Fără configurare nu au ce
  // face — dar răspunsul e JSON, nu redirectare, fiindcă cine le cheamă e cod.
  if (!isAuthConfigured()) {
    return Response.json({ error: "Autentificarea nu e configurată pe server." }, { status: 404 });
  }
  return handlers.POST(request);
}

/**
 * Codul de eroare, redus la o formă sigură de pus într-un URL și într-un log.
 *
 * E text venit din afară: oricine poate chema callback-ul cu `?error=` ales de el.
 * Codurile reale OAuth sunt scurte, din litere și `_` (`access_denied`); orice altceva
 * devine „unknown", pe care interfața îl afișează cu mesajul generic.
 */
function sanitizeErrorCode(raw: string): string {
  return /^[A-Za-z0-9_.-]{1,64}$/.test(raw) ? raw : "unknown";
}

/**
 * Înapoi pe „/", cu motivul ÎNTREG în URL (`?error=access_denied`, nu un cod generic).
 *
 * `303`: după o redirectare, browserul face GET pe adresa nouă, indiferent de
 * metoda cererii inițiale.
 */
function redirectToApp(request: NextRequest, code: string): Response {
  const url = new URL("/", request.nextUrl.origin);
  url.searchParams.set("error", code);
  return Response.redirect(url, 303);
}
