"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ThemePreference } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

// Singurul loc din aplicație de unde se schimbă tema.
//
// De ce nu și un buton în header, cum se face de obicei: tema e o preferință,
// nu o acțiune pe care o repeți în timpul lucrului. Ținută într-un singur loc,
// header-ul rămâne gol pentru ce contează — conversația. Un comutator mereu la
// vedere ar sugera că e ceva ce trebuie atins des.

/**
 * Registru, nu trei ramuri de `if`. Adăugarea unei opțiuni de temă înseamnă o
 * intrare aici, nu modificări în randare, în tipuri și în tooltip separat.
 */
const THEME_OPTIONS: { value: ThemePreference; label: string; description: string; icon: LucideIcon }[] = [
  {
    value: "system",
    label: "Sistem",
    description: "Urmează tema sistemului de operare, în timp real",
    icon: Monitor
  },
  { value: "light", label: "Luminoasă", description: "Forțează tema luminoasă", icon: Sun },
  { value: "dark", label: "Întunecată", description: "Forțează tema întunecată", icon: Moon }
];

export function AppearanceForm() {
  const theme = useAppStore(state => state.theme);
  const setTheme = useAppStore(state => state.setTheme);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-medium">Aspect</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          „Sistem” nu e o temă fixă: dacă schimbi tema din sistemul de operare, aplicația se schimbă odată cu el, fără
          refresh.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="theme-toggle">Temă</Label>

        <ToggleGroup
          id="theme-toggle"
          type="single"
          variant="outline"
          spacing={0}
          value={theme}
          // Radix trimite string gol când utilizatorul apasă opțiunea deja
          // activă. Fără verificarea asta, tema ar deveni „" și interfața ar
          // rămâne fără nicio opțiune selectată.
          onValueChange={value => {
            if (value) setTheme(value as ThemePreference);
          }}
        >
          {THEME_OPTIONS.map(option => (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <ToggleGroupItem value={option.value} aria-label={option.label}>
                  <option.icon />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>{option.description}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
