"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { useAuthConfig } from "@/components/auth/auth-config-provider";
import { startServerSync } from "@/lib/server-sync";
import { useAppStore } from "@/store/useAppStore";

// Leagă datele din browser de contul conectat și pornește sincronizarea cu
// serverul (F6.2). Nu randează nimic: e montată doar ca să aibă un loc în arbore
// de unde să citească sesiunea, să golească sau să revendice datele locale și să
// pornească/oprească abonamentul din `src/lib/server-sync.ts`.
//
// Ramura prin componente separate, din același motiv ca în `sidebar-account.tsx`:
// `useSession` e legal doar sub `SessionProvider`, care se montează doar când
// autentificarea e configurată, iar un hook nu se poate chema condiționat.

export function ServerSync() {
  const { configured, persistenceAvailable } = useAuthConfig();

  // REGULA: `localStorage` aparține contului DOAR când există un server de pe care
  // datele pot reveni. Fără backend, golirea de la ieșirea din cont ar fi o ștergere
  // definitivă, nu o ascundere — deci fără persistență nu se montează nimic: nici
  // `claimLocalData`, nici `clearAccountData`, nici `startServerSync`. Aplicația se
  // poartă exact ca înainte de F6.2: datele sunt ale browserului.
  //
  // Asta acoperă și un `ownerUserId` rămas din perioada în care backend-ul era
  // configurat: nimic nu-l citește, deci datele etichetate cu el rămân neatinse.
  //
  // `configured` e verificat separat, deși `persistenceAvailable` îl implică (se
  // calculează cu `isAuthConfigured()`): `SessionServerSync` cheamă `useSession`,
  // care aruncă fără `SessionProvider`, iar providerul se montează pe `configured`.
  // Invariantul ăla se apără aici, nu se presupune din felul în care e compus celălalt câmp.
  return configured && persistenceAvailable ? <SessionServerSync /> : null;
}

/** Montată DOAR sub `SessionProvider`. */
function SessionServerSync() {
  // `useSession` e folosit aici doar ca SEMNAL, nu ca decizie de acces. Dacă ar
  // minți spre „conectat”, rutele tot ar răspunde `401`, fiindcă ele citesc
  // sesiunea pe server, cu `auth()`. Dacă ar minți spre „neconectat”, se pierde
  // doar copia din browser a unor date pe care serverul le păstrează.
  const { data: session, status } = useSession();
  const hasHydrated = useAppStore(state => state.hasHydrated);
  const claimLocalData = useAppStore(state => state.claimLocalData);
  const clearAccountData = useAppStore(state => state.clearAccountData);

  const userId = status === "authenticated" ? (session?.user.id ?? null) : null;

  useEffect(() => {
    // Se așteaptă rehidratarea: altfel am compara serverul cu starea inițială
    // (conversațiile mock), nu cu ce are omul de fapt în `localStorage` — și am
    // judeca `ownerUserId` înainte să fi fost citit de acolo.
    if (!hasHydrated) return;

    // GOLIREA E SIGURĂ DOAR DATORITĂ ORDINII DE MAI JOS. Nu o schimba fără să
    // citești asta.
    //
    // Abonamentul din `server-sync.ts` tratează orice conversație dispărută din
    // store ca ștergere și trimite `DELETE` la server. Store-ul golit cât timp
    // abonamentul ascultă ar însemna toate conversațiile omului șterse din baza
    // de date, deși voiam doar să le scoatem din browser. De aceea
    // `claimLocalData` și `clearAccountData` rulează numai cu sincronizarea OPRITĂ:
    //
    // 1. La conectare, `claimLocalData` rulează sincron, ÎNAINTE de
    //    `startServerSync()`, în același corp de efect. Abonamentul se creează abia
    //    după golire, deci n-o vede ca schimbare: pentru el, store-ul golit e
    //    punctul de pornire.
    // 2. La deconectare (sau la trecerea direct pe alt cont), `status`/`userId` se
    //    schimbă, iar React rulează ÎNTÂI cleanup-ul rulării precedente — funcția
    //    întoarsă de `startServerSync()`, care face `unsubscribe()` — și ABIA APOI
    //    corpul nou, cu golirea. E o garanție a lui React, nu noroc de timing:
    //    într-un commit, toate cleanup-urile efectelor (`useEffect`) care se
    //    re-rulează se execută înaintea tuturor corpurilor noi.
    // 3. După oprire, golirea nu mai poate declanșa nicio cerere: timer-ele de
    //    debounce sunt anulate, iar ce era în coadă nu mai pleacă (`stopped` în
    //    `enqueue`). O cerere deja pe drum se termină, dar e o salvare de dinainte,
    //    nu o ștergere provocată de golire.
    //
    // Din același motiv, golirea NU se face în butonul „Ieși din cont”: în clipa
    // aceea abonamentul e încă activ.

    if (status === "authenticated") {
      if (!userId) return;
      claimLocalData(userId);
      // Funcția întoarsă oprește sincronizarea: la deconectare, la schimbarea
      // contului, la demontare — și la a doua rulare a efectului din Strict Mode,
      // în dezvoltare.
      return startServerSync();
    }

    // `ownerUserId` se citește cu `getState()`, nu cu un selector pus în
    // dependențe: ca dependență, schimbarea făcută chiar de `claimLocalData` mai
    // sus ar re-rula efectul, iar sincronizarea abia pornită ar fi oprită și
    // repornită, cu prima citire de pe server aruncată.
    //
    // Datele FĂRĂ proprietar nu se ating: sunt ale cuiva care folosește aplicația
    // neconectat și vor fi urcate în contul cu care se conectează.
    //
    // Limitare a librăriei, asumată: clientul `next-auth` transformă ORICE eșec al
    // verificării sesiunii (fără rețea, server căzut) în „fără sesiune”, deci
    // `unauthenticated` poate însemna și „n-am putut verifica”. Golirea rămâne
    // sigură și atunci, pentru că sincronizarea e deja oprită: serverul păstrează
    // datele, iar la următoarea verificare reușită ele revin. Se pierde doar ce
    // n-a ajuns pe server.
    if (status === "unauthenticated" && useAppStore.getState().ownerUserId !== null) {
      clearAccountData();
    }

    // `status === "loading"`: încă nu se știe cine e. O golire aici ar șterge
    // datele la fiecare încărcare de pagină, înainte ca sesiunea să răspundă.
  }, [status, userId, hasHydrated, claimLocalData, clearAccountData]);

  return null;
}
