"use client";

import { useState, type ComponentType } from "react";
import { Settings, Sparkles, UserRound, type LucideIcon } from "lucide-react";

import { AppearanceForm } from "@/components/settings/appearance-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { ProvidersForm } from "@/components/settings/providers-form";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

// Preferințele, ca fereastră separată peste aplicație.
//
// De ce `Dialog` și nu un ecran care înlocuiește conversația: setările sunt o
// paranteză, nu o destinație. Cine intră să schimbe tema vrea să se întoarcă
// exact unde era, cu conversația neatinsă în spate. Un ecran separat ar însemna
// navigare, deci pierderea contextului și un buton de „înapoi" de gestionat.
//
// De ce nu un panou inline în sidebar: formularul de profil are prea multe
// câmpuri pentru lățimea unui sidebar, iar înghesuit acolo ar deveni imposibil
// de completat pe ecrane mici.

type SettingsSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Panoul din dreapta. Fiecare secțiune își aduce propriul component. */
  Panel: ComponentType;
};

/**
 * Registru, în locul unui lanț de `if` sau `switch` în randare.
 *
 * O secțiune nouă înseamnă o intrare aici — navigația din stânga și panoul din
 * dreapta se actualizează amândouă din aceeași sursă, deci nu pot ajunge să se
 * contrazică (o intrare în meniu fără conținut, sau invers).
 */
const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "general", label: "General", icon: Settings, Panel: AppearanceForm },
  { id: "profile", label: "Profilul tău", icon: UserRound, Panel: ProfileForm },
  { id: "providers", label: "Providere", icon: Sparkles, Panel: ProvidersForm }
];

export function SettingsDialog() {
  const isOpen = useAppStore(state => state.isSettingsOpen);
  const setOpen = useAppStore(state => state.setSettingsOpen);

  // Secțiunea activă e stare locală: e o poziție în interfață, care nu
  // interesează pe nimeni altcineva și nu are rost să supraviețuiască închiderii.
  const [activeId, setActiveId] = useState(SETTINGS_SECTIONS[0].id);

  const activeSection = SETTINGS_SECTIONS.find(section => section.id === activeId) ?? SETTINGS_SECTIONS[0];
  const ActivePanel = activeSection.Panel;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="flex h-[80vh] max-h-[42rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {/* Titlul există pentru cititoarele de ecran chiar dacă designul nu-l
            arată mare: Radix cere un `DialogTitle`, altfel dialogul e anunțat
            fără nume. */}
        <div className="border-b px-6 py-4">
          <DialogTitle className="text-base">Preferințe</DialogTitle>
          <DialogDescription className="sr-only">
            Setările aplicației: aspect, profilul tău și providerul de model.
          </DialogDescription>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Navigația. Pe mobil devine un rând orizontal, pentru că o coloană
              de 14rem ar mânca jumătate din lățimea ecranului. */}
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b bg-muted/40 p-2 sm:w-52 sm:flex-col sm:border-r sm:border-b-0 sm:p-3">
            {SETTINGS_SECTIONS.map(section => {
              const isActive = section.id === activeSection.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveId(section.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    "outline-none focus-visible:ring-3 focus-visible:ring-ring",
                    isActive ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <section.icon className="size-4 shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          {/* Conținutul se derulează separat de navigație: formularul de profil
              e mai înalt decât fereastra, iar dacă s-ar derula tot dialogul,
              navigația ar dispărea de sub degete. */}
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-6">
              <ActivePanel />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
