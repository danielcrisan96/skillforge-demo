"use client";

import { useState } from "react";
import { Check, Copy, Pencil, RotateCcw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Markdown } from "@/components/chat/markdown";
import { useClipboardAvailable } from "@/hooks/use-clipboard-available";
import { cn } from "@/lib/utils";
import { messageText } from "@/lib/message-text";
import { useAppStore } from "@/store/useAppStore";
import type { UIMessage } from "ai";

// Un mesaj din conversație.
//
// De ce cele două roluri arată diferit și sunt aliniate pe părți opuse: într-un
// perete de text, cel mai greu lucru e să vezi unde s-a terminat întrebarea ta
// și unde începe răspunsul. Alinierea rezolvă asta dintr-o privire, fără să fie
// nevoie să citești.

type RoleConfig = {
  label: string;
  /** Alinierea întregului rând. */
  rowClassName: string;
  /** Aspectul bulei. */
  bubbleClassName: string;
};

/**
 * Registru pe rol, în loc de `role === "user" ? ... : ...` repetat în cinci
 * locuri din randare. Când în F5 apare un al treilea rol (rezultatul unei
 * unelte), se adaugă o intrare aici, nu încă o ramură în fiecare condiție.
 *
 * Cheia e `UIMessage["role"]`, deci include și „system". Rolul ăsta nu e produs
 * de interfața noastră (promptul de sistem se construiește pe server, din F2),
 * dar tipul îl permite — iar `Record` ne obligă să spunem cum arată, în loc să
 * pice randarea pe un `undefined` dacă apare vreodată.
 */
const ROLE_CONFIG: Record<UIMessage["role"], RoleConfig> = {
  user: {
    label: "Tu",
    rowClassName: "flex-row-reverse",
    bubbleClassName: "bg-primary text-primary-foreground"
  },
  assistant: {
    label: "SkillForge",
    rowClassName: "flex-row",
    bubbleClassName: "bg-muted"
  },
  system: {
    label: "Sistem",
    rowClassName: "flex-row",
    bubbleClassName: "bg-muted"
  }
};

type MessageItemProps = {
  message: UIMessage;
  isBusy?: boolean;
  onRetry?: (messageId: string) => void;
  /**
   * Editează acest mesaj (numai al utilizatorului) și retrimite. Absent pe
   * ecranele fără chat activ, la fel ca `onRetry`.
   */
  onEdit?: (messageId: string, text: string) => void;
  /** Câte mesaje de DUPĂ acesta s-ar pierde dacă e reluat. 0 pe ultimul. */
  discardCount?: number;
};

