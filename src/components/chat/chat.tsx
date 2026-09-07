"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import { ChatInput } from "@/components/chat/chat-input";
import { EmptyState } from "@/components/chat/empty-state";
import { MessageList } from "@/components/chat/message-list";
import { MOCK_MESSAGES } from "@/lib/mock/conversations";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/useAppStore";
import { useHydrated } from "@/store/useHydrated";

// Zona centrală, și singurul „use client" al conversației.
//
// De ce contează că e unul singur: tot ce e sub el devine cod de client. Ruta
// `/api/chat`, cheia și apelul către model rămân de partea cealaltă a graniței —
// browserul vede doar niște fetch-uri către propriul server.
//
// Aici stă și răspunsul la „cine deține mesajele": `useChat`. Store-ul ține doar
// lista de conversații. Vezi D-19 din requirements pentru de ce alegerea asta e
// scrisă undeva, nu doar făcută.

export function Chat() {
  const isHydrated = useHydrated();

  const activeConversationId = useAppStore(state => state.activeConversationId);
  const draftConversationId = useAppStore(state => state.draftConversationId);

  // Cât timp starea salvată nu s-a citit, nu știm dacă utilizatorul are
  // conversații. Afișarea ecranului gol acum ar fi o minciună de o clipă, urmată
  // de un salt — de asta se așteaptă hidratarea.
  if (!isHydrated) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 p-6">
        <MessageList messages={[]} isWaiting={false} isLoading />
      </div>
    );
  }

  // `key` remontează conversația, deci `useChat` pornește curat.
  //
  // Fără el, ai deschide altă conversație și ai găsi acolo mesajele celei
  // precedente: hook-ul își ține starea cât trăiește componenta, iar schimbarea
  // unui id în props nu golește nimic.
  const conversationId = activeConversationId ?? draftConversationId;

  return <Conversation key={conversationId} conversationId={conversationId} />;
}

function Conversation({ conversationId }: { conversationId: string }) {
  // Textul în lucru: input CONTROLAT, adică sursa adevărului e state-ul, nu ce
  // se vede în DOM. Citit din DOM (`event.target.form`, `ref.value`), ar merge —
  // până în clipa în care altcineva vrea să-l scrie, cum fac sugestiile din
  // ecranul gol.
  const [draft, setDraft] = useState("");

  const materializeConversation = useAppStore(state => state.materializeConversation);
  const isNewConversation = useAppStore(state => state.activeConversationId === null);

  const { messages, sendMessage, status, error, stop } = useChat({
    // Transportul, spus explicit.
    //
    // `/api/chat` e chiar valoarea implicită, deci linia asta n-ar fi strict
    // necesară. E scrisă pentru că ruta e contractul dintre client și server: la
    // mutarea ei, vrem să existe un loc unde compilatorul și cititorul o găsesc,
    // nu o convenție tăcută.
    transport: new DefaultChatTransport({ api: "/api/chat" }),

    // Mesajele de pornire. Conversațiile inventate au un seed (ca aplicația să
    // nu arate trei conversații goale la prima deschidere); cele create de
    // utilizator pornesc de la zero.
    messages: MOCK_MESSAGES[conversationId] ?? []
  });

  // Stările se DERIVĂ din `status`, nu se țin în paralel.
  //
  // `status` are patru valori: „submitted" (cererea a plecat, încă n-a venit
  // nimic), „streaming" (curge), „ready" (gata) și „error". Ținute și noi într-un
  // `useState` al nostru, s-ar desincroniza la prima eroare pe care hook-ul o
  // vede și noi nu — și am avea un buton „Stop" care nu mai oprește nimic.
  const isBusy = status === "submitted" || status === "streaming";

  // „scrie…" se arată doar cât nu a apărut încă niciun cuvânt. Din clipa în care
  // textul curge, textul însuși e indicatorul; ținute amândouă, ar sări unul sub
  // celălalt.
  const isWaiting = status === "submitted";

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text || isBusy) return;

    // Primul mesaj dintr-o conversație nouă o materializează în sidebar. Se
    // întâmplă ÎNAINTE de trimitere, dar folosește id-ul pregătit din store, deci
    // nu schimbă `key`-ul și nu întrerupe cererea care pleacă imediat după.
    if (isNewConversation) materializeConversation(text);

    // `sendMessage({ text })` — SDK-ul construiește el mesajul în formatul de UI
    // (id, rol, `parts`) și pornește cererea.
    void sendMessage({ text });
    setDraft("");
  };

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
        <div className="flex w-full max-w-2xl flex-col gap-8">
          <EmptyState onSuggestionSelect={setDraft} />
          <ChatInput value={draft} onChange={setDraft} onSubmit={handleSubmit} isBusy={isBusy} onStop={stop} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
          <MessageList messages={messages} isWaiting={isWaiting} isLoading={false} error={error} />
        </div>
      </ScrollArea>

      {/* Composer-ul stă în afara zonei derulabile, ca să rămână la locul lui
          când conversația e lungă. */}
      <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput value={draft} onChange={setDraft} onSubmit={handleSubmit} isBusy={isBusy} onStop={stop} />
        </div>
      </div>
    </div>
  );
}
