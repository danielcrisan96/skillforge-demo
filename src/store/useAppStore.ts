import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { MOCK_CONVERSATIONS, NEW_CONVERSATION_TITLE } from "@/lib/mock/conversations";
import { MOCK_PROFILE } from "@/lib/mock/profile";
import type { Conversation, Profile, ProviderId, ThemePreference } from "@/lib/types";

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

/**
 * CINE DEȚINE CE, de la F1.4 încoace (vezi D-19 din requirements).
 *
 * Store-ul ține LISTA de conversații: id, titlu, care e selectată. Atât.
 * Mesajele conversației deschise aparțin lui `useChat` și trăiesc în
 * `chat.tsx`.
 *
 * Ce era aici înainte și a dispărut: `sendMessage`, textul de răspuns simulat și
 * `setTimeout`-ul care îl întârzia. Nu au fost mutate, ci ȘTERSE — acum
 * răspunsul vine de la model, prin `/api/chat`, iar erorile sunt reale.
 *
 * De ce nu ținem și noi o copie a mesajelor, „pentru siguranță": pentru că nu
 * există așa ceva. În timpul streamului, hook-ul primește zeci de actualizări pe
 * secundă; orice al doilea deținător ar rămâne în urmă la prima bucată pierdută,
 * și nimic n-ar semnala asta. Un singur deținător, ales explicit.
 */

function createId(): string {
  return crypto.randomUUID();
}

type AppState = {
  profile: Profile;
  providerId: ProviderId;
  theme: ThemePreference;
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

  setHasHydrated: (value: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setProfile: (profile: Profile) => void;
  setProviderId: (providerId: ProviderId) => void;
  setTheme: (theme: ThemePreference) => void;

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
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: MOCK_PROFILE,
      providerId: "anthropic",
      theme: "system",
      conversations: MOCK_CONVERSATIONS,
      // `null` înseamnă „ecranul de conversație nouă”, nu „nu s-a încărcat încă”.
      // Sunt două lucruri diferite; al doilea e `hasHydrated`.
      activeConversationId: null,
      hasHydrated: false,
      draftConversationId: createId(),
      isSettingsOpen: false,

      setHasHydrated: value => set({ hasHydrated: value }),
      setSettingsOpen: open => set({ isSettingsOpen: open }),
      setProfile: profile => set({ profile }),
      setProviderId: providerId => set({ providerId }),
      setTheme: theme => set({ theme }),

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
              createdAt: new Date().toISOString()
            },
            ...state.conversations
          ],
          // Conversația devine activă, dar `draftConversationId` rămâne același:
          // e chiar id-ul pe care tocmai l-am folosit, deci `key`-ul componentei
          // de chat nu se schimbă și stream-ul în curs nu e întrerupt.
          activeConversationId: id
        }));
      }
    }),
    {
      name: "skillforge-app",
      storage: createJSONStorage(() => localStorage),

      /**
       * Ce se salvează. `hasHydrated`, `draftConversationId` și `isSettingsOpen`
       * descriu momentul curent, nu datele utilizatorului: salvate, aplicația
       * s-ar redeschide cu fereastra de preferințe deschisă peste conversație și
       * cu un id de schiță rămas de la sesiunea trecută.
       */
      partialize: state => ({
        profile: state.profile,
        providerId: state.providerId,
        theme: state.theme,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId
      }),

      /**
       * Versiunea 2: conversațiile nu mai au `messages`.
       *
       * Exact cazul pentru care `version` exista de la început. Oricine a
       * deschis aplicația înainte de F1.4 are în `localStorage` conversații CU
       * mesaje, în forma veche (`content: string`). Fără migrare, transcrierile
       * alea ar rămâne acolo pentru totdeauna — invizibile, pentru că nimic nu
       * le mai citește, dar ocupând spațiu și pretinzând că sunt starea curentă.
       */
      version: 2,

      migrate: persisted => {
        const state = persisted as { conversations?: unknown[] } | undefined;
        if (!state?.conversations) return state;

        return {
          ...state,
          // `messages` se aruncă: de acum transcrierea aparține lui `useChat`.
          // Titlurile și ordinea rămân, deci sidebar-ul arată la fel după update.
          conversations: state.conversations.map(conversation => {
            const meta = { ...(conversation as Record<string, unknown>) };
            delete meta.messages;
            return meta;
          })
        };
      },

      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      }
    }
  )
);
