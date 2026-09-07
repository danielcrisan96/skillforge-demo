"use client";

import { Check, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PROVIDERS, PROVIDER_IDS } from "@/lib/providers";
import { useAppStore } from "@/store/useAppStore";

// Alegerea providerului de model.
//
// De ce apare deja, deși comparația reală între providere e abia în F4: decizia
// D-4 spune că providerul e schimbabil. Dacă locul din interfață unde se schimbă
// apare abia atunci, riscul e să construim între timp cod care presupune un
// singur provider. Cu selecția aici de la început, restul aplicației e obligat
// să citească providerul din store, nu să-l știe pe de rost.
//
// În pasul acesta selecția nu cheamă nimic — și spunem asta pe față în interfață,
// ca nimeni să nu creadă că a integrat un model din greșeală.

export function ProvidersForm() {
  const providerId = useAppStore(state => state.providerId);
  const setProviderId = useAppStore(state => state.setProviderId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-medium">Providere</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Furnizorul de model folosit pentru răspunsuri. Se afișează lângă composer, ca să știi mereu cine ar răspunde.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {PROVIDER_IDS.map(id => {
          const provider = PROVIDERS[id];
          const isSelected = id === providerId;

          return (
            // `button`, nu `div` cu onClick: elementul e acționabil, deci trebuie
            // să fie focusabil cu Tab și declanșabil cu Enter, fără să adăugăm
            // noi `role` și handler de tastatură.
            <button
              key={id}
              type="button"
              onClick={() => setProviderId(id)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors",
                "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring",
                isSelected ? "border-ring bg-muted" : "hover:bg-muted/50"
              )}
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{provider.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{provider.modelLabel}</span>
              </div>

              {isSelected ? (
                <Check className="size-4 shrink-0" />
              ) : (
                <Badge variant="secondary" className="font-normal">
                  Selectează
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <Alert>
        <Info />
        <AlertTitle>Încă nu se cheamă niciun model</AlertTitle>
        <AlertDescription>
          Aplicația rulează pe date inventate, fără chei de API — de asta pornește pe orice laptop, fără configurare.
          Selecția de aici se salvează și va fi folosită când providerii sunt conectați.
        </AlertDescription>
      </Alert>
    </div>
  );
}
