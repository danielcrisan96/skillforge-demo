import { PROVIDERS, PROVIDER_IDS } from "@/lib/providers";
import { isProviderConfigured } from "@/lib/providers.server";
import type { ProviderAvailability } from "@/lib/types";

// „Ce provideri sunt configurați?" — întrebare la care doar serverul are răspunsul.
//
// Ruta asta există dintr-un motiv care e ușor de ratat: composer-ul trebuie să
// arate o opțiune DEZACTIVATĂ, CU MOTIV, pentru un provider fără cheie. Ca s-o
// poată face, are nevoie de o informație care depinde de `process.env` — iar
// `process.env` nu există în browser (și nici n-ar trebui). Tentația e să pui un
// `NEXT_PUBLIC_OPENAI_CONFIGURED=true`; e greșit de două ori: ar fi o a doua
// sursă de adevăr, de ținut în sinc cu cheia reală, și ar normaliza obiceiul de
// a pune lucruri despre chei în variabile publice.
//
// Aici se trimite DOAR verdictul, plus un motiv gata de afișat. Niciodată
// valoarea cheii, nici măcar trunchiată: „ultimele 4 caractere" e tot cheie, iar
// o cheie parțială e un cadou pentru cine încearcă să o ghicească.
//
// Nu e cachată: în Next 16 Route Handlerele nu se cachează implicit (cache-ul se
// cere explicit cu `force-static`). Bine că e așa — cachată, o cheie adăugată în
// `.env.local` după pornire ar rămâne „neconfigurată" până la un rebuild, iar
// omul ar căuta bug-ul în cod.

export const runtime = "nodejs";

export async function GET() {
  const providers: ProviderAvailability[] = PROVIDER_IDS.map(id => {
    const configured = isProviderConfigured(id);

    return {
      id,
      configured,
      // Motivul e scris pe SERVER, nu compus în interfață dintr-un cod de
      // eroare. Așa textul e într-un singur loc, spune numele exact al
      // variabilei care lipsește și trimite la documentul care explică de unde
      // se ia cheia — adică e o instrucțiune, nu un reproș.
      unavailableReason: configured
        ? null
        : `Lipsește ${PROVIDERS[id].apiKeyEnvVar} pe server. Vezi docs/${id}/README.md.`
    };
  });

  return Response.json({ providers });
}
