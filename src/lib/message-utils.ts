import type { UIMessage } from "ai";

import { messageText } from "@/lib/message-text";
import type { Profile } from "@/lib/types";

// Serializarea conversației pentru export — JSON și Markdown.
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
