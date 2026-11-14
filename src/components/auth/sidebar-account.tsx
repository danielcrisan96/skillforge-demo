"use client";

import { ChevronUp, LogIn, LogOut, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { useAuthConfig } from "@/components/auth/auth-config-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/useAppStore";
import { useHydrated } from "@/store/useHydrated";

// Partea de jos a sidebar-ului: cine folosește aplicația.
//
// Trei situații, trei componente — nu trei `if`-uri în aceeași componentă:
//
// 1. Autentificarea NU e configurată → rândul de dinainte (numele din profilul
//    local), exact ca înainte de pasul ăsta. Aici NU există `SessionProvider`.
// 2. Configurată, dar nu ești conectat → același rând, plus „Conectează-te".
// 3. Conectat → contul real: poza, numele și emailul de la furnizor, cu ieșire.
//
// Ramura 1 vs. 2/3 se face prin COMPONENTE: `SidebarAccount` citește doar
// contextul de configurație (sigur oriunde) și o montează pe `SessionAccount`, care
// cheamă `useSession`, NUMAI când providerul lui e în arbore. Un
// `if (configured) useSession()` ar încălca regulile hook-urilor; un `useSession()`
// chemat necondiționat ar arunca pe ramura fără provider.

/** Inițialele pentru avatar, când poza lipsește sau nu s-a încărcat încă. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SidebarAccount() {
  const { configured } = useAuthConfig();

  return <SidebarMenu>{configured ? <SessionAccount /> : <LocalProfileRow />}</SidebarMenu>;
}

/** Închide sidebar-ul pe mobil (acolo e un `Sheet` peste conținut) după o acțiune. */
function useCloseOnMobile() {
  const { setOpenMobile, isMobile } = useSidebar();
  return () => {
    if (isMobile) setOpenMobile(false);
  };
}

/**
 * Rândul de dinainte de autentificare: numele din profilul LOCAL, care deschide
 * preferințele. Nu spune nimic despre vreun cont — e doar cum vrei să ți se adreseze.
 */
function LocalProfileRow() {
  const profileName = useAppStore(state => state.profile.name);
  const setSettingsOpen = useAppStore(state => state.setSettingsOpen);
  const closeOnMobile = useCloseOnMobile();

  // Numele vine din starea salvată, deci nu se randează înainte ca ea să fie
  // citită — altfel serverul și browserul ar desena nume diferite (vezi `useHydrated`).
  const isHydrated = useHydrated();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        onClick={() => {
          setSettingsOpen(true);
          closeOnMobile();
        }}
      >
        <Avatar className="size-7">
          <AvatarFallback className="text-xs">{isHydrated ? initialsOf(profileName) : ""}</AvatarFallback>
        </Avatar>
        {isHydrated ? (
          <span className="flex-1 truncate text-left">{profileName}</span>
        ) : (
          <Skeleton className="h-4 flex-1" />
        )}
        <ChevronUp className="size-4 shrink-0" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** Montată DOAR sub `SessionProvider` — vezi comentariul de sus. */
function SessionAccount() {
  // `useSession` — varianta de CLIENT. Nu e aceeași funcție cu `auth()` de pe server
  // și nu sunt interschimbabile: hook-ul cere `/api/auth/session` și ține rezultatul
  // în context; `auth()` decriptează cookie-ul direct, pe server, și se AȘTEAPTĂ.
  // Ce arată hook-ul e doar pentru afișare — nicio decizie de acces nu se ia din el.
  const { data: session, status } = useSession();
  const setSettingsOpen = useAppStore(state => state.setSettingsOpen);
  const setSignInOpen = useAppStore(state => state.setSignInOpen);
  const closeOnMobile = useCloseOnMobile();

  if (status === "loading") {
    return (
      <SidebarMenuItem>
        <div className="flex h-12 items-center gap-2 px-2" aria-label="Se verifică sesiunea">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      </SidebarMenuItem>
    );
  }

  if (!session) {
    return (
      <>
        <SidebarMenuItem>
          {/* Iconiță NEUTRĂ, nu sigla GitHub: rândul duce la o ALEGERE, nu la un
              furnizor anume. Sigla furnizorului apare abia în fereastră. */}
          <SidebarMenuButton
            onClick={() => {
              setSignInOpen(true);
              closeOnMobile();
            }}
          >
            <LogIn />
            <span>Conectează-te</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <LocalProfileRow />
      </>
    );
  }

  const { name, email, image } = session.user;
  // Se afișează ce EXISTĂ. Numele poate lipsi (la GitHub cade pe login, dar nu se
  // presupune), emailul poate lipsi (ascuns în setările contului). Niciun `null` pe ecran.
  const displayName = name || email || "Cont conectat";

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="lg">
            <Avatar className="size-7">
              {/* Poza vine de la furnizor (ex. avatars.githubusercontent.com). `<img>`
                  simplu, prin Radix — nu `next/image`, deci nu cere `remotePatterns`
                  în `next.config.ts`. Până se încarcă (sau dacă eșuează), inițialele. */}
              {image && <AvatarImage src={image} alt="" referrerPolicy="no-referrer" />}
              <AvatarFallback className="text-xs">{initialsOf(displayName)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
              <span className="truncate">{displayName}</span>
              {email && email !== displayName && (
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              )}
            </span>
            <ChevronUp className="size-4 shrink-0" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width)">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {email ? `Conectat ca ${email}` : "Conectat — furnizorul nu ne-a trimis emailul"}
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => {
              setSettingsOpen(true);
              closeOnMobile();
            }}
          >
            <Settings />
            Preferințe
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* `signOut` șterge cookie-ul de sesiune pe server și reîncarcă pagina.
              Fără backend configurat, datele rămân în browser (n-ar avea de unde
              reveni). Cu backend, ele dispar din browser abia după reîncărcare, când
              `ServerSync` vede `unauthenticated` și golește store-ul cu
              sincronizarea deja oprită. NU se golesc aici, înainte de `signOut`:
              în clipa asta abonamentul la server e încă activ și ar trimite
              golirea ca ștergere în baza de date (vezi `server-sync.tsx`). */}
          <DropdownMenuItem onClick={() => void signOut({ redirectTo: "/" })}>
            <LogOut />
            Ieși din cont
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
