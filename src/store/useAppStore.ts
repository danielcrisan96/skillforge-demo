import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UIMessage } from "ai";

import { MOCK_CONVERSATIONS, NEW_CONVERSATION_TITLE } from "@/lib/mock/conversations";
import { MOCK_PROFILE } from "@/lib/mock/profile";
import type { Conversation, Profile, ProviderId } from "@/lib/types";

// Starea aplicației, într-un singur store.
//
// De ce un store și nu `useState` ridicat în pagină: aceleași date sunt citite
// din trei locuri care nu sunt înrudite în arborele de componente — sidebar-ul
// (lista de conversații), fereastra de preferințe (profil, temă, provider) și
// zona de chat. Trecute prin props, ar fi însemnat ca fiecare componentă
// intermediară să care date de care nu-i pasă.
//
// De ce `persist`: fără el, lista de conversații ar dispărea la fiecare refresh,
// iar aplicația ar părea stricată deși nu e. `localStorage` e suficient pentru
// că în faza asta nu există server cu stare — vezi §8.2 din requirements pentru
// ce înseamnă asta pentru datele personale.
//
// STORE vs. `createContext`+`useContext` — comparația pregătită la F3.1 și
// ÎNCHISĂ aici, pe cod real: tema a ieșit din acest store și a trecut pe
// context, în `src/components/theme/theme-provider.tsx`.
//
// `useContext` n-are selectors: orice consumator al providerului se re-randează
// la ORICE schimbare a valorii din context, chiar dacă citește doar un câmp din
// ea — și cere un `<Provider>` undeva în arbore, deci se vede în JSX de unde vine
// valoarea. Un store Zustand se citește din orice fișier, cu
// `useAppStore(state => state.x)`, fără provider — dar exact de-asta valoarea e
// mai greu de urmărit „de unde vine”: nu apare nicăieri în arborele de
// componente, doar în importuri.
//
// Concluzia, ca regulă de decizie: o valoare care se schimbă RAR și are PUȚINI
// consumatori (tema aleasă manual dintr-un meniu, un flag de feature) e un caz
// bun pentru context — costul re-randării nefolosite e mic, iar vizibilitatea în
// arbore contează. O stare care se schimbă DES și e citită din locuri multe,
// neînrudite (conversațiile de aici: sidebar, header, chat, toate la fiecare
// token) are nevoie de selectors ca să nu re-randeze tot ce n-are treabă cu
// schimbarea — și acolo store-ul câștigă clar.
//
// De ce exact tema a fost aleasă ca exemplu de context, și nu altceva din
// aplicație: are UN SINGUR consumator logic („ce se vede pe ecran acum"), citit
// din puține componente (fereastra de preferințe, `Toaster`-ul de notificări),
// și se schimbă rar — un clic în preferințe, sau ocazional un eveniment de la
// sistemul de operare. Profil opus conversațiilor, care rămân în store.

/**
 * CINE DEȚINE CE, de la F3.1 încoace (vezi D-19 din requirements — actualizată
 * la acest pas).
 *
 * CÂT TIMP UN RĂSPUNS CURGE, mesajele aparțin lui `useChat`, în `chat.tsx`. Hook-ul
 * le construiește token cu token; nimic altceva nu le scrie în timpul ăsta.
 *
 * Store-ul e ARHIVA: lista de conversații, id, titlu ȘI mesajele lor — dar
 * scrise aici o SINGURĂ dată, la finalul streamului, prin
 * `syncConversationMessages`. Nu la fiecare token.
 *
 * De ce nu la fiecare token, deși ar părea mai „la zi": `persist` scrie în
 * `localStorage` SINCRON, la orice schimbare de stare din store. O sincronizare
 * pe token ar însemna sute de serializări ale ÎNTREGULUI istoric de conversații
 * în câteva secunde — pe o conversație lungă, interfața s-ar bloca vizibil cât
 * timp thread-ul principal serializează JSON în loc să deseneze ecranul.
 *
 * Compromisul asumat, cu bună știință: un răspuns întrerupt de un refresh LA
 * MIJLOCUL streamului se pierde — arhiva încă are versiunea de dinaintea
 * mesajului curent, pentru că sincronizarea n-a apucat să ruleze. E un
 * compromis, nu un bug: o persistență care supraviețuiește și la asta cere un
 * server care primește fiecare bucată pe măsură ce vine (F6), nu `localStorage`,
 * care oricum n-ar putea fi scris mai des fără costul de mai sus.
 *
 * Ce era aici înainte și a dispărut la F1.4: `sendMessage`, textul de răspuns
 * simulat și `setTimeout`-ul care îl întârzia. Nu au fost mutate, ci ȘTERSE —
 * răspunsul vine de la model, prin `/api/chat`, iar erorile sunt reale.
 */

