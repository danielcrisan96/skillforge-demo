"use client";

import { useEffect, useState } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// Partea de client a primului stream din proiect.
//
// De ce merită citit stream-ul de mână, când există biblioteci care fac asta:
// pentru că exact codul de mai jos e ce ascund ele. La pasul următor, când
// sursa devine un model de limbaj, fișierul ăsta rămâne aproape neschimbat —
// protocolul e același. Cine a scris o dată bucla de citire nu mai are de-a face
// cu o cutie neagră când ceva nu merge.

type Status = "streaming" | "done" | "error";

export function AboutForm() {
  const [text, setText] = useState("");

  // Pornim direct pe „streaming", nu pe un „idle" inexistent: efectul rulează la
  // montare, deci în momentul în care componentul apare pe ecran cererea e deja
  // pe drum. O stare „idle" ar fi o minciună de câteva milisecunde.
  const [status, setStatus] = useState<Status>("streaming");

  // Contorul care redeclanșează efectul. Butonul „Reia" nu cheamă direct
  // funcția de citire — îl incrementează pe ăsta, iar efectul repornește
  // singur. Așa există o singură cale prin care începe o cerere, în loc de două
  // (una la montare, alta la click) care ar trebui ținute în sinc.
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    // `AbortController` e motivul pentru care închiderea ferestrei de preferințe
    // în timpul streamului nu produce nimic urât. Fără el, cererea ar continua,
    // iar la primirea bucății următoare am scrie state într-un component deja
    // demontat — plus o conexiune ținută deschisă degeaba.
    const controller = new AbortController();
    const { signal } = controller;

    async function readStream() {
      try {
        const response = await fetch("/api/about", { signal });

        if (!response.ok || !response.body) {
          throw new Error(`Serverul a răspuns cu ${response.status}.`);
        }

        // Fără SDK: `getReader()` dă acces direct la bucățile de rețea, exact
        // cum vin ele.
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Tamponul pentru evenimente incomplete. Vezi mai jos de ce e necesar.
        let buffer = "";
        let finished = false;

        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;

          // CAPCANA 1: `{ stream: true }`.
          //
          // O bucată de rețea se termină unde vrea rețeaua, nu unde se termină
          // un caracter. În UTF-8, „ă", „ș" și „ț" ocupă doi octeți — deci o
          // bucată poate conține primul octet, iar următoarea pe al doilea.
          // Fără `stream: true`, decoderul ar trata fiecare bucată separat, ar
          // găsi un octet orfan la capăt și l-ar înlocui cu „<?>". Cu el, ține
          // minte octeții incompleți pentru apelul următor.
          buffer += decoder.decode(value, { stream: true });

          // CAPCANA 2: o bucată de rețea NU e un eveniment SSE.
          //
          // Poate conține trei evenimente, sau jumătate dintr-unul. Singurul
          // lucru sigur e separatorul `\n\n`. Tăiem după el, iar ULTIMA bucată
          // — care e fie goală, fie un eveniment început și neterminat — o
          // lăsăm în tampon pentru runda următoare.
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;

            const payload = line.slice("data:".length).trim();

            if (payload === "[DONE]") {
              setStatus("done");
              finished = true;
              break;
            }

            // `JSON.parse`, pereche cu `JSON.stringify` de pe server: aduce
            // înapoi liniile noi din text, care altfel ar fi rupt protocolul.
            setText(previous => previous + (JSON.parse(payload) as string));
          }
        }

        // Dacă stream-ul s-a închis fără `[DONE]`, tot am terminat — dar pe altă
        // cale decât cea normală.
        if (!finished) setStatus("done");
      } catch (error) {
        // Anularea NU e o eroare: e ce am cerut noi în funcția de cleanup.
        // Tratată ca eroare, utilizatorul ar vedea un mesaj roșu de fiecare
        // dată când închide fereastra în timpul streamului.
        if (signal.aborted) return;

        console.error("Stream /api/about a eșuat:", error);
        setStatus("error");
      }
    }

    void readStream();

    return () => controller.abort();
  }, [runId]);

  const restart = () => {
    setText("");
    setStatus("streaming");
    setRunId(previous => previous + 1);
  };

  return (
    // `min-h-0` (prima dată): un item flex are implicit `min-height: auto`, deci
    // refuză să coboare sub înălțimea conținutului său. Fără el, un text lung ar
    // împinge secțiunea, secțiunea ar împinge panoul, iar bara de jos ar ieși
    // sub marginea ferestrei.
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h3 className="text-base font-medium">Despre aplicație</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Textul de mai jos nu e scris în interfață. Vine de pe server, bucată cu bucată — același drum pe care va veni
          răspunsul agentului.
        </p>
      </div>

      {/* `min-h-0` (a doua oară) + `flex-1` + `overflow-y-auto`: cutia crește cât
          are loc în panou și, când textul depășește, derulează ÎN INTERIOR. Fără
          `min-h-0` ar crește la infinit și ar împinge tot ce urmează. */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border p-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {text}
          {/* Cursorul care clipește face vizibilă diferența dintre „încă vine"
              și „s-a terminat". Fără el, o pauză mai lungă între bucăți arată
              identic cu un răspuns încheiat. */}
          {status === "streaming" && <span className="animate-pulse">▍</span>}
        </p>
      </div>

      {status === "error" && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Stream-ul s-a întrerupt</AlertTitle>
          <AlertDescription>
            Textul primit până acum rămâne pe ecran. Apasă „Reia” ca să încerci din nou.
          </AlertDescription>
        </Alert>
      )}

      {/* `mt-auto` împinge bara în spațiul liber rămas, dacă rămâne vreunul.
          Cutia de sus e `flex-1`, deci de obicei nu rămâne — dar așa bara stă la
          bază și dacă textul e scurt, nu doar când e lung. */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
        <span className="text-xs text-muted-foreground">
          Sursa: <code className="font-mono">GET /api/about</code>
        </span>

        <Button variant="outline" size="sm" onClick={restart} disabled={status === "streaming"}>
          <RotateCcw />
          Reia
        </Button>
      </div>
    </div>
  );
}
