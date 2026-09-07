import type { ProviderId } from "@/lib/types";

// Registrul providerilor de model.
//
// De ce un fișier separat, și nu mai departe în `types.ts`: de la pasul acesta
// registrul nu mai conține doar text de afișat, ci `modelId` — șirul exact pe
// care îl primește API-ul providerului. Ăsta e singurul loc din proiect unde e
// scris.
//
// Motivul e cel banal și cel care doare: un id de model scris în două fișiere e
// un id care va rămâne în urmă într-unul din ele. Ruta de server îl citește de
// aici, interfața tot de aici — deci schimbarea modelului e o singură linie, iar
// ce scrie în composer nu poate să mintă despre cine a răspuns de fapt.

export type ProviderInfo = {
  id: ProviderId;
  /** Numele companiei, pentru interfață. */
  label: string;
  /**
   * Id-ul de model trimis către API. NU e text de afișat: o greșeală aici e o
   * eroare de la provider, nu o etichetă urâtă.
   */
  modelId: string;
  /** Cum se numește modelul pentru un om. Poate diferi de `modelId`. */
  modelLabel: string;
  /**
   * Există cod care chiar cheamă providerul ăsta?
   *
   * În F1.4 doar Anthropic e implementat; OpenAI intră în F4 (vezi D-4). Fără
   * steagul ăsta, interfața ar lăsa utilizatorul să aleagă un provider care
   * răspunde cu o eroare — iar vina ar părea a fi a cheii, nu a fazei.
   */
  implemented: boolean;
};

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  anthropic: {
    id: "anthropic-haiku",
    label: "Anthropic",
    modelId: "claude-haiku-4-5",
    modelLabel: "Claude Haiku 4.5",
    implemented: true
  },

  openai: {
    id: "openai",
    label: "OpenAI",
    modelId: "gpt-5",
    modelLabel: "GPT-5",
    implemented: false
  }
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/**
 * Providerul cu care pornește aplicația și modelul lui.
 *
 * Ruta de server citește DE AICI, nu dintr-un șir scris în rută. Alegerea din
 * preferințe rămâne, în pasul acesta, doar vizuală: ca serverul să asculte de
 * ea, providerul ar trebui să călătorească în corpul cererii — iar asta cere
 * validare pe server, altfel clientul ar putea cere orice model. Se face în F4,
 * o dată cu al doilea provider real.
 */
export const DEFAULT_PROVIDER_ID: ProviderId = "anthropic";

export const DEFAULT_MODEL_ID = PROVIDERS[DEFAULT_PROVIDER_ID].modelId;