function createId(): string {
  return crypto.randomUUID();
}

type AppState = {
  profile: Profile;
  providerId: ProviderId;
  conversations: Conversation[];
  activeConversationId: string | null;

  /**
   * Adevărat abia după ce `persist` a citit `localStorage`.
   *
   * Fără steagul ăsta am avea o nepotrivire de hidratare: serverul randează
   * starea inițială (conversațiile mock), browserul rehidratează starea salvată,
   * iar React se plânge că HTML-ul primit nu corespunde. Interfața așteaptă
   * semnalul ăsta și afișează `Skeleton` până atunci — de asta stările de
   * încărcare nu sunt decor, ci soluția la o problemă reală.
   */
  hasHydrated: boolean;

  /**
   * Id-ul pregătit pentru conversația care încă nu există.
   *
   * Ecranul „conversație nouă" are nevoie de un id STABIL înainte să existe
   * vreun mesaj, pentru un motiv foarte concret: componenta de chat e remontată
   * (prin `key`) când se schimbă conversația, ca `useChat` să pornească de la
   * zero. Dacă id-ul ar apărea abia la primul mesaj, `key` s-ar schimba fix în
   * clipa trimiterii — React ar arunca componenta, iar stream-ul tocmai pornit
   * ar fi pierdut. Cu id-ul pregătit dinainte, trecerea „conversație nouă" ->
   * „conversație salvată" nu mai remontează nimic.
   *
   * Nu se persistă: e o intenție a momentului, nu o dată a utilizatorului.
   */
  draftConversationId: string;

  /**
   * Fereastra de preferințe e deschisă.
   *
   * Stă în store, deși e stare de interfață, din două motive practice: e
   * deschisă din sidebar dar randată la nivel de pagină (altfel, pe mobil, ar
   * ajunge imbricată în `Sheet`-ul sidebar-ului, cu două capcane de focus una
   * în alta), iar așa nu trebuie cărată prin props printr-un lanț de componente
   * cărora nu le pasă de ea.
   */
  isSettingsOpen: boolean;

  /**
   * Fereastra de alegere a furnizorului de login e deschisă.
   *
   * Aceleași motive ca `isSettingsOpen`: se deschide din sidebar, dar se randează
   * la nivel de pagină (pe mobil, sidebar-ul e un `Sheet`). NU e informație despre
   * cont — cine e conectat se citește din sesiune, niciodată de aici.
   */
  isSignInOpen: boolean;

  setHasHydrated: (value: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSignInOpen: (open: boolean) => void;
  setProfile: (profile: Profile) => void;
  /**
   * Golește profilul, păstrând doar `userId`.
   *
   * E cerința din §8.2: profilul se poate șterge complet din interfață, în
   * orice fază — pentru că e dată personală, iar utilizatorul trebuie să poată
   * reveni la „aplicația nu știe nimic despre mine" fără să umble prin
   * DevTools sau setările browserului.
   */
  clearProfile: () => void;
  setProviderId: (providerId: ProviderId) => void;

  createConversation: () => void;
  selectConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;

  /**
   * Adaugă în listă conversația începută pe ecranul gol și o face activă.
   *
   * Se cheamă la PRIMUL mesaj, nu la apăsarea butonului „New": altfel, cinci
   * clicuri ar lăsa cinci conversații goale în sidebar.
   */
  materializeConversation: (title: string) => void;

  /**
   * Scrie în arhivă instantaneul curent de mesaje al conversației `id`.
   *
   * SINGURUL loc unde mesajele lui `useChat` ajung în store — și se cheamă
   * DOAR când streamul s-a oprit (`status` = „ready" sau „error" în
   * `chat.tsx`), niciodată per token. Vezi comentariul de la începutul
   * fișierului pentru motiv.
   *
   * Dacă `id` nu (mai) există în listă — conversația a fost ștearsă cât timp
   * răspunsul era în curs — nu face nimic: fără verificarea asta,
   * `conversations.map` ar întoarce oricum un array nou, la fel ca înainte, și
   * `persist` ar scrie din nou în `localStorage` degeaba.
   */
  syncConversationMessages: (id: string, messages: UIMessage[]) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: MOCK_PROFILE,
      providerId: "anthropic",
      conversations: MOCK_CONVERSATIONS,
      // `null` înseamnă „ecranul de conversație nouă”, nu „nu s-a încărcat încă”.
      // Sunt două lucruri diferite; al doilea e `hasHydrated`.
      activeConversationId: null,
      hasHydrated: false,
      draftConversationId: createId(),
      isSettingsOpen: false,
      isSignInOpen: false,

      setHasHydrated: value => set({ hasHydrated: value }),
      setSettingsOpen: open => set({ isSettingsOpen: open }),
      setSignInOpen: open => set({ isSignInOpen: open }),
      setProfile: profile => set({ profile }),
      clearProfile: () =>
        set(state => ({
          profile: { userId: state.profile.userId, name: "", stack: "", skills: [], goal: "" }
        })),
      setProviderId: providerId => set({ providerId }),

      createConversation: () => {
        // Nu creăm încă un obiect de conversație: dacă utilizatorul apasă „New”
        // de cinci ori, ar rămâne cinci conversații goale în listă. Conversația
        // se naște abia la primul mesaj (vezi `materializeConversation`).
        //
        // Id-ul nou pentru schița următoare se generează ACUM, ca remontarea
        // componentei de chat (care se face pe `key`) să golească ecranul de
        // mesajele conversației precedente.
        set({ activeConversationId: null, draftConversationId: createId() });
      },

      selectConversation: id => set({ activeConversationId: id }),

      renameConversation: (id, title) => {
        const trimmed = title.trim();
        // Un titlu gol ar face conversația imposibil de găsit în listă, deci
        // refuzăm redenumirea în loc să salvăm un rând invizibil.
        if (!trimmed) return;
        set(state => ({
          conversations: state.conversations.map(c => (c.id === id ? { ...c, title: trimmed } : c))
        }));
      },

      deleteConversation: id => {
        set(state => ({
          conversations: state.conversations.filter(c => c.id !== id),
          // Dacă tocmai am șters conversația deschisă, trebuie să ducem
          // utilizatorul undeva valid. Altfel ecranul ar rămâne pe un id care nu
          // mai există și n-ar randa nimic.
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId
        }));
      },

      materializeConversation: title => {
        const trimmed = title.trim();
        const id = get().draftConversationId;

        set(state => ({
          conversations: [
            {
              id,
              // În F3 titlul se va genera din primul mesaj, cu un model. Până
              // atunci, primele cuvinte sunt mai utile decât un titlu fix:
              // lista de conversații trebuie să fie citibilă dintr-o privire.
              title: trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed || NEW_CONVERSATION_TITLE,
              createdAt: new Date().toISOString(),
              // Goală acum: primul mesaj tocmai pleacă spre model, dar încă n-a
              // răspuns nimic. `syncConversationMessages` o umple la finalul
              // streamului — vezi mai jos.
              messages: []
            },
            ...state.conversations
          ],
          // Conversația devine activă, dar `draftConversationId` rămâne același:
          // e chiar id-ul pe care tocmai l-am folosit, deci `key`-ul componentei
          // de chat nu se schimbă și stream-ul în curs nu e întrerupt.
          activeConversationId: id
        }));
      },

      syncConversationMessages: (id, messages) => {
        set(state => {
          if (!state.conversations.some(c => c.id === id)) return state;
          return {
            conversations: state.conversations.map(c => (c.id === id ? { ...c, messages } : c))
          };
        });
      }
    }),
    {
      name: "skillforge-app",
      storage: createJSONStorage(() => localStorage),

      /**
       * Ce se salvează. `hasHydrated`, `draftConversationId`, `isSettingsOpen` și
       * `isSignInOpen` descriu momentul curent, nu datele utilizatorului: salvate, aplicația
       * s-ar redeschide cu fereastra de preferințe deschisă peste conversație și
       * cu un id de schiță rămas de la sesiunea trecută.
       *
       * Observă și ce NU există deloc în `AppState`, nu doar ce e exclus aici:
       * `status` (submitted/streaming/ready/error) și `error` de la `useChat`
       * n-au ajuns niciodată în store — rămân locale în `chat.tsx`, derivate din
       * hook. Dacă le-am fi ținut și noi aici, `persist` le-ar fi scris în
       * `localStorage` la fiecare schimbare: un refresh la mijlocul unui
       * răspuns ar deschide aplicația pe „se încarcă…” înghețat, iar o eroare
       * veche ar reapărea peste o conversație nouă, curată.
       *
       * Nici tema nu mai e aici — a ieșit din `AppState` de tot, la pasul unde
       * a trecut pe `createContext`+`useContext` (`theme-provider.tsx`). Are
       * acum propria cheie în `localStorage` (`skillforge-theme`), scrisă
       * direct de provider, nu prin acest `persist`. Două locuri care ar ține
       * aceeași preferință seria un comutator care merge pe jumătate.
       */
      partialize: state => ({
        profile: state.profile,
        providerId: state.providerId,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId
      }),

      /**
       * Versiunea 3: conversațiile au din nou `messages`, dar cu formă și rol
       * noi — arhiva de la F3.1, nu sursa de adevăr din timpul streamului.
       *
       * Ce poate exista în `localStorage`, pe versiuni:
       * - v2 (F1.4–F3): conversații FĂRĂ `messages` deloc — a fost șters explicit
       *   atunci, când mesajele au devenit responsabilitatea exclusivă a lui
       *   `useChat`.
       * - v1/nemarcat (dinainte de F1.4): conversații CU `messages`, dar în
       *   forma veche (`content: string`), incompatibilă cu `UIMessage`
       *   (`parts`), pe care nimic din interfața actuală n-o mai poate reda.
       *
       * În ambele cazuri, singura formă validă de pornit e goală: nu există
       * cum să reconstruim un `UIMessage[]` corect dintr-o formă pe care n-o
       * mai citim sau care nu conține mesaje. E exact compromisul asumat deja
       * la v2 — o migrare de schemă poate pierde conținut vechi, dar NU are
       * voie să lase aplicația să crape la primul refresh de după update.
       *
       * De ce F4.2 NU a crescut versiunea, deși mesajele arhivate au acum
       * `metadata` (consumul și costul): câmpul exista deja, opțional, în tipul
       * `UIMessage`, deci forma salvată nu s-a schimbat — doar a început să fie
       * folosită. Un mesaj vechi, fără metadate, rămâne perfect valid, iar
       * `messageUsage` din `message-utils.ts` validează explicit ce citește și îl
       * tratează ca „nemăsurat". O migrare ar fi avut ce să facă doar dacă am fi
       * vrut să inventăm consum pentru mesaje vechi — exact ce nu vrem.
       */
      version: 3,

      migrate: persisted => {
        const state = persisted as { conversations?: unknown[] } | undefined;
        if (!state?.conversations) return state;

        return {
          ...state,
          // Titlurile și ordinea rămân, deci sidebar-ul arată la fel după update.
          conversations: state.conversations.map(conversation => ({
            ...(conversation as Record<string, unknown>),
            messages: []
          }))
        };
      },

      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      }
    }
  )
);
