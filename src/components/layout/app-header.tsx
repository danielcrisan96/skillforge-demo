"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAppStore } from "@/store/useAppStore";

// Bara de sus, redusă la strictul necesar.
//
// De ce e aproape goală: singurul lucru pentru care există obligatoriu e
// `SidebarTrigger` — pe mobil sidebar-ul e ascuns într-un `Sheet`, deci fără
// butonul ăsta nu s-ar putea ajunge la lista de conversații.
//
// De ce NU are buton de temă, deși e locul unde ar sta „firesc": tema e o
// preferință, nu o acțiune repetată. Ținută doar în preferințe, bara de sus
// rămâne liniștită, iar atenția stă pe conversație. Fiecare buton adăugat aici
// ar concura cu textul de dedesubt.

export function AppHeader() {
  const conversations = useAppStore(state => state.conversations);
  const activeConversationId = useAppStore(state => state.activeConversationId);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />

      {/* Titlul apare doar într-o conversație existentă. Pe ecranul de
          conversație nouă ar dubla numele aplicației, care e oricum afișat mare
          în mijloc. */}
      {activeConversation && <span className="truncate text-sm font-medium">{activeConversation.title}</span>}
    </header>
  );
}
