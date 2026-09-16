import type { UIMessage } from "ai";

import { messageCost, tokensCostUsd } from "@/lib/cost";
import { messageText } from "@/lib/message-text";
import { PROVIDERS } from "@/lib/providers";
import type { MessageUsageMetadata, Profile } from "@/lib/types";

// Transformări pure peste lista de mesaje: exportul (JSON și Markdown) și, de la
// F4.2, sumarul de consum și cost al conversației.
//
// De ce funcțiile de aici sunt PURE (primesc mesaje + profil, întorc un
// string, fără `document`, fără store): ca să poată fi verificate ca orice
// funcție, cu un array de mesaje scris de mână, fără să pornească un browser.
// Partea care ATINGE browserul (Blob, descărcarea) stă în altă parte —
// `src/lib/download-file.ts` — tocmai ca granița asta să rămână vizibilă.

/**
 * Structura intermediară din care pornesc AMBELE serializări.
 *
 * E singurul loc care decide CE intră în export. Dacă am scrie JSON și
 * Markdown fiecare direct din `UIMessage[]` și `Profile`, cele două formate
 * s-ar despărți la prima modificare — cineva adaugă un câmp într-unul și uită
 * de celălalt. Aici se adaugă o singură dată, pentru amândouă.
 */
export type ConversationExport = {
  exportedAt: string;
  conversationTitle: string;
  profile: {
    name: string;
    stack: string;
    goal: string;
    skills: { name: string; level: string }[];
  };
  messages: {
    id: string;
    role: UIMessage["role"];
    text: string;
  }[];
};

/**
 * Construiește structura intermediară din mesajele conversației deschise și
 * profilul curent.
 *
 * Textul fiecărui mesaj vine din `messageText` — SINGURUL loc din aplicație
 * care știe să-l compună din `parts`. Repetat aici ar fi însemnat o a doua
 * definiție a „ce e textul unui mesaj", care ar putea ajunge să difere de cea
 * folosită la afișare.
 */
export function buildConversationExport(
  messages: UIMessage[],
  profile: Profile,
  conversationTitle: string
): ConversationExport {
  return {
    exportedAt: new Date().toISOString(),
    conversationTitle,
    profile: {
      name: profile.name,
      stack: profile.stack,
      goal: profile.goal,
      skills: profile.skills.map(skill => ({ name: skill.name, level: skill.level }))
    },
    messages: messages.map(message => ({
      id: message.id,
      role: message.role,
      text: messageText(message)
    }))
  };
}

/** Export ca JSON — pentru cine vrea să proceseze conversația mai departe. */
export function conversationExportToJson(data: ConversationExport): string {
  return JSON.stringify(data, null, 2);
}

const ROLE_LABEL: Partial<Record<UIMessage["role"], string>> = {
  user: "Tu",
  assistant: "SkillForge"
};

/** Export ca Markdown — pentru cine vrea să-l pună direct în notițe. */
export function conversationExportToMarkdown(data: ConversationExport): string {
  const lines: string[] = [
    `# ${data.conversationTitle}`,
    "",
    `_Exportat la ${data.exportedAt}_`,
    "",
    "## Profil",
    "",
    `- **Nume:** ${data.profile.name || "—"}`,
    `- **Stack:** ${data.profile.stack || "—"}`,
    `- **Obiectiv:** ${data.profile.goal || "—"}`,
    `- **Skill-uri:** ${
      data.profile.skills.length > 0
        ? data.profile.skills.map(skill => `${skill.name} (${skill.level})`).join(", ")
        : "—"
    }`,
    "",
    "## Conversație",
    ""
  ];

  for (const message of data.messages) {
    lines.push(`### ${ROLE_LABEL[message.role] ?? message.role}`, "", message.text, "");
  }

  return lines.join("\n");
}

