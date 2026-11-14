import type { UIMessage } from "ai";

import { auth, isAuthConfigured } from "@/lib/auth";
import { isSkillLevel } from "@/lib/types";
import type {
  MessageUsageMetadata,
  PersistenceRefusalReason,
  ProviderId,
  ServerConversation,
  ServerProfile,
  Skill
} from "@/lib/types";
import { PROVIDER_IDS } from "@/lib/providers";

// Legătura cu backend-ul de persistență (repo-ul `skillforge-backend`, Spring Boot +
// MongoDB), partea de SERVER. Importat doar din Route Handlere.
//
// E singurul fișier din aplicație care știe adresa backend-ului și cheia lui.
// Browserul nu vorbește niciodată direct cu el, din același motiv pentru care nu
// vorbește direct cu providerul de LLM: cheia ar ajunge în DevTools, iar backend-ul
// n-ar mai avea cum să știe CINE întreabă. Aici se întâlnesc cele două lucruri pe
// care le poate garanta doar serverul: sesiunea (citită cu `auth()`) și cheia.
//
// Backend-ul crede headerul `X-User-Id` DOAR pentru că cererea poartă și cheia.
// De aceea id-ul vine mereu din sesiune, niciodată din corpul cererii.

const API_URL_ENV_VAR = "SKILLFORGE_API_URL";
const API_KEY_ENV_VAR = "SKILLFORGE_API_KEY";

/**
 * Cât așteptăm backend-ul. Generos, intenționat: pe Cloud Run serviciul scalează
 * la zero, iar prima cerere după o pauză pornește un JVM (cold start de câteva
 * secunde). Un timeout scurt ar transforma fiecare „prima cerere a zilei” în eroare.
 */
const BACKEND_TIMEOUT_MS = 25_000;

/** Limitele de mai jos sunt aceleași cu validarea din backend; depășirea lor ar fi oricum un `400`. */
const MAX_MESSAGES = 500;
const MAX_TEXT_LENGTH = 200_000;
const MAX_TITLE_LENGTH = 200;

/** Id-urile ajung într-un URL către backend, deci nu pot conține decât caractere care nu schimbă calea. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,100}$/;

function readEnv(name: string): string | null {
  // Citit la RULARE, în interiorul funcției — niciodată la nivel de modul, ca
  // `next build` să treacă pe orice calculator fără `.env.local`.
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Există și adresa, și cheia. Fără oricare, persistența pe server e oprită, iar aplicația merge ca înainte. */
export function isBackendConfigured(): boolean {
  return readEnv(API_URL_ENV_VAR) !== null && readEnv(API_KEY_ENV_VAR) !== null;
}

/**
 * Persistența pe server e posibilă: există backend ȘI autentificare (fără sesiune
 * n-avem al cui id să punem pe date).
 *
 * O singură funcție pentru două locuri care TREBUIE să fie de acord: rutele de
 * persistență (`authorizePersistenceRoute`) și `page.tsx`, care trimite verdictul
 * spre browser. Dacă interfața ar crede că există server, dar rutele n-ar avea
 * unde salva, „Ieși din cont” ar goli `localStorage` fără nicio copie de pe care
 * datele să revină.
 */
export function isPersistenceAvailable(): boolean {
  return isBackendConfigured() && isAuthConfigured();
}

export type PersistenceAccess =
  | { allowed: true; userId: string }
  | { allowed: false; status: 401 | 503; message: string; reason: PersistenceRefusalReason };

/**
 * Prima instrucțiune din orice rută de persistență, exact ca `authorizePaidRoute`
 * în ruta de chat.
 *
 * Spre deosebire de chat, aici NU există ramura „deschis în dezvoltare”: fără
 * sesiune nu avem al cui id să scriem pe date, deci nu avem ce salva. Lipsa
 * configurării e o stare tratată (`503` cu motiv), nu o excepție — interfața o
 * citește și rămâne, în liniște, pe `localStorage`.
 */
export async function authorizePersistenceRoute(): Promise<PersistenceAccess> {
  if (!isPersistenceAvailable()) {
    return {
      allowed: false,
      status: 503,
      reason: "backend-unconfigured",
      message: "Salvarea pe server nu e configurată, așa că datele rămân în acest browser. Vezi docs/backend/README.md."
    };
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      allowed: false,
      status: 401,
      reason: "unauthenticated",
      message: "Conectează-te ca să-ți regăsești conversațiile și pe alt dispozitiv."
    };
  }

  return { allowed: true, userId };
}

