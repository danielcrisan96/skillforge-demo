"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Tipul răspunsului întors de /api/hello. Îl scriem explicit pentru că e primul
// contract care traversează granița client/server — exact locul unde, la pasul
// următor, va trece răspunsul agentului. `any` aici ar însemna că nimic nu ne
// mai avertizează când forma răspunsului se schimbă pe server.
type HelloResponse = {
  message: string;
  generatedAt: string;
  hasAnthropicKey: boolean;
};

// Componentul ăsta e client dintr-un singur motiv: trebuie să reacționeze la un
// click și să rețină ce a primit. Fetch-ul în sine ar fi putut fi făcut și pe
// server — dar atunci n-ar mai fi fost declanșat de utilizator.
//
// Aici se vede tiparul complet, în mic: browserul cere ceva de la o rută proprie,
// serverul face treaba care are nevoie de secrete, iar browserul primește doar
// rezultatul. Chatul cu agentul va urma exact același drum, cu diferența că
// răspunsul va veni în bucăți (streaming), nu dintr-odată.
export function HelloProbe() {
  const [response, setResponse] = useState<HelloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function callApi() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hello");
      if (!res.ok) {
        // Un răspuns cu status de eroare NU aruncă singur în `fetch` — trebuie
        // verificat explicit, altfel am afișa un obiect de eroare ca și cum ar fi
        // un rezultat valid.
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? `Serverul a răspuns cu ${res.status}.`);
      }
      setResponse((await res.json()) as HelloResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută.");
    } finally {
      // `finally`, nu o linie după `setResponse`: altfel, pe ramura de eroare
      // butonul ar rămâne blocat în „Se cere..." pentru totdeauna.
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={callApi} disabled={isLoading} className="w-fit">
        {isLoading ? "Se cere..." : "Cheamă /api/hello"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {response && (
        <div className="flex flex-col gap-1 rounded-lg border bg-muted/50 p-4 font-mono text-sm">
          <p>message: {response.message}</p>
          <p>generatedAt: {response.generatedAt}</p>
          <p>hasAnthropicKey: {String(response.hasAnthropicKey)}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Valoarea lui <code className="font-mono">message</code> vine din <code className="font-mono">.env.local</code>,
        citită pe server. Observă că răspunsul spune doar DACĂ există o cheie Anthropic, niciodată care e — un răspuns
        JSON se vede în tab-ul Network al oricui deschide aplicația.
      </p>
    </div>
  );
}
