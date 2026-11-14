import {
  authorizePersistenceRoute,
  backendFetch,
  backendUnreachableResponse,
  refusalResponse,
  toServerConversation
} from "@/lib/backend.server";
import type { ServerConversation } from "@/lib/types";

// Conversațiile utilizatorului conectat, citite din backend-ul de persistență.
//
// Ruta e un intermediar subțire, și asta e intenționat: tot ce face e să pună
// identitatea (din sesiune) și cheia (din mediu) pe o cerere pe care browserul
// n-are voie s-o facă singur. Regulile despre date stau în backend.

export const runtime = "nodejs";

export async function GET() {
  // Sesiunea, înaintea oricărui lucru: ruta e un URL public, iar răspunsul ei
  // sunt conversațiile cuiva.
  const access = await authorizePersistenceRoute();
  if (!access.allowed) return refusalResponse(access);

  try {
    const response = await backendFetch(access.userId, "/conversations");
    if (!response.ok) {
      return Response.json({ error: "Conversațiile n-au putut fi citite de pe server." }, { status: 502 });
    }

    // Răspunsul backend-ului e tot input: îl aducem la forma din store înainte să
    // plece spre browser, ca un câmp neașteptat sau un `null` să se oprească aici.
    const body: unknown = await response.json();
    const conversations: ServerConversation[] = Array.isArray(body)
      ? body.map(toServerConversation).filter(conversation => conversation !== null)
      : [];

    return Response.json({ conversations });
  } catch (error) {
    return backendUnreachableResponse(error);
  }
}
