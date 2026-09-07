"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Directiva "use client" de mai sus e singura diferență între fișierul ăsta și
// un component de server. Ce face concret: marchează granița de la care codul
// e TRIMIS ȘI CĂTRE BROWSER, ca să poată fi hidratat și să răspundă la click-uri.
//
// Ce s-ar întâmpla fără ea:
// în App Router, orice component e implicit component de SERVER. Codul de server
// rulează o singură dată, produce HTML și se termină — nu are cum să rețină
// starea între două randări și nu există niciun browser care să declanșeze
// re-randarea. De aceea `useState` (ca orice hook) nu are unde să existe acolo,
// iar Next oprește build-ul cu eroarea:
//
//   You're importing a component that needs `useState`. This React hook only
//   works in a client component. To fix, mark the file with the "use client"
//   directive.
//
// Nu e o restricție arbitrară: e diferența dintre „a fost calculat o dată, pe
// server" și „trăiește în pagină și reacționează la utilizator".
//
// Costul directivei: acest component ajunge în bundle-ul JavaScript descărcat de
// utilizator. De asta NU se pune „use client" în capul fiecărui fișier ca să fie
// sigur că merge — se pune cât mai jos în arbore, doar pe bucata care chiar are
// nevoie de interactivitate.
export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Component <strong className="text-foreground">client</strong> — rulează în browser
      </p>

      <p className="font-mono text-3xl tabular-nums">{count}</p>

      <div className="flex gap-2">
        {/* Butonul vine din shadcn (src/components/ui/button.tsx), nu scris de
            mână: de aici încolo orice element de UI se ia de acolo, ca stilurile
            și stările (focus, disabled) să fie aceleași peste tot. */}
        <Button onClick={() => setCount(c => c + 1)}>Adaugă 1</Button>
        <Button variant="outline" onClick={() => setCount(0)} disabled={count === 0}>
          Reset
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Numărul se schimbă fără ca pagina să se reîncarce: starea trăiește în browser.
      </p>
    </div>
  );
}
