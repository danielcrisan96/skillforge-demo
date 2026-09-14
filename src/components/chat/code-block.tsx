"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
// Import DIRECT către build-ul „light" — nu din pachetul principal
// (`react-syntax-highlighter`), care re-exportă și variantele „grele"
// (`Prism`, `PrismAsync`) cu toate limbajele incluse. Importat de acolo, un
// bundler ar putea aduce tot ce e în același modul, nu doar ce folosim noi.
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";
import { toast } from "sonner";

import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { useClipboardAvailable } from "@/hooks/use-clipboard-available";

// Blocul de cod dintr-un răspuns, cu highlighting și buton de copiere.
//
// De ce e un component separat de `Markdown`: `Markdown` decide CE randează
// (structura documentului), pe când acesta decide CUM arată un bloc de cod
// anume — separarea ține fișierul care randează markdown-ul mic și lasă toată
// logica de highlighting/copiere într-un singur loc, testabil independent.

// Se înregistrează DOAR limbajele de care are nevoie aplicația. Bundle-ul
// complet de limbaje al lui `react-syntax-highlighter` (prin `refractor/all`)
// adaugă sute de KB pentru limbaje pe care chatul nu le arată niciodată — de
// asta se importă câte un fișier de limbaj, nu pachetul „all”.
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("python", python);

// Alias-urile pe care modelul le scrie de obicei în fence-uri (```ts, ```py,
// ```sh) și care nu sunt numele exacte sub care e înregistrat limbajul mai
// sus.
const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash"
};

const REGISTERED_LANGUAGES = new Set(["typescript", "tsx", "javascript", "json", "bash", "sql", "python"]);

type CodeBlockProps = {
  language: string | undefined;
  code: string;
};

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const canCopy = useClipboardAvailable();
  const { resolvedTheme } = useTheme();

  const normalized = language ? (LANGUAGE_ALIASES[language] ?? language) : undefined;
  // Un limbaj neînregistrat (sau markdown incomplet, cu fence-ul încă
  // neînchis, care ajunge aici cu un nume ciudat) NU trebuie să crape
  // randarea. `PrismLight` prinde singur eșecul de highlight și cade pe text
  // simplu (vezi `getCodeTree` din sursa bibliotecii) — dar transmitem
  // `undefined` explicit când limbajul nu e din cele șapte suportate, ca să
  // nu depindem de acel `catch` intern pentru cazul comun.
  const highlightLanguage = normalized && REGISTERED_LANGUAGES.has(normalized) ? normalized : undefined;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Cod copiat");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Nu am putut copia", { description: "Browserul a refuzat accesul la clipboard." });
    }
  };

  return (
    <div className="group/code relative my-2 overflow-hidden rounded-lg border text-xs">
      {canCopy && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          aria-label="Copiază codul"
          className="absolute top-1.5 right-1.5 z-10 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100"
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      )}

      <SyntaxHighlighter
        language={highlightLanguage}
        style={resolvedTheme === "dark" ? oneDark : oneLight}
        customStyle={{ margin: 0, padding: "0.75rem 1rem", background: "transparent", fontSize: "0.8rem" }}
        codeTagProps={{ className: "font-mono" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
