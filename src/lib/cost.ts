import type { MessageUsageMetadata, ModelPricing, TokenUsage } from "@/lib/types";

// SINGURUL loc din aplicație care transformă tokeni în bani.
//
// De ce contează să fie unul singur: costul apare în două locuri pe ecran — lângă
// fiecare răspuns și ca total pe conversație. Cu două formule, prima modificare
// (un preț pentru tokenii din cache, un multiplicator de context lung) ar ajunge
// într-una și nu în cealaltă, iar suma mesajelor n-ar mai da totalul afișat. Nimeni
// n-ar observa până nu adună cineva de mână.
//
// Funcțiile sunt PURE: fără store, fără `fetch`, fără `process.env` — fișierul
// ajunge și în browser și se poate verifica cu cifre scrise de mână.
//
// Ce NU face: nu ESTIMEAZĂ tokeni. Numărul vine exclusiv de la provider (`usage`,
// raportat la finalul streamului). Un număr ghicit din lungimea textului ar părea
// precis și ar fi greșit în moduri greu de observat — altă limbă, alt tokenizer.

const TOKENS_PER_UNIT = 1_000_000;

/**
 * Costul unor tokeni la un preț per milion.
 *
 * `undefined` intră → `undefined` iese. E toată regula despre valori lipsă: un
 * număr necunoscut de tokeni NU devine 0 (ar arăta gratis) și NU devine `NaN`
 * (`undefined * 1` în JavaScript), care s-ar propaga tăcut în orice sumă.
 */
export function tokensCostUsd(tokens: number | undefined, pricePerMillionUsd: number): number | undefined {
  if (tokens === undefined) return undefined;
  return (tokens * pricePerMillionUsd) / TOKENS_PER_UNIT;
}

export type CostBreakdown = {
  inputUsd: number | undefined;
  outputUsd: number | undefined;
  /** `undefined` dacă oricare dintre cele două părți e necunoscută — un total pe jumătate nu e total. */
  totalUsd: number | undefined;
};

/** Formula: tokeni × preț / 1.000.000, separat pentru intrare și ieșire. */
export function computeCost(usage: TokenUsage, pricing: ModelPricing): CostBreakdown {
  const inputUsd = tokensCostUsd(usage.inputTokens, pricing.inputPerMillionUsd);
  const outputUsd = tokensCostUsd(usage.outputTokens, pricing.outputPerMillionUsd);

  return {
    inputUsd,
    outputUsd,
    totalUsd: inputUsd === undefined || outputUsd === undefined ? undefined : inputUsd + outputUsd
  };
}

const FREE: CostBreakdown = { inputUsd: 0, outputUsd: 0, totalUsd: 0 };

/**
 * Costul unui răspuns, așa cum l-a plătit ACEASTĂ aplicație.
 *
 * Un răspuns redat din cache are cost zero — și aici zero e adevărat, nu o
 * minciună: nu s-a făcut niciun apel către provider. Tokenii lui originali rămân
 * pe mesaj (sunt tot context retrimis la mesajul următor), dar nu se mai plătesc
 * a doua oară.
 */
export function messageCost(metadata: MessageUsageMetadata): CostBreakdown {
  return metadata.source === "cache" ? FREE : computeCost(metadata.usage, metadata.pricing);
}

// --- Afișare ---------------------------------------------------------------
//
// Formatarea stă lângă formulă, nu în componente: „cum arată o sumă" trebuie să
// fie la fel lângă mesaj și în total, altfel aceeași valoare apare scrisă în
// două feluri și pare că sunt două cifre diferite.

const usdFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
});

const tokenFormatter = new Intl.NumberFormat("ro-RO");

/** „—" pentru necunoscut; sub o zecime de cent, „< 0,0001 $" în loc de un „0,00 $" care ar părea gratis. */
export function formatUsd(value: number | undefined): string {
  if (value === undefined) return "—";
  if (value > 0 && value < 0.0001) return `< ${usdFormatter.format(0.0001)}`;
  return usdFormatter.format(value);
}

export function formatTokens(value: number | undefined): string {
  return value === undefined ? "—" : tokenFormatter.format(value);
}
