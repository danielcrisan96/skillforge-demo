"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "@/components/chat/code-block";

// SINGURUL loc din aplicație care randează markdown venit de la model —
// oricare component care afișează un mesaj îl trece prin ACEST fișier, nu
// prin logica lui proprie. Vezi `message-item.tsx`.
//
// ⚠️ REGULA DE SECURITATE A PASULUI: textul modelului e conținut NECONTROLAT.
// Un `<img onerror=...>` scris de model — sau ajuns în el din documentul
// altcuiva, într-un pas ulterior cu RAG — devine XSS în clipa în care e
// randat ca HTML. De asta:
//   - NU se adaugă `rehype-raw` (pluginul care ar activa HTML brut în
//     markdown) — fără el, orice `<script>` sau `<img onerror>` scris de
//     model apare pe ecran ca TEXT, nu ca element.
//   - NU se folosește `dangerouslySetInnerHTML` nicăieri în acest fișier.
// `react-markdown` transformă markdown-ul într-un ARBORE, iar arborele în
// elemente React — nu într-un șir de HTML injectat. Diferența e exact ce ne
// protejează.

type MarkdownProps = {
  content: string;
};

/**
 * Component text simplu, cu clasele Tailwind aplicate direct pe element — nu
 * un plugin de tip „prose" (ar fi o dependență în plus, nesolicitată de acest
 * pas) și nu CSS scris de mână (D-13 interzice ambele). Fiecare tip de element
 * de markdown își are stilul lui, o singură dată, aici.
 */
const components: Components = {
  // `node` e destructurat și lăsat nefolosit doar ca să NU ajungă în
  // `...props`: e o structură internă a lui `react-markdown` (nodul din
  // arborele hast), nu un atribut HTML valid — spread pe element, ar pica
  // type-checking-ul.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  a: ({ node: _node, href, children, ...props }) => (
    // `target="_blank"` + `rel="noopener noreferrer"`: un link din răspunsul
    // modelului nu trebuie să poată controla fila din care a fost deschis
    // (`noopener`) și nici să afle de unde a venit vizitatorul (`noreferrer`).
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline" {...props}>
      {children}
    </a>
  ),
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  h1: ({ children }) => <h1 className="mt-4 mb-2 text-lg font-semibold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-4 mb-2 text-base font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 mb-1.5 text-sm font-semibold first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-muted-foreground/20" />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,

  // Tabelul are nevoie de un container cu scroll orizontal propriu — un tabel
  // lat într-un mesaj n-are voie să lărgească toată bula peste conversație.
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }) => <th className="border-b px-3 py-1.5 font-medium">{children}</th>,
  td: ({ children }) => <td className="border-b px-3 py-1.5 align-top">{children}</td>,

  // `pre` e „desfăcut": `CodeBlock`-ul randat din `code`, mai jos, își
  // construiește singur containerul (bordură, buton de copiere). Fără asta,
  // am avea un `<pre>` gol în jurul lui, cu propriul padding din browser.
  pre: ({ children }) => <>{children}</>,

  // Diferența bloc/inline nu vine dintr-un prop `inline` (react-markdown nu-l
  // mai trimite din versiunea 7) — vine din `className`: un fence cu limbaj
  // (```ts) produce `language-ts` pe elementul `code`; codul inline sau un
  // fence fără limbaj nu au acea clasă.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  code: ({ node: _node, className, children, ...props }) => {
    const match = /language-(\S+)/.exec(className ?? "");

    if (!match) {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]" {...props}>
          {children}
        </code>
      );
    }

    // `replace(/\n$/, "")` scoate rândul gol pe care remark îl lasă înainte
    // de fence-ul de închidere — fără el, highlighter-ul ar arăta o linie
    // goală suplimentară la finalul fiecărui bloc.
    return <CodeBlock language={match[1]} code={String(children).replace(/\n$/, "")} />;
  }
};

export function Markdown({ content }: MarkdownProps) {
  // Componentul e SINCRON (`Markdown`, nu `MarkdownHooks`/`MarkdownAsync`):
  // randează direct din `content`, la fiecare randare a mesajului care-l
  // conține — exact ce ne trebuie în streaming, unde `content` crește literă
  // cu literă. O variantă async ar introduce un `useEffect` și un cadru de
  // întârziere între token și randare.
  //
  // Markdown INCOMPLET (un fence nedeschis până la capăt, un tabel pe
  // jumătate) nu are voie să arunce aici — testat manual cu un răspuns lung
  // care conține blocuri de cod (cerința pasului). `remark`/`micromark` sunt
  // construite pentru text parțial: interpretează ce poate, restul rămâne text
  // simplu până vine restul fence-ului.
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