/**
 * Numele fișierului exportat, pe baza datei — NICIODATĂ pe baza titlului
 * conversației. Titlul e text liber al utilizatorului: poate avea diacritice,
 * spații, caractere pe care unele sisteme de fișiere nu le acceptă în nume.
 * Data ISO e mereu un nume valid, oriunde s-ar deschide fișierul.
 */
export function exportFileName(extension: "json" | "md"): string {
  const isoDate = new Date().toISOString().slice(0, 10);
  return `skillforge-${isoDate}.${extension}`;
}

// --- Consum și cost (F4.2) ---------------------------------------------------
//
// Aici se ADUNĂ, nu se calculează: fiecare cifră de bani vine din `messageCost` /
// `tokensCostUsd` din `src/lib/cost.ts`. Afișarea per mesaj și totalul pe
// conversație trec prin exact aceleași funcții, deci nu se pot despărți.

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Metadatele de consum ale unui mesaj, validate — sau `null` dacă mesajul nu le are.
 *
 * `metadata` e `unknown` și trebuie tratat ca atare: vine din `localStorage`,
 * unde pot sta mesaje dinainte de F4.2 (fără metadate deloc) sau o formă
 * modificată de mână. O verificare aici înseamnă că restul aplicației lucrează
 * cu o formă sigură; fără ea, prima valoare ciudată ar ajunge ca `NaN` pe ecran.
 *
 * Un mesaj fără metadate e „nemăsurat", nu „gratuit" — interfața nu-i afișează
 * niciun cost, iar totalul îl numără separat.
 */
export function messageUsage(message: UIMessage): MessageUsageMetadata | null {
  if (message.role !== "assistant") return null;
  const raw = message.metadata;
  if (typeof raw !== "object" || raw === null) return null;

  const { providerId, modelId, pricing, usage, source } = raw as Record<string, unknown>;
  if (typeof providerId !== "string" || !(providerId in PROVIDERS)) return null;
  if (typeof modelId !== "string") return null;
  if (source !== "model" && source !== "cache") return null;
  if (typeof pricing !== "object" || pricing === null) return null;
  if (typeof usage !== "object" || usage === null) return null;

  const { inputPerMillionUsd, outputPerMillionUsd, verifiedAt } = pricing as Record<string, unknown>;
  if (!isNonNegativeNumber(inputPerMillionUsd) || !isNonNegativeNumber(outputPerMillionUsd)) return null;

  const { inputTokens, outputTokens } = usage as Record<string, unknown>;

  return {
    providerId: providerId as MessageUsageMetadata["providerId"],
    modelId,
    pricing: {
      inputPerMillionUsd,
      outputPerMillionUsd,
      verifiedAt: typeof verifiedAt === "string" ? verifiedAt : "—"
    },
    // O valoare lipsă sau invalidă devine `undefined` („necunoscut"), nu 0.
    usage: {
      inputTokens: isNonNegativeNumber(inputTokens) ? inputTokens : undefined,
      outputTokens: isNonNegativeNumber(outputTokens) ? outputTokens : undefined
    },
    source
  };
}

export type MessageUsageDetails = {
  metadata: MessageUsageMetadata;
  /**
   * Câți din tokenii de intrare ai acestui răspuns erau context RETRIMIS — system
   * prompt-ul plus tot istoricul de dinainte de întrebarea curentă.
   *
   * Nu se estimează: se DEDUCE din cifrele raportate de provider. API-ul e fără
   * stare, deci intrarea răspunsului anterior (system prompt + istoricul de atunci)
   * plus ieșirea lui (răspunsul) sunt exact ce se retrimite acum, înaintea
   * întrebării noi. Restul intrării e partea nouă.
   *
   * `undefined` când deducția nu e sigură: răspunsul anterior e nemăsurat, are
   * tokeni lipsă sau a fost generat de alt model — alt tokenizer numără același
   * text altfel, iar scăderea ar da o cifră fără sens. La primul răspuns din
   * conversație e 0: nu există istoric (system prompt-ul e atunci „nou").
   */
  resentInputTokens: number | undefined;
};

