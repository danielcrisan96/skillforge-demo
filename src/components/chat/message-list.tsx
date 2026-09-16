"use client";

import { useEffect, useMemo, useRef, type ComponentType } from "react";
import { Hourglass, Sparkles, TriangleAlert } from "lucide-react";
import type { UIMessage } from "ai";

import { MessageItem } from "@/components/chat/message-item";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { describeChatError, type ChatErrorKind } from "@/lib/chat-error";
import { messageText } from "@/lib/message-text";
import { conversationUsageDetails } from "@/lib/message-utils";

// Lista de mesaje, plus stările prin care trece până să aibă ce afișa.
//
// Stările astea au fost construite în F1.2, pe date inventate, exact ca acum să
// nu fie nevoie de ele: „scrie…", eroarea și scheletul de încărcare erau deja la
// locul lor când textul a început să curgă cu adevărat.

/**
 * Aspectul unei erori, pe tip — registru, nu `kind === "rate-limit" ? … : …` repetat
 * pe titlu, culoare și iconiță.
 *
 * Limita de cereri NU e roșie și nu spune „nu a putut fi generat": e aplicația
 * care se protejează, nu o defecțiune, iar textul spune de la ce oră se poate
 * trimite din nou.
 */
const ERROR_PRESENTATION: Record<
  ChatErrorKind,
  { title: string; variant: "default" | "destructive"; Icon: ComponentType }
> = {
  "rate-limit": { title: "Pauză scurtă", variant: "default", Icon: Hourglass },
  error: { title: "Răspunsul nu a putut fi generat", variant: "destructive", Icon: TriangleAlert }
};

type MessageListProps = {
  messages: UIMessage[];
  /** Cererea a plecat, dar n-a venit încă niciun cuvânt: se arată „scrie…". */
  isWaiting: boolean;
  /** Starea salvată nu s-a citit încă din `localStorage`. */
  isLoading: boolean;
  /** Eroare reală de la model sau de la rută. */
  error?: Error;
  /** Cererea curentă e „submitted" sau „streaming" — dezactivează reluarea și editarea. */
  isBusy?: boolean;
  /** Reia răspunsul asistentului cu id-ul dat. Absent pe ecranele fără chat activ. */
  onRetry?: (messageId: string) => void;
  /** Editează mesajul utilizatorului cu id-ul dat și retrimite. */
  onEdit?: (messageId: string, text: string) => void;
};

export function MessageList({
  messages,
  isWaiting,
  isLoading,
  error,
  isBusy = false,
  onRetry,
  onEdit
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Derulare la ultimul mesaj.
  //
  // Dependența e LUNGIMEA TEXTULUI ultimului mesaj, nu numărul de mesaje. În
  // streaming numărul nu se schimbă — un singur mesaj al asistentului crește
  // literă cu literă — deci un efect legat de `messages.length` ar derula o
  // dată, la început, iar restul răspunsului ar curge sub marginea de jos.
  const lastMessageLength = messages.length > 0 ? messageText(messages[messages.length - 1]).length : 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, lastMessageLength, isWaiting]);

  // Consumul fiecărui mesaj, calculat O dată pe listă, nu în fiecare `MessageItem`:
  // partea „retrimisă" a unui răspuns depinde de răspunsul DINAINTEA lui, deci un
  // mesaj singur n-are de unde s-o afle. `useMemo` pe `messages`: în streaming
  // lista se schimbă la fiecare token, dar o trecere peste câteva zeci de mesaje e
  // neglijabilă — memo-ul evită doar recalculul la randări fără mesaje noi.
  const usageDetails = useMemo(() => conversationUsageDetails(messages), [messages]);

  if (isLoading) {
    // Schelet cu forma reală a conținutului, nu un cerc care se învârte: așa
    // saltul de la starea de încărcare la conținut e mai mic, iar pagina nu
    // pare că sare.
    return (
      <div className="flex flex-col gap-6">
        {[0, 1, 2].map(row => (
          <div key={row} className="flex items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-16 w-full max-w-lg rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {messages.map((message, index) => (
        // `key` = id-ul mesajului, NICIODATĂ indexul din listă.
        //
        // Cu indexul, la regenerarea unui răspuns poziția rămâne aceeași, deci
        // React crede că e același element și refolosește nodul vechi — pe ecran
        // rămâne textul anterior, sau se amestecă cele două.
        <MessageItem
          key={message.id}
          message={message}
          isBusy={isBusy}
          onRetry={onRetry}
          onEdit={onEdit}
          // Câte mesaje s-ar pierde reluând ACEST răspuns: tot ce vine după
          // el. Pe ultimul e 0 — reluarea înlocuiește doar răspunsul curent,
          // fără confirmare. Pe unul mai vechi, reluarea taie și tot ce a
          // urmat, deci MessageItem cere confirmare.
          discardCount={messages.length - 1 - index}
          usage={usageDetails[index]}
        />
      ))}

      {isWaiting && (
        <div className="flex items-start gap-3">
          <Avatar className="mt-0.5 size-8 shrink-0">
            <AvatarFallback>
              <Sparkles className="size-4" />
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-4">
            {/* Trei puncte care sar decalat. Animația e din Tailwind, cu
                întârzieri diferite — semnalează „se lucrează" fără să pretindă
                că știe cât mai durează, cum ar face o bară de progres. */}
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
            <span className="sr-only">SkillForge scrie un răspuns</span>
          </div>
        </div>
      )}

      {error && <ChatErrorAlert error={error} />}

      {/* Ancoră goală pentru derulare. Un element dedicat e mai sigur decât
          calculul înălțimii containerului, care se schimbă la fiecare mesaj. */}
      <div ref={bottomRef} />
    </div>
  );
}

function ChatErrorAlert({ error }: { error: Error }) {
  // Componenta de alertă exista deja în aplicație, din F1.2. Textul vine de la
  // `onError` din rută — tradus acolo în ceva citibil, ca aici să nu ajungă
  // mesajul brut al SDK-ului. `describeChatError` se ocupă de cazul în care
  // eroarea a venit ca răspuns HTTP (400, 429), nu prin stream.
  const { kind, message } = describeChatError(error);
  const { title, variant, Icon } = ERROR_PRESENTATION[kind];

  return (
    <Alert variant={variant}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
