import { toast } from "sonner";

import { MOCK_CONVERSATIONS } from "@/lib/mock/conversations";
import type { Conversation, ServerConversation, ServerProfile } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

// Sincronizarea cu serverul (F6.2), partea de CLIENT: ține store-ul și backend-ul
// de persistență în acord, pentru un utilizator conectat.
//
// Store-ul rămâne ce era — arhiva din browser (D-19). Modulul ăsta doar o
// OGLINDEȘTE pe server: la conectare aduce ce e acolo, apoi urcă fiecare
// schimbare. De aceea nu are nicio acțiune a lui în store și nicio stare randată:
// se abonează la store din afară și vorbește cu rutele `/api/conversations` și
// `/api/profile`. Fără el (neconectat, sau backend neconfigurat), aplicația
// merge exact ca înainte.
//
// De ce se abonează la store în loc să fie chemat din fiecare acțiune: salvarea,
// redenumirea și ștergerea trec deja toate prin store. Un singur abonament le
// vede pe toate, inclusiv pe cele care vor fi adăugate; un apel pus de mână în
// fiecare acțiune ar fi uitat la prima acțiune nouă.

/** Conversațiile inventate cu care pornește un browser nou nu sunt ale nimănui și nu se urcă pe server. */
const MOCK_CONVERSATION_IDS = new Set(MOCK_CONVERSATIONS.map(conversation => conversation.id));

/**
 * Cât se așteaptă după ultima schimbare înainte de salvare. Conversațiile se
 * schimbă rar (o dată, la finalul unui răspuns), deci pauza e scurtă. Profilul se
 * schimbă la FIECARE tastă din formular, deci pauza e mai lungă: altfel fiecare
 * literă ar fi o cerere.
 */
const CONVERSATION_DEBOUNCE_MS = 400;
const PROFILE_DEBOUNCE_MS = 1200;

function shouldSync(conversation: Conversation): boolean {
  // O conversație fără mesaje e doar un titlu abia creat: n-are încă ce salva.
  return !MOCK_CONVERSATION_IDS.has(conversation.id) && conversation.messages.length > 0;
}

function conversationUrl(id: string): string {
  return `/api/conversations/${encodeURIComponent(id)}`;
}

/**
 * Pornește sincronizarea și întoarce funcția care o oprește.
 *
 * Se cheamă o singură dată pe utilizator conectat, după ce store-ul a fost
 * rehidratat din `localStorage` și după ce datele locale au fost legate de cont
 * cu `claimLocalData` (vezi `server-sync.tsx`).
 */