/**
 * Detaliile de consum pentru fiecare mesaj, aliniate cu lista (`null` unde nu
 * există — mesajele utilizatorului, răspunsurile nemăsurate).
 *
 * O singură trecere peste listă, ca să nu caute înapoi „răspunsul anterior"
 * pentru fiecare mesaj în parte.
 */
export function conversationUsageDetails(messages: UIMessage[]): (MessageUsageDetails | null)[] {
  let previous: { metadata: MessageUsageMetadata | null } | null = null;

  return messages.map(message => {
    if (message.role !== "assistant") return null;

    const metadata = messageUsage(message);
    const resentInputTokens = metadata ? resentTokens(metadata, previous) : undefined;
    previous = { metadata };

    return metadata ? { metadata, resentInputTokens } : null;
  });
}

function resentTokens(
  current: MessageUsageMetadata,
  previous: { metadata: MessageUsageMetadata | null } | null
): number | undefined {
  if (previous === null) return 0;

  const prev = previous.metadata;
  if (!prev || prev.providerId !== current.providerId || prev.modelId !== current.modelId) return undefined;
  if (prev.usage.inputTokens === undefined || prev.usage.outputTokens === undefined) return undefined;
  if (current.usage.inputTokens === undefined) return undefined;

  // Plafonat la intrarea curentă: providerul adaugă câțiva tokeni de formatare pe
  // mesaj, iar după o editare istoricul poate fi mai scurt decât data trecută.
  // Un „retrimis" mai mare decât toată intrarea n-ar avea sens pe ecran.
  return Math.min(prev.usage.inputTokens + prev.usage.outputTokens, current.usage.inputTokens);
}

export type ConversationCostSummary = {
  /** Suma costurilor CUNOSCUTE. */
  totalUsd: number;
  /** Din `totalUsd`, cât s-a plătit pe context retrimis (system prompt + istoric). */
  resentUsd: number;
  /**
   * `false` dacă, pentru măcar un răspuns plătit, partea retrimisă nu s-a putut
   * deduce (vezi `resentInputTokens`). Atunci `resentUsd` e un minim — iar un
   * procent afișat fără nota asta ar subestima exact lucrul pe care vrem să-l vedem.
   */
  resentComplete: boolean;
  /** Răspunsuri cu cost cunoscut, venite de la model. */
  paidCount: number;
  /** Răspunsuri redate din cache — gratuite. */
  cachedCount: number;
  /**
   * Răspunsuri fără cost cunoscut: dinainte de F4.2, cu tokeni lipsă de la
   * provider, sau oprite înainte de final. Dacă e > 0, `totalUsd` e un minim, nu
   * un total — și interfața trebuie să spună asta.
   */
  unknownCount: number;
};

export function conversationCostSummary(messages: UIMessage[]): ConversationCostSummary {
  const summary: ConversationCostSummary = {
    totalUsd: 0,
    resentUsd: 0,
    resentComplete: true,
    paidCount: 0,
    cachedCount: 0,
    unknownCount: 0
  };

  conversationUsageDetails(messages).forEach((details, index) => {
    if (messages[index].role !== "assistant") return;
    if (!details) {
      summary.unknownCount += 1;
      return;
    }

    const { metadata, resentInputTokens } = details;
    if (metadata.source === "cache") {
      summary.cachedCount += 1;
      return;
    }

    const cost = messageCost(metadata);
    if (cost.totalUsd === undefined) {
      summary.unknownCount += 1;
      return;
    }

    summary.paidCount += 1;
    summary.totalUsd += cost.totalUsd;
    const resentUsd = tokensCostUsd(resentInputTokens, metadata.pricing.inputPerMillionUsd);
    if (resentUsd === undefined) summary.resentComplete = false;
    else summary.resentUsd += resentUsd;
  });

  return summary;
}
