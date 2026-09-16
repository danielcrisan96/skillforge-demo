"use client";

import { useMemo } from "react";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatUsd } from "@/lib/cost";
import { conversationCostSummary } from "@/lib/message-utils";
import { useAppStore } from "@/store/useAppStore";

// Cât s-a adunat pe conversația deschisă, în bara de sus.
//
// Citește din ARHIVĂ (store), nu din `useChat` și nici prin puntea de export —
// și asta nu e o scurtătură care ocolește D-19. Costul unui răspuns există abia
// când streamul s-a terminat (providerul raportează consumul la final), iar exact
// atunci `chat.tsx` arhivează mesajele. Arhiva are deci mereu toate costurile
// cunoscute; o copie în timp real a mesajelor n-ar avea nimic în plus de arătat.
//
// E informație, nu acțiune — deci nu încalcă regula „fără bară de acțiuni deasupra
// conversației". Stă în header, lângă export — unde sunt lucrurile despre conversație.

const EMPTY_MESSAGES: never[] = [];

export function ConversationCost() {
  // Selector care întoarce o referință EXISTENTĂ (array-ul de mesaje din store),
  // nu un obiect construit pe loc — altfel componenta s-ar re-randa în buclă.
  // Constanta de mai sus are același rol pentru cazul „fără conversație": un `[]`
  // scris direct în selector ar fi un array nou la fiecare apel.
  const messages = useAppStore(
    state => state.conversations.find(c => c.id === state.activeConversationId)?.messages ?? EMPTY_MESSAGES
  );

  const summary = useMemo(() => conversationCostSummary(messages), [messages]);

  const measuredCount = summary.paidCount + summary.cachedCount;
  if (measuredCount === 0) return null;

  const resentShare = summary.totalUsd > 0 ? Math.round((summary.resentUsd / summary.totalUsd) * 100) : 0;
  // Un total cu răspunsuri nemăsurate e un MINIM, și se scrie ca atare.
  const totalLabel = summary.unknownCount > 0 ? `≥ ${formatUsd(summary.totalUsd)}` : formatUsd(summary.totalUsd);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="font-normal text-muted-foreground tabular-nums"
          aria-label="Costul conversației"
        >
          <Coins />
          {totalLabel}
        </Button>
      </TooltipTrigger>

      <TooltipContent align="end" className="max-w-xs">
        <div className="flex flex-col gap-1 text-xs">
          {/* Fără niciun răspuns plătit, „a costat 0 în 0 răspunsuri, din care 0%
              retrimis" ar fi trei zerouri fără informație — rămâne doar linia de cache. */}
          {summary.paidCount > 0 && (
            <>
              <p>
                Conversația a costat {totalLabel} în {summary.paidCount}{" "}
                {summary.paidCount === 1 ? "răspuns plătit" : "răspunsuri plătite"}.
              </p>
              <p>
                Din asta, context retrimis (system prompt + istoric): {summary.resentComplete ? "" : "cel puțin "}
                {formatUsd(summary.resentUsd)} ({resentShare}%).
              </p>
              <p className="opacity-80">
                Fiecare mesaj nou retrimite tot ce a fost înainte, deci partea asta crește cu lungimea conversației. O
                conversație nouă pornește de la zero.
              </p>
            </>
          )}
          {summary.cachedCount > 0 && (
            <p className="opacity-80">
              {summary.cachedCount} {summary.cachedCount === 1 ? "răspuns redat" : "răspunsuri redate"} din cache, fără
              cost.
            </p>
          )}
          {summary.unknownCount > 0 && (
            <p className="opacity-80">
              {summary.unknownCount} {summary.unknownCount === 1 ? "răspuns nu are" : "răspunsuri nu au"} consum măsurat
              (dinainte de măsurare, oprite înainte de final sau fără date de la provider).
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
