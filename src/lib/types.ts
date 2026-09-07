// Formele de date ale aplicației, într-un singur fișier.
//
// De ce contează acum, când datele sunt inventate: exact aceste tipuri vor
// descrie, la pasul următor, ce trimitem către model și ce primim înapoi. Dacă
// le scriem acum, înlocuirea datelor mock cu date reale devine o schimbare de
// implementare, nu o rescriere — compilatorul ne arată fiecare loc care nu mai
// corespunde.

/**
 * Nivelurile permise pentru un skill. Sunt un tip literal, nu `string`, ca o
 * valoare greșită („mediu") să fie prinsă la compilare, nu descoperită mai
 * târziu, când system prompt-ul construit din profil ar conține un nivel pe
 * care modelul nu-l poate interpreta consecvent.
 */
export const SKILL_LEVELS = ["începător", "intermediar", "avansat"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

/**
 * Gardă de tip pentru textul scris de utilizator în formularul de profil.
 * Acolo skill-urile se introduc ca text liber (`nume: nivel`), deci undeva
 * trebuie verificat că nivelul e unul dintre cele trei. Fără verificare, un
 * `as SkillLevel` ar minți compilatorul și eroarea ar apărea abia în F2.
 */
export function isSkillLevel(value: string): value is SkillLevel {
  return (SKILL_LEVELS as readonly string[]).includes(value);
}

export type Skill = {
  name: string;
  level: SkillLevel;
};

export type Profile = {
  /**
   * Există de pe acum, deși aplicația nu are autentificare — vezi decizia D-7.
   * Motivul: în F6, când apar conturi reale, datele se modelează deja per
   * utilizator, iar autentificarea devine un modul adăugat, nu o rescriere a
   * tot ce atinge profilul.
   */
  userId: string;
  name: string;
  /** Stack-ul curent, ca text liber: e context pentru model, nu o listă filtrabilă. */
  stack: string;
  skills: Skill[];
  goal: string;
};

export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  /**
   * ISO string, nu `Date`. Motivul e concret: starea se salvează în
   * `localStorage` prin `JSON.stringify`, iar un `Date` ar reveni de acolo ca
   * text — deci tipul ar minți după primul refresh. Păstrăm forma serializabilă
   * peste tot și formatăm doar la afișare.
   */
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
};

/**
 * Providerii de model. Sunt un tip închis pentru că D-4 spune că providerul se
 * schimbă, iar un `string` ar permite o valoare care nu are implementare.
 * În pasul acesta selecția e doar vizuală — nu se cheamă nimic.
 */
export type ProviderId = "anthropic" | "openai";

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  /** Numele modelului, afișat lângă provider ca utilizatorul să știe ce ar răspunde. */
  model: string;
};

/**
 * Registru, nu lanț de `if`. Adăugarea unui provider înseamnă o intrare aici,
 * nu o ramură nouă în fiecare loc care afișează sau validează providerul.
 */
export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  anthropic: { id: "anthropic", label: "Anthropic", model: "Claude Sonnet 4.5" },
  openai: { id: "openai", label: "OpenAI", model: "GPT-5" }
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/**
 * Preferința de temă a utilizatorului — ce a ales el, nu ce se vede pe ecran.
 * „system" nu e o temă, ci instrucțiunea „urmează sistemul de operare"; tema
 * efectivă se calculează din ea (vezi `theme-provider.tsx`). Ținem cele două
 * separate pentru că altfel n-am putea deosebi „a ales light" de „sistemul e
 * pe light acum" — și la schimbarea temei din sistem n-am ști ce să facem.
 */
export type ThemePreference = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";
