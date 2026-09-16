"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

import { AUTH_PROVIDER_LOGOS } from "@/components/auth/auth-provider-logos";
import { useAuthConfig } from "@/components/auth/auth-config-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AUTH_PROVIDERS, AUTH_PROVIDER_IDS } from "@/lib/auth-providers";
import type { AuthProviderId } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

// Fereastra în care ALEGI cum te conectezi.
//
// De ce o fereastră și nu un buton care pleacă direct la GitHub: cu un singur
// furnizor, o redirectare instantanee arată ca și cum aplicația a decis în locul
// tău — și te aruncă pe o pagină străină fără să fi spus unde mergi. Fereastra
// face limpede că e o alegere și că autentificarea e un pas AL aplicației.
//
// Fereastra nu numește niciun furnizor în cod: iterează registrul. Google apare
// deja, cu sigla lui și dezactivat — la activare nu mai e nimic de desenat aici.

export function SignInDialog() {
  const isOpen = useAppStore(state => state.isSignInOpen);
  const setOpen = useAppStore(state => state.setSignInOpen);
  const { availableProviderIds } = useAuthConfig();

  // Care furnizor a fost apăsat: între click și redirectare trec câteva sute de
  // milisecunde (se cere tokenul CSRF, apoi URL-ul furnizorului). Fără indicator,
  // omul apasă a doua oară.
  const [pendingId, setPendingId] = useState<AuthProviderId | null>(null);

  const handleSignIn = async (id: AuthProviderId) => {
    setPendingId(id);
    try {
      // `signIn` din `next-auth/react` — varianta de CLIENT. Nu primește niciun
      // secret: face POST pe `/api/auth/signin/<id>`, iar serverul răspunde cu URL-ul
      // furnizorului, spre care browserul pleacă. `redirectTo` = unde revenim după.
      await signIn(id, { redirectTo: "/" });
    } catch {
      // Ajunge aici doar dacă cererea către propriul server a eșuat (rețea). Un
      // eșec la furnizor revine pe altă cale — ca `?error=` în URL.
      setPendingId(null);
      toast.error("Nu am putut porni conectarea", { description: "Verifică conexiunea și încearcă din nou." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Conectează-te</DialogTitle>
          <DialogDescription>
            Cu un cont pe care îl ai deja — nu îți creezi o parolă nouă. Contul e necesar doar ca să poți întreba
            modelul; restul aplicației merge și fără.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {AUTH_PROVIDER_IDS.map(id => {
            const provider = AUTH_PROVIDERS[id];
            const Logo = AUTH_PROVIDER_LOGOS[id];
            const isComingSoon = provider.status === "coming-soon";
            // Activ în registru, dar fără credențiale pe server: dezactivat, cu motiv,
            // nu ascuns — aceeași regulă ca la providerii de model (D-23).
            const isUnavailable = !isComingSoon && !availableProviderIds.includes(id);
            const isPending = pendingId === id;

            return (
              <Button
                key={id}
                variant="outline"
                size="lg"
                className="w-full justify-start gap-3"
                disabled={isComingSoon || isUnavailable || pendingId !== null}
                onClick={() => void handleSignIn(id)}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Logo className="size-4" />}
                <span className="flex-1 text-left">Continuă cu {provider.label}</span>
                {isComingSoon && <Badge variant="secondary">În curând</Badge>}
                {isUnavailable && <Badge variant="outline">Neconfigurat</Badge>}
              </Button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Aplicația primește de la furnizor doar numele, emailul și poza contului, și nu le salvează nicăieri.
        </p>
      </DialogContent>
    </Dialog>
  );
}
