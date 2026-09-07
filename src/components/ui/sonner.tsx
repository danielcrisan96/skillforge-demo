"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";

import { useResolvedTheme } from "@/components/theme/theme-provider";

// Component generat de shadcn, cu o singură modificare făcută intenționat:
// tema vine din `useResolvedTheme()` (store-ul nostru), nu din `next-themes`,
// cum era în varianta livrată.
//
// Motivul: sonner își randează notificările într-un portal, în afara arborelui
// nostru, deci nu moștenește tema din CSS și trebuie să i se spună explicit care
// e. Dacă ar întreba `next-themes`, ar exista două surse de adevăr pentru temă
// și notificările ar rămâne albe pe o aplicație trecută pe dark.

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useResolvedTheme();

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
