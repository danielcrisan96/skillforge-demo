import {
  authorizePersistenceRoute,
  backendFetch,
  backendUnreachableResponse,
  isSafeId,
  normalizeConversationSnapshot,
  refusalResponse
} from "@/lib/backend.server";

// Salvarea și ștergerea unei conversații, în backend-ul de persistență.

export const runtime = "nodejs";

// În Next 16 `params` e un Promise: se așteaptă, nu se citește direct.
type RouteParams = { params: Promise<{ id: string }> };

const INVALID_ID = { error: "Id de conversație invalid." };

/**
 * Salvează instantaneul unei conversații. `PUT`, nu `POST`: id-ul e ales de
 * client, iar aceeași cerere trimisă de două ori lasă serverul în aceeași stare.
 *
 * Răspunde cu `version`, pe care clientul o trimite la următoarea salvare. Un
 * `409` înseamnă că altă fereastră a salvat între timp — vezi `server-sync.ts`
 * pentru ce face interfața cu el.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const access = await authorizePersistenceRoute();
  if (!access.allowed) return refusalResponse(access);

  const { id } = await params;
  if (!isSafeId(id)) return Response.json(INVALID_ID, { status: 400 });

  const snapshot = normalizeConversationSnapshot(await request.json().catch(() => null));
  if (!snapshot) {
    return Response.json({ error: "Conversația trimisă nu are titlu." }, { status: 400 });
  }

  try {
    const response = await backendFetch(access.userId, `/conversations/${id}`, { method: "PUT", body: snapshot });

    if (response.status === 409) {
      return Response.json(
        { error: "Conversația a fost schimbată între timp din altă fereastră.", reason: "conflict" },
        { status: 409 }
      );
    }
    if (!response.ok) {
      // 400 (validare) sau 404 (id-ul e al altcuiva): pentru interfață e același lucru,
      // „nu s-a salvat”. Detaliul rămâne în răspunsul backend-ului, nu pleacă spre browser.
      return Response.json({ error: "Conversația n-a putut fi salvată pe server." }, { status: 502 });
    }

    const saved = (await response.json()) as { version?: unknown };
    if (typeof saved.version !== "number") {
      return Response.json({ error: "Răspuns neașteptat de la server." }, { status: 502 });
    }
    return Response.json({ version: saved.version });
  } catch (error) {
    return backendUnreachableResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const access = await authorizePersistenceRoute();
  if (!access.allowed) return refusalResponse(access);

  const { id } = await params;
  if (!isSafeId(id)) return Response.json(INVALID_ID, { status: 400 });

  try {
    const response = await backendFetch(access.userId, `/conversations/${id}`, { method: "DELETE" });

    // 404 e tot succes aici: conversația nu mai există pe server, adică exact ce s-a cerut.
    if (response.ok || response.status === 404) {
      return new Response(null, { status: 204 });
    }
    return Response.json({ error: "Conversația n-a putut fi ștearsă de pe server." }, { status: 502 });
  } catch (error) {
    return backendUnreachableResponse(error);
  }
}
