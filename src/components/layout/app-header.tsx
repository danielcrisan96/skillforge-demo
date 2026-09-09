"use client";

import { Download, FileJson, FileText } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getActiveMessages } from "@/lib/active-conversation-bridge";
import { downloadTextFile } from "@/lib/download-file";
import {
  buildConversationExport,
  conversationExportToJson,
  conversationExportToMarkdown,
  exportFileName
} from "@/lib/message-utils";
import { NEW_CONVERSATION_TITLE } from "@/lib/mock/conversations";
import { useAppStore } from "@/store/useAppStore";

// Bara de sus, redusă la strictul necesar.
//
// De ce e aproape goală: singurul lucru pentru care există obligatoriu e
// `SidebarTrigger` — pe mobil sidebar-ul e ascuns într-un `Sheet`, deci fără
// butonul ăsta nu s-ar putea ajunge la lista de conversații. Exportul e a doua
// excepție asumată: e o acțiune globală pe conversația deschisă, nu ceva legat
// de un mesaj anume, deci nu are ce căuta lângă mesaje — și „fără bară de
// acțiuni deasupra conversației” e o cerință de produs, nu doar o preferință.
//
// De ce NU are buton de temă, deși e locul unde ar sta „firesc": tema e o
// preferință, nu o acțiune repetată. Ținută doar în preferințe, bara de sus
// rămâne liniștită, iar atenția stă pe conversație. Fiecare buton adăugat aici
// ar concura cu textul de dedesubt.

type ExportFormat = "json" | "md";

export function AppHeader() {
  const conversations = useAppStore(state => state.conversations);
  const activeConversationId = useAppStore(state => state.activeConversationId);
  const profile = useAppStore(state => state.profile);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleExport = (format: ExportFormat) => {
    // Mesajele NU stau în store (D-19) — `getActiveMessages` citește
    // instantaneul publicat de `chat.tsx` prin puntea din
    // `active-conversation-bridge.ts`, singurul mod în care header-ul, un
    // component FRATE cu `Chat`, ajunge la ele.
    const messages = getActiveMessages();
    if (messages.length === 0) {
      toast.error("Nimic de exportat", { description: "Conversația curentă nu are niciun mesaj." });
      return;
    }

    const data = buildConversationExport(messages, profile, activeConversation?.title ?? NEW_CONVERSATION_TITLE);
    const content = format === "json" ? conversationExportToJson(data) : conversationExportToMarkdown(data);
    const mimeType = format === "json" ? "application/json" : "text/markdown";
    const filename = exportFileName(format);

    downloadTextFile(filename, content, mimeType);
    toast.success("Export pornit", { description: filename });
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />

      {/* Titlul apare doar într-o conversație existentă. Pe ecranul de
          conversație nouă ar dubla numele aplicației, care e oricum afișat mare
          în mijloc. */}
      {activeConversation && <span className="truncate text-sm font-medium">{activeConversation.title}</span>}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="ml-auto" aria-label="Exportă conversația">
            <Download />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport("json")}>
            <FileJson />
            Exportă ca JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("md")}>
            <FileText />
            Exportă ca Markdown
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
