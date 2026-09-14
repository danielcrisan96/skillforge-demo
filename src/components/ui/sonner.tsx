"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";

import { useTheme } from "@/components/theme/theme-provider";

// Component generat de shadcn — EXCEPȚIE explicită de la regula „nu se editează
// manual fișiere din `src/components/ui/`": fără modificarea asta, `Toaster`
// și-ar lua tema din `next-themes` (biblioteca pe care shadcn o instalează
// implicit pentru el) și ar primi mereu „system", pentru că niciun provider
// de-al ei nu există în arbore — notificările n-ar urma tema aleasă de
// utilizator.
//
// Modificarea: tema vine din `useTheme()` — hook-ul nostru, din
// `theme-provider.tsx` — nu din `next-themes`.
//
// Motivul pentru care tot trebuie cerută explicit, și nu moștenită din CSS ca
// restul aplicației: sonner își randează notificările într-un portal, în afara
// arborelui nostru, deci clasa `.dark` de pe `<html>` nu-i schimbă automat
// aspectul — biblioteca vrea tema ca VALOARE, primită prin prop.
//
// `next-themes` rămâne în `package.json`: a venit ca dependență a lui `sonner`
// (shadcn o instalează pentru asta), nu ca alegere a proiectului. O dependență
// nefolosită direct nu se șterge la ghici — ar putea fi cerută și de alt pachet.

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme: theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)"
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast"
        }
      }}
      {...props}
    />
  );
};

export { Toaster };