/** Răspunsul standard pentru un acces refuzat, în aceeași formă `{ error, reason }` ca ruta de chat. */
export function refusalResponse(access: Extract<PersistenceAccess, { allowed: false }>): Response {
  return Response.json({ error: access.message, reason: access.reason }, { status: access.status });
}

export function isSafeId(value: string): boolean {
  return SAFE_ID.test(value);
}

/**
 * O cerere către backend, în numele unui utilizator.
 *
 * Aruncă la eroare de rețea sau la timeout; ruta care o cheamă o prinde și
 * răspunde `502`. Statusurile backend-ului (404, 409…) NU sunt excepții: se
 * întorc ca atare, fiindcă fiecare rută decide ce înseamnă pentru ea.
 */
export async function backendFetch(
  userId: string,
  path: string,
  init: { method?: "GET" | "PUT" | "DELETE"; body?: unknown } = {}
): Promise<Response> {
  const baseUrl = readEnv(API_URL_ENV_VAR);
  const apiKey = readEnv(API_KEY_ENV_VAR);
  if (!baseUrl || !apiKey) {
    throw new Error("Backend-ul nu e configurat.");
  }

  return fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "X-Api-Key": apiKey,
      "X-User-Id": userId,
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    // Datele unui utilizator nu se cachează niciodată între cereri.
    cache: "no-store",
    signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS)
  });
}

/**
 * Răspunsul pentru „backend-ul n-a putut fi contactat”. `502`, nu `500`: serverul
 * nostru e întreg, cel din spatele lui n-a răspuns.
 *
 * În jurnal ajunge doar numele erorii — niciodată URL-ul complet sau corpul
 * cererii, care poartă mesajele utilizatorului.
 */
export function backendUnreachableResponse(error: unknown): Response {
  const name = error instanceof Error ? error.name : "necunoscută";
  console.error(`[backend] Backend-ul de persistență n-a răspuns (eroare: ${name}).`);
  return Response.json(
    { error: "Serverul care păstrează conversațiile nu răspunde acum. Datele rămân în acest browser." },
    { status: 502 }
  );
}

// --- Normalizare: tot ce vine din browser e input neîncredere ----------------
//
// Corpul unei cereri nu trece prin compilatorul nostru, deci tipurile de mai jos
// nu sunt o garanție până nu le verificăm. Regula e aceeași ca la profilul din
// `system-prompt.ts`: câmpuri permise explicit, text tăiat la o lungime, restul
// aruncat. Ce nu e pe listă nu ajunge în baza de date.

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}

/**
 * Metadatele de consum ale unui răspuns, sau `undefined` dacă forma nu e cea
 * așteptată. Jumătăți de metadate nu se păstrează: un preț fără provider ar fi un
 * cost pe care nu-l mai poate explica nimeni.
 *
 * Tokenii lipsă rămân LIPSĂ (`undefined`), nu devin `0` — vezi `TokenUsage`.
 * Funcția e folosită în ambele sensuri: și la scriere, și la citirea din backend,
 * ca un `null` venit din JSON să nu ajungă în formula de cost.
 */
function normalizeMetadata(value: unknown): MessageUsageMetadata | undefined {
  const metadata = asRecord(value);
  const pricing = asRecord(metadata?.pricing);
  const usage = asRecord(metadata?.usage);
  if (!metadata || !pricing) return undefined;

  const inputPerMillionUsd = asFiniteNumber(pricing.inputPerMillionUsd);
  const outputPerMillionUsd = asFiniteNumber(pricing.outputPerMillionUsd);
  const { providerId, modelId, source } = metadata;

  if (
    !isProviderId(providerId) ||
    typeof modelId !== "string" ||
    (source !== "model" && source !== "cache") ||
    inputPerMillionUsd === undefined ||
    outputPerMillionUsd === undefined ||
    typeof pricing.verifiedAt !== "string"
  ) {
    return undefined;
  }

  const inputTokens = asFiniteNumber(usage?.inputTokens);
  const outputTokens = asFiniteNumber(usage?.outputTokens);

  return {
    providerId,
    modelId: modelId.slice(0, 100),
    pricing: { inputPerMillionUsd, outputPerMillionUsd, verifiedAt: pricing.verifiedAt.slice(0, 10) },
    usage: {
      ...(inputTokens === undefined ? {} : { inputTokens }),
      ...(outputTokens === undefined ? {} : { outputTokens })
    },
    source
  };
}

