"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

import { MessageItem } from "@/components/chat/message-item";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Message } from "@/lib/types";

// Lista de mesaje, plus stările prin care trece până să aibă ce afișa.
//
// De ce stările astea se fac ACUM, pe date inventate: încărcarea și „scrie…"
// sunt exact momentele care apar la integrarea reală, când răspunsul întârzie
// secunde bune. Construite atunci, s-ar face în grabă, peste un cod care nu le
// prevedea. Construite acum, sunt deja la locul lor când textul începe să curgă.

type MessageListProps = {
  messages: Message[];
  /** Un răspuns e în curs: se afișează indicatorul „scrie…" sub ultimul mesaj. */
  isResponding: boolean;
  /** Starea salvată nu s-a citit încă din `localStorage`. */
  isLoading: boolean;
};

export function MessageList({ messages, isResponding, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Derulare la ultimul mesaj. Fără ea, răspunsul ar apărea sub marginea de jos
  // și utilizatorul ar crede că nu s-a întâmplat nimic.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isResponding]);

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
      {messages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}

      {isResponding && (
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

      {/* Ancoră goală pentru derulare. Un element dedicat e mai sigur decât
          calculul înălțimii containerului, care se schimbă la fiecare mesaj. */}
      <div ref={bottomRef} />
    </div>
  );
}
