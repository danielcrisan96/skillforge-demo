"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { describeAuthError } from "@/lib/auth-errors";

// Mesajul pentru un `?error=` venit din fluxul de autentificare.
//
// Utilizatorul rămâne ÎN aplicație: anularea la furnizor sau un eșec al librăriei
// se termină pe „/", cu un mesaj în română, nu pe o pagină de eroare în engleză.
// Textul vine din `describeAuthError` — singurul loc care traduce coduri; componenta
// doar îl arată.

export function AuthErrorNotice({ code }: { code: string | null }) {
  useEffect(() => {
    if (!code) return;

    const { tone, title, description } = describeAuthError(code);
    // `id` fix: în dezvoltare, React Strict Mode rulează efectele de două ori; cu același
    // id, sonner înlocuiește toast-ul în loc să-l dubleze.
    const show = tone === "info" ? toast.info : toast.error;
    show(title, { id: "auth-error", description, duration: 8000 });

    // ⚠️ Parametrul se ȘTERGE din URL imediat după afișare, din două motive:
    // - un refresh nu trebuie să reafișeze o eroare veche;
    // - un link copiat din bara de adrese nu trebuie să-i arate unui coleg un eșec
    //   care nu i s-a întâmplat lui.
    //
    // `history.replaceState`, nu `router.replace`: nu e nevoie de o navigare (care ar
    // cere din nou pagina de la server) — doar de o adresă curată. Next 16 ține
    // `useSearchParams` în sinc cu `replaceState`, deci nu se desincronizează nimic.
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [code]);

  return null;
}
