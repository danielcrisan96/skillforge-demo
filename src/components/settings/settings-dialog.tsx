"use client";

import { useState, type ComponentType } from "react";
import { Info, Settings, Sparkles, UserRound, type LucideIcon } from "lucide-react";

import { AboutForm } from "@/components/settings/about-form";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { ProvidersForm } from "@/components/settings/providers-form";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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
const SECTIONS: SettingsSection[] = [
  { id: "general", label: "General", icon: Settings, Panel: AppearanceForm },
  { id: "profile", label: "Profilul tău", icon: UserRound, Panel: ProfileForm },
  { id: "providers", label: "Providere", icon: Sparkles, Panel: ProvidersForm },
  { id: "about", label: "Despre aplicație", icon: Info, Panel: AboutForm }
];

export function SettingsDialog() {
  const isOpen = useAppStore(state => state.isSettingsOpen);
  const setOpen = useAppStore(state => state.setSettingsOpen);

  // Secțiunea activă e stare locală: e o poziție în interfață, care nu
  // interesează pe nimeni altcineva și nu are rost să supraviețuiască închiderii.
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  const activeSection = SECTIONS.find(section => section.id === activeId) ?? SECTIONS[0];
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
            {SECTIONS.map(section => {
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

          {/* Zona din dreapta. Se derulează separat de navigație: formularul de
              profil e mai înalt decât fereastra, iar dacă s-ar derula tot
              dialogul, navigația ar dispărea de sub degete.

              Patru lucruri, care trebuie să existe împreună:

              1. `div` cu `overflow-y-auto`, NU `ScrollArea` din shadcn. Radix
                 inserează între viewport și copil un wrapper cu `display: table`,
                 care se dimensionează după conținut — deci o înălțime în procente
                 pusă înăuntru s-ar rezolva circular și n-ar da nimic.
              2. `min-h-0` pe containerul care derulează, altfel `flex-1` nu-l
                 poate face mai mic decât conținutul.
              3. `h-full` pe cutia dinăuntru: îi dă panoului o înălțime DEFINITĂ,
                 de care se poate agăța un `flex-1` din interiorul unei secțiuni
                 (vezi `about-form.tsx`). Un `min-h-full` n-ar fi de ajuns — ăla e
                 doar un minim, deci panoul ar crește după conținut și bara de jos
                 a secțiunii ar ajunge sub marginea ferestrei.
              4. Spațierea (`p-6`) stă pe containerul care DERULEAZĂ, nu pe cutia
                 cu `h-full`. Pusă pe cutie, ea ar rămâne prinsă la marginea de jos
                 a celor 100% înălțime, iar conținutul mai înalt (formularul de
                 profil) ar curge PESTE ea: derulat până la capăt, ultimul câmp ar
                 atinge muchia ferestrei. Pe containerul de derulare, spațiul de jos
                 face parte din zona derulabilă și se vede și la final. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="h-full">
              <ActivePanel />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
