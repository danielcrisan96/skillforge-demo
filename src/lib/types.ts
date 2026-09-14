import type { UIMessage } from "ai";

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

/**
 * O conversație, așa cum apare în lista din stânga — PLUS mesajele ei.
 *
 * De la F1.4 (D-19) și până la F3.1, `messages` lipsea de tot: transcrierea
 * conversației deschise aparținea doar lui `useChat`, iar store-ul ținea doar
 * lista. Motivul acelei alegeri rămâne valabil — două locuri care țin aceleași
 * mesaje se desincronizează garantat, pentru că în timpul streamului sosesc
 * zeci de actualizări pe secundă și al doilea deținător rămâne mereu în urmă.
 *
 * Ce s-a schimbat la F3.1: `messages` revine, dar cu un rol diferit de cel pe
 * care l-ar fi avut înainte de F1.4. NU e sursa de adevăr cât timp răspunsul
 * curge — aceea rămâne `useChat`. E ARHIVA: instantaneul scris aici o singură
 * dată, la finalul streamului (vezi `syncConversationMessages` din
 * `useAppStore.ts`), ca discuția să supraviețuiască unui refresh sau unei
 * comutări pe altă conversație. Câtă vreme un răspuns e în curs, `messages` de
 * aici arată tot ce era înainte de mesajul curent — nu o versiune parțială,
 * pe jumătate scrisă.
 */
export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  messages: UIMessage[];
};

/**
 * Providerii de model. Sunt un tip închis pentru că D-4 spune că providerul se
 * schimbă, iar un `string` ar permite o valoare care nu are implementare.
 *
 * Tipul stă aici; REGISTRUL (etichete, id-uri de model, numele variabilei de
 * mediu) s-a mutat în `src/lib/providers.ts`, fiindcă de la F1.4 conține id-ul
 * trimis către API — o valoare de configurare, nu o formă de date.
 *
 * Fiind închis, tipul ăsta e și mecanismul care ține registrul și lista de
 * SDK-uri în sinc: `MODEL_FACTORIES` din `providers.server.ts` e indexat pe el,
 * deci un provider nou aici, fără ramura lui de SDK acolo, nu compilează.
 */
export type ProviderId = "anthropic" | "openai";

/**
 * Ce știe SERVERUL despre un provider și interfața nu are cum să afle singură.
 *
 * Traversează granița client/server, deci e scris explicit (vezi §8.6: cheile
 * JSON sunt contract, nu text afișat). Îl produce `GET /api/providers`.
 *
 * Ce NU conține, niciodată: valoarea cheii, nici măcar trunchiată sau sub formă
 * de „ultimele 4 caractere". Singurul lucru care pleacă spre browser e DA/NU
 * plus un motiv gata de citit — atât îi trebuie interfeței ca să arate opțiunea
 * dezactivată, cu explicație, în loc s-o ascundă. O opțiune dispărută din listă
 * e o întrebare fără răspuns („de ce nu văd OpenAI?"); una dezactivată, cu
 * motivul lângă ea, e o instrucțiune.
 */
export type ProviderAvailability = {
  id: ProviderId;
  /** Există o cheie pentru providerul ăsta în mediul serverului. */
  configured: boolean;
  /** Motivul, gata de afișat, când `configured` e `false`. `null` când e configurat. */
  unavailableReason: string | null;
};

/**
 * Preferința de temă a utilizatorului — ce a ales el, nu ce se vede pe ecran.
 * „system" nu e o temă, ci instrucțiunea „urmează sistemul de operare"; tema
 * efectivă se calculează din ea (vezi `theme-provider.tsx`). Ținem cele două
 * separate pentru că altfel n-am putea deosebi „a ales light" de „sistemul e
 * pe light acum" — și la schimbarea temei din sistem n-am ști ce să facem.
 */
export type ThemePreference = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";
