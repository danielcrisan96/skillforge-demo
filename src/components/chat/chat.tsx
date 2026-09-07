"use client";

import { useState } from "react";

import { ChatInput } from "@/components/chat/chat-input";
import { EmptyState } from "@/components/chat/empty-state";
import { MessageList } from "@/components/chat/message-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/useAppStore";
import { useHydrated } from "@/store/useHydrated";

// Zona centrală. Singurul component care decide CE se vede în mijloc.
//
// De ce decizia stă într-un singur loc: sunt trei situații (se încarcă,
// conversație nouă, conversație existentă) și fiecare are alt aranjament —
// composer centrat pe verticală la conversație nouă, lipit de jos în rest.
// Împrăștiată în mai multe componente, regula asta s-ar contrazice singură.

export function Chat() {
  // Textul în lucru trăiește aici, nu în composer și nu în store.
  //
  // Nu în composer, pentru că sugestiile din ecranul gol trebuie să-l poată
  // completa. Nu în store, pentru că un text netrimis nu e o dată a aplicației:
  // salvat, ar reapărea la următoarea deschidere ca și cum ar fi fost trimis.
  const [draft, setDraft] = useState("");

  const isHydrated = useHydrated();

  const conversations = useAppStore(state => state.conversations);
  const activeConversationId = useAppStore(state => state.activeConversationId);
  const isResponding = useAppStore(state => state.isResponding);
  const sendMessage = useAppStore(state => state.sendMessage);

  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null;

  const handleSubmit = () => {
    sendMessage(draft);
    setDraft("");
  };

  // Cât timp starea salvată nu s-a citit, nu știm dacă utilizatorul are
  // conversații. Afișarea ecranului gol acum ar fi o minciună de o clipă, urmată
  // de un salt — de asta se așteaptă hidratarea.
  if (!isHydrated) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 p-6">
        <MessageList messages={[]} isResponding={false} isLoading />
      </div>
    );
  }

  if (!activeConversation) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
        <div className="flex w-full max-w-2xl flex-col gap-8">
          <EmptyState onSuggestionSelect={setDraft} />
          <ChatInput value={draft} onChange={setDraft} onSubmit={handleSubmit} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
          <MessageList messages={activeConversation.messages} isResponding={isResponding} isLoading={false} />
        </div>
      </ScrollArea>

      {/* Composer-ul stă în afara zonei derulabile, ca să rămână la locul lui
          când conversația e lungă. */}
      <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput value={draft} onChange={setDraft} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
