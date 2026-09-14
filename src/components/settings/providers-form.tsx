"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useProviderAvailability } from "@/hooks/use-provider-availability";
import { PROVIDERS, PROVIDER_IDS } from "@/lib/providers";

// Starea providerilor. NU comutatorul.
//
// Până la F4, aici se alegea providerul. De la F4, alegerea s-a mutat lângă
// caseta de scris (`provider-picker.tsx`), din motivul care contează: e o
// decizie de moment („vreau altă părere la întrebarea asta"), nu o setare
// schimbată o dată pe lună. Un control se pune unde se ia decizia.
//
// Ce a rămas aici e ce chiar e configurare: care provider are cheie pe server și
// care nu, cu motivul scris. E și locul unde răspunsul la „de ce nu pot alege
// OpenAI?" e vizibil fără să treacă cineva prin cod.
//
// Ca și composer-ul, secțiunea asta iterează registrul. Niciun nume de provider
// scris de mână, deci un provider nou apare și aici fără nicio modificare.

export function ProvidersForm() {
  const availability = useProviderAvailability();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-medium">Providere</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Care furnizori de model sunt configurați pe server. Comutarea între ei se face lângă caseta de scris, nu de
          aici — se schimbă des, de la un mesaj la altul.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {PROVIDER_IDS.map(id => {
          const provider = PROVIDERS[id];
          const status = availability?.[id];

          return (
            <div key={id} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{provider.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{provider.modelLabel}</span>
                </div>

                {/* Trei stări, nu două: configurat, neconfigurat și „încă nu
                    știu". A treia există cât timp răspunsul serverului nu a
                    sosit — confundată cu „neconfigurat", ar acuza pe nedrept o
                    cheie care e la locul ei. */}
                {status ? (
                  <Badge variant={status.configured ? "secondary" : "outline"} className="shrink-0 font-normal">
                    {status.configured ? <CircleCheck /> : <CircleAlert />}
                    {status.configured ? "Cheie configurată" : "Fără cheie"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
                    Se verifică…
                  </Badge>
                )}
              </div>

              {status?.unavailableReason ? (
                <p className="text-xs text-muted-foreground">{status.unavailableReason}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <Alert>
        <Info />
        <AlertTitle>Cheile stau doar pe server</AlertTitle>
        <AlertDescription>
          Browserul nu vede nicio cheie — primește de la server doar „configurat / neconfigurat” și motivul. De asta
          starea de aici se schimbă abia după ce repornești serverul (local) sau după un redeploy (în producție).
        </AlertDescription>
      </Alert>
    </div>
  );
}
