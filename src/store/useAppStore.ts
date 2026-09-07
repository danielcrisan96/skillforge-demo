import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { MOCK_CONVERSATIONS, MOCK_ASSISTANT_REPLY, NEW_CONVERSATION_TITLE } from "@/lib/mock/conversations";
import { MOCK_PROFILE } from "@/lib/mock/profile";
import type { Conversation, Message, Profile, ProviderId, ThemePreference } from "@/lib/types";

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
 * Referința către „răspunsul în curs”. Stă în afara store-ului pentru că un
 * handle de `setTimeout` nu e serializabil: dacă ar intra în starea persistată,
 * `JSON.stringify` l-ar transforma într-un număr fără sens, iar după refresh
 * butonul de stop ar încerca să oprească un timer inexistent.
 */
let pendingReplyTimer: ReturnType<typeof setTimeout> | null = null;

/** Întârzierea răspunsului simulat. Destul cât indicatorul „scrie…” să fie vizibil. */
const MOCK_REPLY_DELAY_MS = 1400;

function createId(): string {
  return crypto.randomUUID();
}

function createMessage(role: Message["role"], content: string): Message {
  return { id: createId(), role, content, createdAt: new Date().toISOString() };
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

  /** Există un răspuns în curs. Comută butonul din `Send` în `Square` (stop). */
  isResponding: boolean;

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

  sendMessage: (content: string) => void;
  stopResponding: () => void;
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
      isResponding: false,
      isSettingsOpen: false,

      setHasHydrated: value => set({ hasHydrated: value }),
      setSettingsOpen: open => set({ isSettingsOpen: open }),
      setProfile: profile => set({ profile }),
      setProviderId: providerId => set({ providerId }),
      setTheme: theme => set({ theme }),

      createConversation: () => {
        // Nu creăm încă un obiect de conversație: dacă utilizatorul apasă „New”
        // de cinci ori, ar rămâne cinci conversații goale în listă. Conversația
        // se naște abia la primul mesaj trimis (vezi `sendMessage`).
        set({ activeConversationId: null });
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

      sendMessage: content => {
        const trimmed = content.trim();
        if (!trimmed || get().isResponding) return;

        const userMessage = createMessage("user", trimmed);
        const activeId = get().activeConversationId;

        if (activeId === null) {
          // Primul mesaj dintr-o conversație nouă: abia acum o materializăm.
          const conversation: Conversation = {
            id: createId(),
            // În F3 titlul se va genera din primul mesaj. Până atunci, primele
            // cuvinte sunt mai utile decât un titlu fix, pentru că lista de
            // conversații trebuie să fie citibilă.
            title: trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed || NEW_CONVERSATION_TITLE,
            createdAt: new Date().toISOString(),
            messages: [userMessage]
          };
          set(state => ({
            conversations: [conversation, ...state.conversations],
            activeConversationId: conversation.id,
            isResponding: true
          }));
        } else {
          set(state => ({
            conversations: state.conversations.map(c =>
              c.id === activeId ? { ...c, messages: [...c.messages, userMessage] } : c
            ),
            isResponding: true
          }));
        }

        // AICI SE VA LEGA MODELUL, la pasul următor.
        //
        // Tot ce urmează — întârzierea și textul fix — se înlocuiește cu apelul
        // către `/api/chat` și cu citirea stream-ului. Restul aplicației nu știe
        // de unde vine textul, deci nu se schimbă nimic altundeva.
        pendingReplyTimer = setTimeout(() => {
          const conversationId = get().activeConversationId;
          if (conversationId === null) return;
          const reply = createMessage("assistant", MOCK_ASSISTANT_REPLY);
          set(state => ({
            conversations: state.conversations.map(c =>
              c.id === conversationId ? { ...c, messages: [...c.messages, reply] } : c
            ),
            isResponding: false
          }));
          pendingReplyTimer = null;
        }, MOCK_REPLY_DELAY_MS);
      },

      stopResponding: () => {
        if (pendingReplyTimer !== null) {
          clearTimeout(pendingReplyTimer);
          pendingReplyTimer = null;
        }
        set({ isResponding: false });
      }
    }),
    {
      name: "skillforge-app",
      storage: createJSONStorage(() => localStorage),

      /**
       * Ce se salvează. `hasHydrated`, `isResponding` și `isSettingsOpen` descriu
       * momentul curent, nu datele utilizatorului: salvate, aplicația s-ar
       * redeschide crezând că un răspuns e încă în curs, cu butonul blocat pe
       * „stop”, și cu fereastra de preferințe deschisă peste conversație.
       */
      partialize: state => ({
        profile: state.profile,
        providerId: state.providerId,
        theme: state.theme,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId
      }),

      /**
       * `version` contează de pe acum: forma datelor se va schimba (F2 adaugă
       * câmpuri în profil, F3 în conversații). Fără versiune, o structură veche
       * rămasă în `localStorage` ar fi citită ca și cum ar fi nouă, iar
       * aplicația ar pica pe un câmp lipsă la prima deschidere după update.
       */
      version: 1,

      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      }
    }
  )
);
