"use client";

import { useEffect, useRef } from "react";
import { Plus, Send, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PROVIDERS } from "@/lib/providers";
import { useAppStore } from "@/store/useAppStore";

// Composer-ul: cutia din care pleacă mesajele.
//
// De ce e o cutie cu bordură care conține și butoanele, în loc de un input cu
// butoane lângă el: tot ce ține de „mesajul pe care îl compun acum" stă înăuntru,
// iar restul ecranului rămâne al conversației. Utilizatorul vede o singură
// zonă activă, nu trei controale care se plimbă.

/** Peste atâția pixeli, textarea nu mai crește și începe să deruleze. */
const MAX_TEXTAREA_HEIGHT_PX = 200;

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /**
   * Modelul lucrează: cererea a plecat sau răspunsul curge.
   *
   * Vine ca prop, derivat din `status`-ul lui `useChat`, în loc să fie citit din
   * store. Store-ul nu mai știe nimic despre răspunsul în curs — și e bine așa:
   * ar fi fost a doua sursă de adevăr pentru ceva ce hook-ul știe deja exact.
   */
  isBusy: boolean;
  /** Oprește generarea. E chiar `stop` de la `useChat`. */
  onStop: () => void;
};

export function ChatInput({ value, onChange, onSubmit, isBusy, onStop }: ChatInputProps) {
  const providerId = useAppStore(state => state.providerId);

  const provider = PROVIDERS[providerId];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Creșterea odată cu textul se face aici, nu din CSS: `rows` e fix, iar
  // `field-sizing: content` încă nu e peste tot. Resetăm întâi înălțimea, altfel
  // `scrollHeight` ar rămâne blocat la valoarea maximă atinsă și cutia n-ar mai
  // scădea niciodată când ștergi text.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [value]);

  // Focus înapoi în casetă după trimitere.
  //
  // Fără asta, după Enter focusul rămâne pe textarea doar din întâmplare, iar
  // după un click pe butonul de trimitere ajunge pe buton — deci al doilea mesaj
  // s-ar scrie nicăieri. Se face la ieșirea din starea „ocupat", adică fix când
  // utilizatorul poate scrie din nou.
  useEffect(() => {
    if (!isBusy) textareaRef.current?.focus();
  }, [isBusy]);

  const canSend = value.trim().length > 0 && !isBusy;

  return (
    <div className="rounded-xl border bg-background transition-colors focus-within:border-ring">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          // Enter trimite, Shift+Enter trece pe rând nou.
          //
          // De ce nu invers: majoritatea mesajelor au o singură linie, deci
          // varianta scurtă merită să fie cea folosită des. `isComposing` e
          // verificat pentru că, la tastaturile care compun caractere, Enter
          // confirmă caracterul — fără verificare, mesajul ar pleca la mijlocul
          // unui cuvânt.
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        rows={1}
        placeholder="Întreabă ceva despre planul tău..."
        className="max-h-[200px] min-h-0 resize-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />

      {/* Rândul de jos, ÎN interiorul cutiei. */}
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Loc rezervat pentru atașamente (Modul 6). E dezactivat, nu ascuns:
                așa forma finală a barei e vizibilă de pe acum și nu se mută
                butoanele sub degetele utilizatorului când funcția apare. */}
            <Button type="button" variant="ghost" size="icon" disabled aria-label="Atașează un fișier">
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Atașamentele vin într-un modul următor</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2">
          {/* Providerul e afișat permanent, ca să nu existe dubiu despre cine ar
              răspunde. Se schimbă din preferințe. */}
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {provider.label} · <span className="font-mono">{provider.modelLabel}</span>
          </span>

          {/* Un singur buton care își schimbă rolul, nu două alăturate: cât
              timp modelul scrie, singura acțiune care are sens e oprirea. */}
          {isBusy ? (
            <Button type="button" size="icon" variant="secondary" onClick={onStop} aria-label="Oprește răspunsul">
              <Square />
            </Button>
          ) : (
            <Button type="button" size="icon" onClick={onSubmit} disabled={!canSend} aria-label="Trimite mesajul">
              <Send />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
