"use client";

import { DatabaseZap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { computeCost, formatTokens, formatUsd, messageCost, tokensCostUsd } from "@/lib/cost";
import type { MessageUsageDetails } from "@/lib/message-utils";
import { PROVIDERS } from "@/lib/providers";

// Consumul și costul unui răspuns, afișate sub bulă.
//
// Discret, intenționat: text mic, culoarea estompată a interfeței, nicio culoare
// de avertizare. E o INFORMAȚIE, ca ora unui mesaj — nu o alarmă. Un cost scris cu
// roșu lângă fiecare răspuns ar transforma fiecare întrebare într-o mică vină.
//
// Rândul arată doar ce se citește dintr-o privire (tokeni și sumă). Detaliile —
// unde se duc banii — stau în tooltip, pentru cine le caută.

type MessageUsageProps = {
  details: MessageUsageDetails;
};

export function MessageUsage({ details }: MessageUsageProps) {
  const { metadata, resentInputTokens } = details;
  const { usage, pricing, source } = metadata;
  const isCached = source === "cache";

  // AMBELE cifre vin din `cost.ts`: `messageCost` pentru ce s-a plătit acum
  // (zero la cache), `computeCost` pentru ce AR fi costat — util tocmai la cache,
  // ca să se vadă ce a economisit.
  const paid = messageCost(metadata);
  const original = computeCost(usage, pricing);

  const newInputTokens =
    usage.inputTokens !== undefined && resentInputTokens !== undefined
      ? usage.inputTokens - resentInputTokens
      : undefined;
  const resentUsd = tokensCostUsd(resentInputTokens, pricing.inputPerMillionUsd);

  // Eticheta modelului vine din registru; dacă între timp modelul a ieșit din
  // registru, rămâne id-ul salvat pe mesaj — nu se inventează o etichetă.
  const provider = PROVIDERS[metadata.providerId];
  const modelLabel = provider.modelId === metadata.modelId ? provider.modelLabel : metadata.modelId;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          // Buton, nu `span`: tooltip-ul trebuie să poată fi deschis și de la
          // tastatură (focus), nu doar cu mouse-ul. Ghost + text estompat, ca să nu
          // arate a acțiune de apăsat.
          className="h-5 px-1 text-[11px] font-normal text-muted-foreground/80 tabular-nums"
          aria-label="Detalii despre consumul acestui răspuns"
        >
          {isCached && (
            <span className="flex items-center gap-1">
              <DatabaseZap className="size-3" />
              din cache ·
            </span>
          )}
          <span>
            {formatTokens(usage.inputTokens)} intrare · {formatTokens(usage.outputTokens)} ieșire ·{" "}
            {formatUsd(paid.totalUsd)}
          </span>
        </Button>
      </TooltipTrigger>

      <TooltipContent className="max-w-xs">
        <div className="flex flex-col gap-1 text-xs">
          {isCached && (
            <p>
              Răspuns redat din cache: aceeași întrebare, cu același context, a primit deja răspuns recent. Nu s-a făcut
              niciun apel către model, deci nu s-a plătit nimic. La un apel nou ar fi costat{" "}
              {formatUsd(original.totalUsd)}.
            </p>
          )}
          <p>
            Intrare: {formatTokens(usage.inputTokens)} tokeni = {formatUsd(original.inputUsd)}
          </p>
          <p className="pl-3 opacity-80">
            din care retrimis (system prompt + istoric): {formatTokens(resentInputTokens)} = {formatUsd(resentUsd)}
          </p>
          <p className="pl-3 opacity-80">nou în acest mesaj: {formatTokens(newInputTokens)}</p>
          <p>
            Ieșire: {formatTokens(usage.outputTokens)} tokeni = {formatUsd(original.outputUsd)}
          </p>
          <p className="opacity-80">
            {provider.label} · {modelLabel} · {pricing.inputPerMillionUsd} $ / {pricing.outputPerMillionUsd} $ per
            milion (intrare / ieșire), preț verificat la {pricing.verifiedAt}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