export function MessageItem({ message, isBusy = false, onRetry, onEdit, discardCount = 0 }: MessageItemProps) {
  const profileName = useAppStore(state => state.profile.name);
  const config = ROLE_CONFIG[message.role];

  // Textul se compune din `parts` — vezi `messageText` pentru de ce
  // `message.content` nu există și ce se întâmplă dacă îl scrii totuși.
  const text = messageText(message);

  // Vezi `useClipboardAvailable` pentru de ce verificarea nu e un simplu
  // `typeof navigator` calculat direct aici.
  const canCopy = useClipboardAvailable();

  // Editarea e stare LOCALĂ, a acestui rând — nu a conversației. Cât timp
  // `isEditing` e adevărat, textarea-ul e sursa de adevăr pentru câmp, nu
  // mesajul din `useChat`; mesajul se schimbă abia la „Salvează".
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(text);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mesaj copiat");
    } catch {
      // Ajunge aici și dacă browserul refuză permisiunea, nu doar dacă API-ul
      // lipsește (cazul ăla e deja acoperit de `canCopy`).
      toast.error("Nu am putut copia", { description: "Browserul a refuzat accesul la clipboard." });
    }
  };

  const handleRetry = () => onRetry?.(message.id);

  const handleStartEdit = () => {
    setEditValue(text);
    setIsEditing(true);
  };

  const handleCancelEdit = () => setIsEditing(false);

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    // Rândul acesta dispare imediat ce părintele taie lista de mesaje de aici
    // în jos și retrimite — nu mai are sens să închidem manual `isEditing`.
    onEdit?.(message.id, trimmed);
  };

  const initials = message.role === "user" ? (profileName.trim()[0]?.toUpperCase() ?? "T") : null;

  // Reluarea apare doar pe răspunsurile asistentului — reluarea unui mesaj al
  // tău ar însemna să-l retrimiți nemodificat, ceea ce editarea de-acum face
  // relevant altfel: modificat, nu identic.
  const showRetry = message.role === "assistant" && Boolean(onRetry);

  // Editarea apare doar pe mesajele UTILIZATORULUI — un răspuns al modelului
  // nu se editează, se reia (`showRetry`, mai sus). Dezactivată cât timp
  // curge un răspuns (`isBusy`): altfel s-ar retrimite peste un stream activ,
  // iar rezultatul ar depinde de care din cele două cereri termină prima.
  const showEdit = message.role === "user" && Boolean(onEdit);

  return (
    <div className={cn("flex w-full items-start gap-3", config.rowClassName)}>
      <Avatar className="mt-0.5 size-8 shrink-0">
        <AvatarFallback className="text-xs">{initials ?? <Sparkles className="size-4" />}</AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex flex-col gap-1",
          isEditing ? "w-full max-w-[85%]" : "max-w-[85%]",
          message.role === "user" ? "items-end" : "items-start"
        )}
      >
        <span className="px-1 text-xs text-muted-foreground">{config.label}</span>

        {/* `group` ca butoanele de acțiune să apară la hover peste bulă, nu
            peste tot rândul — altfel ar clipi când treci mouse-ul prin dreptul
            ei. */}
        <div className={cn("group relative w-full rounded-xl px-4 py-3", config.bubbleClassName)}>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={editValue}
                onChange={event => setEditValue(event.target.value)}
                onKeyDown={event => {
                  // Aceeași convenție ca la composer: Enter trimite, Shift+Enter
                  // trece pe rând nou.
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    handleSaveEdit();
                  }
                  if (event.key === "Escape") handleCancelEdit();
                }}
                autoFocus
                rows={2}
                // `bg-transparent` și fără bordură vizibilă: textarea-ul stă ÎN
                // bulă, nu într-o cutie separată peste ea. Border-ul e cel al
                // culorii de text a bulei, foarte transparent — vizibil cât să
                // marcheze zona editabilă, fără să pară un al doilea element.
                className="max-h-[200px] min-h-[60px] resize-none border-primary-foreground/25 bg-transparent px-2.5 py-2 text-sm shadow-none focus-visible:ring-primary-foreground/30"
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCancelEdit}
                  aria-label="Renunță la editare"
                >
                  <X />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  onClick={handleSaveEdit}
                  disabled={!editValue.trim()}
                  aria-label="Salvează și retrimite"
                >
                  <Check />
                </Button>
              </div>
            </div>
          ) : (
            // Markdown, printr-un SINGUR component reutilizat de orice mesaj —
            // vezi `markdown.tsx` pentru regula de securitate (fără HTML brut).
            <div className="text-sm">
              <Markdown content={text} />
            </div>
          )}

          {!isEditing && (
            <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              {showRetry &&
                (discardCount > 0 ? (
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={isBusy}
                            aria-label="Reia răspunsul"
                          >
                            <RotateCcw />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Reia</TooltipContent>
                    </Tooltip>

                    {/* Reluarea unui răspuns mai vechi taie și tot ce a urmat
                        după el — nu doar acest răspuns. E mai mult decât pierde
                        reluarea de pe ultimul mesaj, de asta cere confirmare. */}
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reiei acest răspuns?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se șterge acest răspuns și celelalte {discardCount}{" "}
                          {discardCount === 1 ? "mesaj de după el" : "mesaje de după el"}, ca să se poată genera unul
                          nou în locul lor.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Renunță</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRetry}>Reia</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* Ultimul răspuns: reluarea îl ÎNLOCUIEȘTE direct, fără
                          confirmare — vizibil pentru că bula dispare și indicatorul
                          „scrie…" apare exact în locul ei, nu sub un al doilea
                          răspuns. */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={isBusy}
                        onClick={handleRetry}
                        aria-label="Reia răspunsul"
                      >
                        <RotateCcw />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reia</TooltipContent>
                  </Tooltip>
                ))}

              {showEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={isBusy}
                      onClick={handleStartEdit}
                      aria-label="Editează mesajul"
                    >
                      <Pencil />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isBusy ? "Oprește răspunsul ca să editezi" : "Editează"}</TooltipContent>
                </Tooltip>
              )}

              {canCopy && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={handleCopy}
                      aria-label="Copiază mesajul"
                    >
                      <Copy />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiază</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
