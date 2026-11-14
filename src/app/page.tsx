import Link from "next/link";
import { connection } from "next/server";

import { AuthConfigProvider } from "@/components/auth/auth-config-provider";
import { AuthErrorNotice } from "@/components/auth/auth-error-notice";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Chat } from "@/components/chat/chat";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { ServerSync } from "@/components/sync/server-sync";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAuthAvailability } from "@/lib/auth";
import { isPersistenceAvailable } from "@/lib/backend.server";
import type { AuthConfig } from "@/lib/types";

// Ruta „/" — singurul ecran al aplicației.
//
// De ce o singură rută, deși există sidebar, conversații și preferințe: nimic
// din ce se schimbă aici nu merită o adresă separată. Conversația activă și
// fereastra de preferințe sunt stări ale aceleiași aplicații, nu locuri
// diferite. O rută pe conversație ar aduce, în schimb, o problemă reală:
// remontarea layout-ului la fiecare comutare.
//
// Fișierul rămâne component de SERVER — nu are nevoie de hooks. Trimite mai
// departe către componente de client doar acolo unde chiar e nevoie de
// interactivitate. Așa, JavaScript-ul livrat browserului e cât trebuie, nu tot.
//
// De la pasul de autentificare, faptul că e component de server contează direct:
// aici se poate citi `process.env` ca să aflăm dacă autentificarea e configurată —
// răspuns pe care browserul nu-l are cum afla singur.
export default async function Home({ searchParams }: PageProps<"/">) {
  // ⚠️ `connection()` face pagina DINAMICĂ: randată la fiecare cerere, nu o dată, la
  // build. Fără el, Next ar pre-randa „/" în timpul lui `next build`, iar
  // `getAuthAvailability()` ar citi variabilele de mediu ale MAȘINII DE BUILD — un
  // build făcut fără `.env.local` ar îngheța „neconfigurat" în HTML, chiar dacă
  // serverul care rulează are toate variabilele.
  await connection();
  const authAvailability = getAuthAvailability();
  // Același motiv pentru `connection()`: verdictul despre backend trebuie să fie al
  // serverului care rulează. Înghețat la build ca „configurat”, un deploy fără
  // variabilele backend-ului ar goli `localStorage` la ieșirea din cont fără nicio
  // copie pe server. Verdictul, nu variabila: nimic `NEXT_PUBLIC_*` (vezi AGENTS.md).
  const authConfig: AuthConfig = { ...authAvailability, persistenceAvailable: isPersistenceAvailable() };

  // `?error=<cod>` — pus de ruta de autentificare (anulare la furnizor) sau de
  // librărie (`pages.error`). Doar un șir sau nimic; o listă (`?error=a&error=b`)
  // e o cerere fabricată și se ignoră.
  const { error } = await searchParams;
  const authErrorCode = typeof error === "string" ? error : null;

  return (
    // Configurația de autentificare, deasupra a tot ce o citește: sidebar-ul (rândul de
    // cont), preferințele (emailul din profil) și fereastra de login. Vezi
    // `auth-config-provider.tsx` pentru de ce e context și nu props.
    <AuthConfigProvider value={authConfig}>
      {/* `SidebarProvider` ține starea deschis/închis a sidebar-ului și decide
          singur, după lățimea ecranului, dacă îl randează fix sau într-un `Sheet`.
          De aici vine comportamentul responsive, fără cod separat pentru mobil. */}
      <SidebarProvider>
        <AppSidebar />

        {/* `SidebarInset` e zona din dreapta. `min-h-0` e necesar ca lista de
          mesaje să poată derula: fără el, containerul flex crește la înălțimea
          conținutului și pagina întreagă ajunge să se deruleze, cu tot cu
          composer. */}
        <SidebarInset className="flex min-h-0 flex-col">
          <AppHeader />
          <Chat />
        </SidebarInset>

        {/* Preferințele se randează AICI, la nivel de pagină, deși se deschid din
          sidebar. Pe mobil, sidebar-ul e un `Sheet`; un dialog randat înăuntrul
          lui ar ajunge cu două capcane de focus una în alta și s-ar închide odată
          cu panoul. */}
        <SettingsDialog />

        {/* Singura legătură din aplicație către „/demo". Nu contrazice decizia de
          mai sus (o singură rută pentru starea aplicației) — „/demo" nu e o
          stare a aplicației, e material de curs care arată structura de rutare
          înainte să existe conținut. Rămâne discretă intenționat: nu face parte
          din produs, doar din antierul lui. */}
        <Link
          href="/demo"
          className="fixed right-3 bottom-3 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          /demo
        </Link>

        {/* Fereastra de login, la nivel de pagină din același motiv ca preferințele.
          Fără autentificare configurată nu are ce deschide, deci nici nu se montează. */}
        {authAvailability.configured && <SignInDialog />}

        {/* Sincronizarea cu serverul (F6.2). Nu randează nimic; stă aici, sub
          `AuthConfigProvider`, ca să poată citi sesiunea. Fără autentificare sau
          fără backend configurat nu face nimic — nici nu golește `localStorage` la
          ieșirea din cont —, iar aplicația rămâne pe `localStorage`, ca înainte de F6.2. */}
        <ServerSync />
        <AuthErrorNotice code={authErrorCode} />
      </SidebarProvider>
    </AuthConfigProvider>
  );
}