export function startServerSync(): () => void {
  /**
   * Versiunea fiecărei conversații, așa cum a spus-o ultima dată serverul.
   *
   * Stă AICI, în memorie, nu în store și nu în `localStorage`: e starea unei
   * sincronizări, nu o dată a utilizatorului. La refresh se reface din prima
   * citire de pe server, deci nu are de ce să fie persistată — iar persistată ar
   * fi putut rămâne în urmă față de server fără ca nimic s-o corecteze.
   */
  const versions = new Map<string, number>();

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let profileTimer: ReturnType<typeof setTimeout> | undefined;

  // Schimbările făcute cât timp prima citire de pe server e încă pe drum.
  const changedDuringPull = new Set<string>();
  const deletedDuringPull = new Set<string>();

  let ready = false;
  let stopped = false;
  let applyingRemote = false;

  // Cererile pleacă UNA CÂTE UNA, în ordine. Două salvări ale aceleiași conversații
  // pornite în paralel ar purta aceeași versiune, iar a doua ar primi `409` de la
  // propria noastră primă cerere — un conflict cu noi înșine.
  let queue: Promise<void> = Promise.resolve();
  function enqueue(task: () => Promise<void>) {
    queue = queue.then(() => (stopped ? undefined : task())).catch(() => notifyFailure());
  }

  function notifyFailure() {
    // Un singur toast, oricâte cereri ar pica: același `id` îl înlocuiește în loc să-l dubleze.
    toast.warning("Nu am putut salva pe server", {
      id: "server-sync-failure",
      description: "Schimbările rămân în acest browser. Se încearcă din nou la următoarea modificare."
    });
  }

  async function pushConversation(id: string) {
    // Se citește starea din clipa TRIMITERII, nu din clipa programării: dacă între
    // timp au mai venit mesaje, pleacă direct varianta cea mai nouă.
    const conversation = useAppStore.getState().conversations.find(c => c.id === id);
    if (!conversation || !shouldSync(conversation)) return;

    const response = await fetch(conversationUrl(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: conversation.title,
        createdAt: conversation.createdAt,
        version: versions.get(id),
        messages: conversation.messages
      })
    });

    if (response.ok) {
      const { version } = (await response.json()) as { version: number };
      versions.set(id, version);
      return;
    }

    if (response.status === 409) {
      // Altă fereastră (sau alt dispozitiv) a salvat aceeași conversație între timp.
      //
      // NU se reîncearcă cu versiunea nouă: asta ar scrie peste mesajele celeilalte
      // ferestre, adică exact pierderea de date pe care versiunea o împiedică. Și NU
      // se înlocuiește varianta de aici cu cea de pe server: omul tocmai a primit un
      // răspuns pe care l-ar vedea dispărând. Rămâne ce e pe ecran, cu un mesaj care
      // spune adevărul despre ce s-a salvat și ce nu.
      toast.warning(`„${conversation.title}” a fost schimbată în altă fereastră`, {
        id: `server-sync-conflict-${id}`,
        description:
          "Ce vezi aici rămâne în acest browser, dar nu s-a salvat pe server. Reîncarcă pagina ca să vezi varianta salvată."
      });
      return;
    }

    notifyFailure();
  }

  async function deleteConversation(id: string) {
    // Fără versiune cunoscută, conversația n-a ajuns niciodată pe server: nu e nimic de șters acolo.
    if (!versions.has(id)) return;
    versions.delete(id);

    const response = await fetch(conversationUrl(id), { method: "DELETE" });
    if (!response.ok) notifyFailure();
  }

  async function pushProfile() {
    // `userId` nu pleacă: proprietarul e cel din sesiune, stabilit pe server.
    const { name, stack, skills, goal } = useAppStore.getState().profile;
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stack, skills, goal } satisfies ServerProfile)
    });
    if (!response.ok) notifyFailure();
  }

  function scheduleConversation(id: string) {
    clearTimeout(timers.get(id));
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        enqueue(() => pushConversation(id));
      }, CONVERSATION_DEBOUNCE_MS)
    );
  }

  function scheduleProfile() {
    clearTimeout(profileTimer);
    profileTimer = setTimeout(() => enqueue(pushProfile), PROFILE_DEBOUNCE_MS);
  }

  // Abonamentul pornește ÎNAINTE de prima citire de pe server, nu după. Prima
  // citire poate dura (backend-ul pornește la rece în câteva secunde), iar omul
  // poate scrie între timp; schimbările lui se țin minte și se împacă la final.
  const unsubscribe = useAppStore.subscribe((state, previous) => {
    // Schimbările pe care le facem NOI, când aducem date de pe server, nu se urcă înapoi.
    if (applyingRemote) return;

    if (state.conversations !== previous.conversations) {
      const before = new Map(previous.conversations.map(c => [c.id, c]));

      for (const conversation of state.conversations) {
        // Comparație de REFERINȚĂ: store-ul creează un obiect nou doar pentru
        // conversația atinsă, deci „alt obiect” înseamnă „s-a schimbat”.
        if (before.get(conversation.id) !== conversation && shouldSync(conversation)) {
          if (ready) scheduleConversation(conversation.id);
          else changedDuringPull.add(conversation.id);
        }
        before.delete(conversation.id);
      }

      // Ce a rămas în `before` exista înainte și nu mai există: a fost șters.
      //
      // Abonamentul nu poate deosebi „omul a șters conversația” de „store-ul a
      // fost golit”: o golire cât timp ascultă ar pleca drept câte un `DELETE`
      // pentru fiecare conversație. De aceea golirea la ieșirea din cont se face
      // doar cu sincronizarea oprită — vezi `server-sync.tsx`.
      for (const id of before.keys()) {
        clearTimeout(timers.get(id));
        timers.delete(id);
        if (ready) enqueue(() => deleteConversation(id));
        else deletedDuringPull.add(id);
      }
    }

    if (ready && state.profile !== previous.profile) scheduleProfile();
  });

  async function pull() {
    const response = await fetch("/api/conversations");
    if (stopped) return;

    if (!response.ok) {
      // 401 și 503 sunt stări normale (neconectat, backend neconfigurat): aplicația
      // rămâne pe `localStorage`, fără niciun mesaj. Orice altceva înseamnă că
      // serverul ar fi trebuit să răspundă și n-a făcut-o — asta se spune.
      if (response.status !== 401 && response.status !== 503) {
        toast.warning("Conversațiile de pe server nu sunt disponibile acum", {
          id: "server-sync-failure",
          description: "Lucrezi cu ce e salvat în acest browser. Reîncarcă pagina ca să încerci din nou."
        });
      }
      unsubscribe();
      return;
    }

    const { conversations } = (await response.json()) as { conversations: ServerConversation[] };
    if (stopped) return;

    for (const conversation of conversations) versions.set(conversation.id, conversation.version);

    // Copia de pe server înlocuiește copia locală — CU DOUĂ EXCEPȚII, pentru ce a
    // făcut omul cât timp cererea era pe drum: o conversație în care tocmai a scris
    // rămâne cea de aici (și se urcă mai jos), iar una pe care tocmai a șters-o nu
    // se întoarce.
    const incoming = conversations
      .filter(c => !changedDuringPull.has(c.id) && !deletedDuringPull.has(c.id))
      .map(({ id, title, createdAt, messages }): Conversation => ({ id, title, createdAt, messages }));

    applyingRemote = true;
    try {
      useAppStore.getState().mergeServerConversations(incoming);
    } finally {
      applyingRemote = false;
    }

    const profileResponse = await fetch("/api/profile");
    if (stopped) return;
    if (profileResponse.ok) {
      const { profile } = (await profileResponse.json()) as { profile: ServerProfile | null };
      // `null` = nimic salvat încă pe server: rămâne profilul din browser, care se
      // urcă abia când omul îl schimbă. Un profil neatins nu se salvează singur.
      if (profile) {
        applyingRemote = true;
        try {
          const { profile: local, setProfile } = useAppStore.getState();
          setProfile({ ...profile, userId: local.userId });
        } finally {
          applyingRemote = false;
        }
      }
    }

    ready = true;

    for (const id of deletedDuringPull) enqueue(() => deleteConversation(id));

    // Ce există doar aici se urcă acum: conversațiile purtate înainte de prima
    // conectare (migrarea din `localStorage`) și cele schimbate în timpul citirii.
    for (const conversation of useAppStore.getState().conversations) {
      if (shouldSync(conversation) && (!versions.has(conversation.id) || changedDuringPull.has(conversation.id))) {
        enqueue(() => pushConversation(conversation.id));
      }
    }
  }

  void pull().catch(() => {
    if (!stopped) notifyFailure();
    unsubscribe();
  });

  return () => {
    stopped = true;
    unsubscribe();
    for (const timer of timers.values()) clearTimeout(timer);
    clearTimeout(profileTimer);
  };
}
