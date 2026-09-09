"use client";

import { Copy, RotateCcw, Sparkles } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  /** Câte mesaje de DUPĂ acesta s-ar pierde dacă e reluat. 0 pe ultimul. */
  discardCount?: number;
};

export function MessageItem({ message, isBusy = false, onRetry, discardCount = 0 }: MessageItemProps) {
  const profileName = useAppStore(state => state.profile.name);
  const config = ROLE_CONFIG[message.role];

  // Textul se compune din `parts` — vezi `messageText` pentru de ce
  // `message.content` nu există și ce se întâmplă dacă îl scrii totuși.
  const text = messageText(message);

  // Vezi `useClipboardAvailable` pentru de ce verificarea nu e un simplu
  // `typeof navigator` calculat direct aici.
  const canCopy = useClipboardAvailable();

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

  const initials = message.role === "user" ? (profileName.trim()[0]?.toUpperCase() ?? "T") : null;

  // Reluarea apare doar pe răspunsurile asistentului — reluarea unui mesaj al
  // tău ar însemna să-l retrimiți nemodificat, ceea ce editarea mesajelor
  // (amânată) ar face relevant, nu reluarea.
  const showRetry = message.role === "assistant" && Boolean(onRetry);

  return (
    <div className={cn("flex w-full items-start gap-3", config.rowClassName)}>
      <Avatar className="mt-0.5 size-8 shrink-0">
        <AvatarFallback className="text-xs">{initials ?? <Sparkles className="size-4" />}</AvatarFallback>
      </Avatar>

      <div className={cn("flex max-w-[85%] flex-col gap-1", message.role === "user" ? "items-end" : "items-start")}>
        <span className="px-1 text-xs text-muted-foreground">{config.label}</span>

        {/* `group` ca butoanele de acțiune să apară la hover peste bulă, nu
            peste tot rândul — altfel ar clipi când treci mouse-ul prin dreptul
            ei. */}
        <div className={cn("group relative rounded-xl px-4 py-3", config.bubbleClassName)}>
          {/* `whitespace-pre-wrap` păstrează rândurile goale din text. Fără el,
              tot răspunsul s-ar lipi într-un singur paragraf. */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>

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
                        {discardCount === 1 ? "mesaj de după el" : "mesaje de după el"}, ca să se poată genera unul nou
                        în locul lor.
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
        </div>
      </div>
    </div>
  );
}
