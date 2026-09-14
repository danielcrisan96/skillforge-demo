"use client";

import { Fragment } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProviderAvailability } from "@/hooks/use-provider-availability";
import { PROVIDERS, PROVIDER_IDS, resolveProviderId } from "@/lib/providers";
import { useAppStore } from "@/store/useAppStore";

// Comutatorul de provider, lângă caseta de scris.
//
// De ce aici și nu în preferințe: e o decizie de MOMENT („vreau altă părere la
// întrebarea asta"), nu o setare schimbată o dată pe lună. Un control se pune
// unde se ia decizia. În preferințe a rămas doar starea providerilor — care are
// cheie și care nu — pentru că aia chiar e configurare.
//
// Ce NU e în fișierul ăsta, și e important: niciun nume de provider scris de
// mână și niciun `if (id === "openai")`. Componenta iterează registrul
// (`PROVIDER_IDS`) și afișează ce găsește acolo. Un provider nou apare în listă
// fără să se atingă fișierul ăsta — ăsta e testul abstracției. Dacă vreodată e
// nevoie de o modificare aici ca să apară un provider, a curs ceva în registru
// și se repară acolo, nu se ocolește pe-aici.

export function ProviderPicker() {
  const storedProviderId = useAppStore(state => state.providerId);
  const setProviderId = useAppStore(state => state.setProviderId);
  const availability = useProviderAvailability();

  // Valoarea din store trece prin registru înainte să fie afișată.
  //
  // `localStorage` poate conține un provider scos între timp din registru, iar
  // `PROVIDERS[ceva-care-nu-există]` ar fi `undefined` — adică o pagină albă cu
  // „cannot read property label of undefined". Serverul face exact aceeași
  // rezolvare, cu aceeași funcție, deci eticheta de aici nu poate minți despre
  // cine răspunde de fapt.
  const selectedId = resolveProviderId(storedProviderId);
  const selected = PROVIDERS[selectedId];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs font-normal text-muted-foreground"
          aria-label="Alege providerul de model"
        >
          {selected.label}
          {/* Numele modelului se ascunde pe ecrane mici: pe 390px, lângă butonul
              de trimitere, n-ar mai încăpea. În listă e vizibil întotdeauna,
              acolo unde se ia decizia. */}
          <span className="hidden font-mono sm:inline">· {selected.modelLabel}</span>
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>

      {/* `w-auto` anulează lățimea implicită a shadcn (cât trigger-ul): aici
          conținutul e pe două rânduri, deci lista trebuie să fie mai lată decât
          butonul care o deschide. */}
      <DropdownMenuContent align="end" className="w-auto min-w-60">
        <DropdownMenuLabel>Răspunde la mesajul următor</DropdownMenuLabel>

        <DropdownMenuRadioGroup
          value={selectedId}
          // `resolveProviderId` în loc de `value as ProviderId`: valoarea vine
          // ca `string` din Radix, iar un cast ar fi o minciună spusă
          // compilatorului. Aici e o verificare reală, contra registrului.
          onValueChange={value => setProviderId(resolveProviderId(value))}
        >
          {PROVIDER_IDS.map(id => {
            const provider = PROVIDERS[id];
            const status = availability?.[id];

            // Cât timp verdictul nu a sosit (`availability` e `null`), nu
            // dezactivăm nimic — vezi comentariul din `useProviderAvailability`.
            const isUnavailable = status ? !status.configured : false;

            const item = (
              <DropdownMenuRadioItem value={id} disabled={isUnavailable} className="py-1.5">
                <div className="flex flex-col">
                  <span>{provider.label}</span>
                  {/* Numele modelului lângă fiecare opțiune: altfel „OpenAI" nu
                      spune nimic despre CE răspunde, iar două conturi cu modele
                      diferite ar arăta identic. */}
                  <span className="font-mono text-xs text-muted-foreground">{provider.modelLabel}</span>
                </div>
              </DropdownMenuRadioItem>
            );

            // Opțiunea bună merge direct în meniu, fără niciun înveliș: un `div`
            // între `role="menu"` și `role="menuitemradio"` n-ar strica nimic
            // vizual, dar e exact genul de element în plus pe care un cititor de
            // ecran îl anunță degeaba.
            if (!isUnavailable) return <Fragment key={id}>{item}</Fragment>;

            return (
              // Un provider fără cheie rămâne ÎN listă, dezactivat, cu motivul
              // într-un tooltip. Scos din listă, ar fi ridicat întrebarea „de ce
              // nu văd OpenAI?", la care nimic din interfață n-ar fi răspuns.
              //
              // Tooltip-ul stă pe `div`-ul din jur, nu pe opțiune: o opțiune
              // dezactivată primește `pointer-events: none` de la shadcn, deci
              // n-ar declanșa niciodată hover-ul. Cu învelișul, evenimentele
              // ajung la el, fiindcă trec PRIN copilul dezactivat.
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <div>{item}</div>
                </TooltipTrigger>
                <TooltipContent side="left">{status?.unavailableReason}</TooltipContent>
              </Tooltip>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
