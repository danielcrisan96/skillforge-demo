"use client";

import { Lock } from "lucide-react";
import { useSession } from "next-auth/react";

import { useAuthConfig } from "@/components/auth/auth-config-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Emailul contului, în formularul de profil — dar NU ca parte a profilului.
//
// ⚠️ E readonly din DOUĂ motive, și amândouă se spun în interfață, nu doar aici:
// 1. valoarea vine de la furnizor; nu există nimic de salvat de aici care să o schimbe;
// 2. NU intră în profil — nu în tipul `Profile`, nu în `localStorage`, nu în system
//    prompt. Profilul pleacă spre model la FIECARE mesaj; orice câmp adăugat acolo
//    devine o dată trimisă unui serviciu extern, la nesfârșit. Emailul e exact genul
//    de dată care n-are ce căuta pe drumul acela, iar modelul n-are nevoie de el ca
//    să propună un plan de învățare.
//
// De aceea valoarea se citește direct din sesiune, la afișare, și nu trece prin store.

/** Fără autentificare configurată câmpul nu apare deloc: nu există niciun cont de arătat. */
export function AccountEmailField() {
  const { configured } = useAuthConfig();
  // Ramura prin componente separate: `useSession` e legal doar sub `SessionProvider`,
  // care există doar când `configured` e adevărat (vezi `auth-config-provider.tsx`).
  return configured ? <SessionEmailField /> : null;
}

function SessionEmailField() {
  const { data: session, status } = useSession();

  // Trei stări, toate cu text pentru om — niciodată `null` sau „undefined” pe ecran.
  // Textul stă în `placeholder` (estompat), nu în `value`: un placeholder se citește
  // ca „nu e o valoare”, deci nimeni nu confundă „Nu ești conectat” cu un email.
  const email = session?.user.email ?? null;
  const placeholder =
    status === "loading"
      ? "Se verifică sesiunea…"
      : !session
        ? "Nu ești conectat"
        : "Furnizorul nu ne-a trimis emailul";

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="account-email" className="flex items-center gap-1.5">
        Emailul contului
        <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
      </Label>
      <Input
        id="account-email"
        type="email"
        // `readOnly`, nu `disabled`: rămâne selectabil și copiabil, și e citit de
        // cititoarele de ecran — doar că nu se poate modifica.
        readOnly
        value={email ?? ""}
        placeholder={placeholder}
        className="bg-muted/50"
      />
      <p className="text-xs text-muted-foreground">
        {status === "authenticated" && !email
          ? "Contul tău nu ne-a dat emailul (de exemplu, e ascuns în setările GitHub). Nu e nevoie de el ca să folosești aplicația. "
          : ""}
        Vine de la furnizorul cu care te-ai conectat, deci nu se poate schimba de aici. Nu face parte din profil: nu se
        salvează în acest browser și nu e trimis modelului.
      </p>
    </div>
  );
}
