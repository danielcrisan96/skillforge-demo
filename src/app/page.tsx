import { Chat } from "@/components/chat/chat";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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
export default function Home() {
  return (
    // `SidebarProvider` ține starea deschis/închis a sidebar-ului și decide
    // singur, după lățimea ecranului, dacă îl randează fix sau într-un `Sheet`.
    // De aici vine comportamentul responsive, fără cod separat pentru mobil.
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
    </SidebarProvider>
  );
}