/**
 * Mesajele unei conversații, reduse la ce se arhivează.
 *
 * Se păstrează DOAR părțile de text. Un `UIMessage` poate purta și alte feluri de
 * părți (raționament, apeluri de unelte), cu forme care se schimbă de la o
 * versiune de SDK la alta; backend-ul ține o formă stabilă, pe care o poate
 * valida. Când agentul va primi unelte (F5), lista de aici e locul de extins.
 */
export function normalizeMessages(value: unknown): UIMessage[] {
  if (!Array.isArray(value)) return [];

  const messages: UIMessage[] = [];
  for (const item of value.slice(0, MAX_MESSAGES)) {
    const message = asRecord(item);
    if (!message) continue;

    const { id, role } = message;
    if (typeof id !== "string" || id.length === 0 || id.length > 100) continue;
    if (role !== "user" && role !== "assistant" && role !== "system") continue;

    const parts: UIMessage["parts"] = [];
    if (Array.isArray(message.parts)) {
      for (const partItem of message.parts) {
        const part = asRecord(partItem);
        if (part?.type === "text" && typeof part.text === "string") {
          parts.push({ type: "text", text: part.text.slice(0, MAX_TEXT_LENGTH) });
        }
      }
    }

    const metadata = normalizeMetadata(message.metadata);
    messages.push({ id, role, parts, ...(metadata ? { metadata } : {}) });
  }
  return messages;
}

/** Corpul unei salvări de conversație, sau `null` dacă nu are ce se cere ca să fie salvat. */
export function normalizeConversationSnapshot(
  value: unknown
): { title: string; createdAt?: string; version?: number; messages: UIMessage[] } | null {
  const body = asRecord(value);
  if (!body) return null;

  const title = typeof body.title === "string" ? body.title.trim().slice(0, MAX_TITLE_LENGTH) : "";
  if (!title) return null;

  // Data trebuie să fie una reală: backend-ul ar răspunde `400` la un text oarecare,
  // iar o dată lipsă e în regulă — o pune el.
  const createdAt =
    typeof body.createdAt === "string" && !Number.isNaN(Date.parse(body.createdAt))
      ? new Date(body.createdAt).toISOString()
      : undefined;

  const version =
    Number.isInteger(body.version) && (body.version as number) >= 0 ? (body.version as number) : undefined;

  return {
    title,
    messages: normalizeMessages(body.messages),
    ...(createdAt ? { createdAt } : {}),
    ...(version === undefined ? {} : { version })
  };
}

/** O conversație citită din backend, adusă la forma din store. `null` dacă răspunsul nu arată a conversație. */
export function toServerConversation(value: unknown): ServerConversation | null {
  const conversation = asRecord(value);
  if (!conversation) return null;

  const { id, title, createdAt, version } = conversation;
  if (typeof id !== "string" || typeof title !== "string" || typeof createdAt !== "string") return null;
  if (typeof version !== "number") return null;

  return { id, title, createdAt, version, messages: normalizeMessages(conversation.messages) };
}

/** Profilul, cu aceleași limite ca în `system-prompt.ts` și ca în backend. */
export function normalizeProfile(value: unknown): ServerProfile {
  const profile = asRecord(value);
  const text = (field: unknown, max: number) => (typeof field === "string" ? field.trim().slice(0, max) : "");

  const skills: Skill[] = [];
  if (Array.isArray(profile?.skills)) {
    for (const item of profile.skills.slice(0, 50)) {
      const skill = asRecord(item);
      const name = text(skill?.name, 60);
      const level = text(skill?.level, 20);
      if (name && isSkillLevel(level)) skills.push({ name, level });
    }
  }

  return {
    name: text(profile?.name, 100),
    stack: text(profile?.stack, 500),
    skills,
    goal: text(profile?.goal, 1000)
  };
}
