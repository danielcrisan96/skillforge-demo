import {
  authorizePersistenceRoute,
  backendFetch,
  backendUnreachableResponse,
  normalizeProfile,
  refusalResponse
} from "@/lib/backend.server";

// Profilul utilizatorului conectat, în backend-ul de persistență.
//
// Atenție la ce NU trece pe aici: emailul, numele și poza contului. Acelea sunt
// datele furnizorului de autentificare, nu ale profilului, și nu se salvează
// nicăieri (vezi AGENTS.md, „Authentication”). Profilul e doar ce a scris omul
// în formular.

export const runtime = "nodejs";

export async function GET() {
  const access = await authorizePersistenceRoute();
  if (!access.allowed) return refusalResponse(access);

  try {
    const response = await backendFetch(access.userId, "/users/me/profile");

    // 404 nu e o eroare: utilizatorul n-a salvat încă niciun profil. `null` spune
    // interfeței să-l păstreze pe cel din browser.
    if (response.status === 404) return Response.json({ profile: null });
    if (!response.ok) {
      return Response.json({ error: "Profilul n-a putut fi citit de pe server." }, { status: 502 });
    }

    return Response.json({ profile: normalizeProfile(await response.json()) });
  } catch (error) {
    return backendUnreachableResponse(error);
  }
}

export async function PUT(request: Request) {
  const access = await authorizePersistenceRoute();
  if (!access.allowed) return refusalResponse(access);

  // Normalizat ÎNAINTE să plece mai departe: profilul ajunge și în system prompt,
  // deci e textul în care cineva ar încerca o injecție de prompt.
  const profile = normalizeProfile(await request.json().catch(() => null));

  try {
    const response = await backendFetch(access.userId, "/users/me/profile", { method: "PUT", body: profile });
    if (!response.ok) {
      return Response.json({ error: "Profilul n-a putut fi salvat pe server." }, { status: 502 });
    }
    return Response.json({ profile });
  } catch (error) {
    return backendUnreachableResponse(error);
  }
}
