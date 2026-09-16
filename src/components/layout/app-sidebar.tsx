"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SidebarAccount } from "@/components/auth/sidebar-account";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { useAppStore } from "@/store/useAppStore";
import { useHydrated } from "@/store/useHydrated";

// Zona din stânga: singurul loc de unde se navighează.
//
// De ce are exact trei lucruri (buton nou, listă, utilizator) și nimic altceva:
// aplicația face UN lucru — te ajută să ajungi la un obiectiv de carieră. Fiecare
// intrare în plus în sidebar ar sugera că mai există și altceva de făcut și ar
// muta atenția de la conversație, care e produsul.

export function AppSidebar() {
  const conversations = useAppStore(state => state.conversations);
  const activeConversationId = useAppStore(state => state.activeConversationId);
  const createConversation = useAppStore(state => state.createConversation);
  const selectConversation = useAppStore(state => state.selectConversation);
  const renameConversation = useAppStore(state => state.renameConversation);
  const deleteConversation = useAppStore(state => state.deleteConversation);

  const { setOpenMobile, isMobile } = useSidebar();

  // Lista și numele vin din starea salvată, deci nu au voie să fie randate
  // înainte ca ea să fie citită — altfel serverul ar trimite conversațiile
  // implicite, browserul le-ar înlocui pe ale utilizatorului, iar React ar
  // raporta o nepotrivire de hidratare. Vezi `useHydrated`.
  const isHydrated = useHydrated();

  // Ce conversație e în curs de redenumire. Local, pentru că e o stare de
  // interacțiune de câteva secunde — nu are ce căuta în datele salvate.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fără focus automat, utilizatorul ar trebui să dea încă un click în câmpul
    // care tocmai a apărut ca răspuns la acțiunea lui.
    if (renamingId) renameInputRef.current?.select();
  }, [renamingId]);

  /**
   * Pe mobil, sidebar-ul e un `Sheet` peste conținut. Dacă nu l-am închide după
   * alegerea unei conversații, utilizatorul ar rămâne cu panoul deschis peste
   * exact lucrul pe care tocmai l-a cerut.
   */
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setDraftTitle(currentTitle);
  };

  const commitRename = () => {
    if (renamingId) renameConversation(renamingId, draftTitle);
    setRenamingId(null);
  };

  const handleDelete = (id: string, title: string) => {
    deleteConversation(id);
    // Confirmarea contează pentru că ștergerea e ireversibilă în faza asta:
    // fără un semn că s-a întâmplat, rândul dispare și rămâne îndoiala.
    toast.success("Conversație ștearsă", { description: title });
  };

  return (
    <Sidebar>
      {/* SUS: un singur buton. */}
      <SidebarHeader className="p-3">
        <Button
          className="w-full justify-start"
          size="lg"
          onClick={() => {
            createConversation();
            closeOnMobile();
          }}
        >
          <Plus />
          Conversație nouă
        </Button>
      </SidebarHeader>

      {/* LA MIJLOC: lista de conversații. */}
      <SidebarContent>
        <SidebarGroup className="min-h-0 flex-1">
          <SidebarGroupLabel>Conversații</SidebarGroupLabel>

          <SidebarGroupContent className="min-h-0 flex-1">
            {/* `ScrollArea` derulează DOAR lista. Butonul de sus și rândul de
                utilizator de jos rămân mereu la vedere, oricât de lungă devine. */}
            <ScrollArea className="h-full">
              <SidebarMenu className="pr-1">
                {/* Lățimi FIXE, scrise de noi.
                    `SidebarMenuSkeleton` din shadcn ar fi fost varianta
                    evidentă, dar își alege lățimea cu `Math.random()`: serverul
                    ar nimeri un procent, browserul altul, iar React ar raporta
                    o nepotrivire de hidratare — exact ce încearcă să prevină
                    poarta de mai sus. Lățimi diferite între rânduri, ca să arate
                    a listă, dar aceleași la fiecare randare. */}
                {!isHydrated &&
                  ["w-3/4", "w-1/2", "w-2/3"].map(width => (
                    <SidebarMenuItem key={width}>
                      <div className="flex h-8 items-center px-2">
                        <Skeleton className={`h-4 ${width}`} />
                      </div>
                    </SidebarMenuItem>
                  ))}

                {isHydrated && conversations.length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    Nicio conversație încă. Începe una cu butonul de sus.
                  </p>
                )}

                {isHydrated &&
                  conversations.map(conversation => {
                    const isRenaming = conversation.id === renamingId;

                    if (isRenaming) {
                      return (
                        <SidebarMenuItem key={conversation.id}>
                          <SidebarInput
                            ref={renameInputRef}
                            value={draftTitle}
                            onChange={event => setDraftTitle(event.target.value)}
                            onBlur={commitRename}
                            onKeyDown={event => {
                              // Enter salvează, Escape renunță — convențiile pe
                              // care oricine le încearcă din reflex.
                              if (event.key === "Enter") commitRename();
                              if (event.key === "Escape") setRenamingId(null);
                            }}
                          />
                        </SidebarMenuItem>
                      );
                    }

                    return (
                      <SidebarMenuItem key={conversation.id}>
                        <SidebarMenuButton
                          isActive={conversation.id === activeConversationId}
                          onClick={() => {
                            selectConversation(conversation.id);
                            closeOnMobile();
                          }}
                        >
                          <span className="truncate">{conversation.title}</span>
                        </SidebarMenuButton>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {/* `showOnHover` ascunde butonul până e nevoie de el,
                              ca lista să rămână citibilă. Rămâne accesibil cu
                              tastatura, pentru că focus-ul îl face vizibil. */}
                            <SidebarMenuAction showOnHover aria-label={`Acțiuni pentru ${conversation.title}`}>
                              <MoreHorizontal />
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuItem onClick={() => startRename(conversation.id, conversation.title)}>
                              <Pencil />
                              Redenumește
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDelete(conversation.id, conversation.title)}
                            >
                              <Trash2 />
                              Șterge
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* JOS: utilizatorul. Fără autentificare configurată, rândul e cel de dinainte
          (numele din profil, click → preferințe); cu ea, contul real sau butonul de
          conectare. Ramificarea stă în `SidebarAccount`, nu aici — vezi acolo de ce
          trebuie făcută prin componente separate. */}
      <SidebarFooter className="p-2">
        <SidebarAccount />
      </SidebarFooter>
    </Sidebar>
  );
}
