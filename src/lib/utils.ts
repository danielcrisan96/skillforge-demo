import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// `cn` e helperul pe care se sprijină toate componentele shadcn. Face două
// lucruri, cu două biblioteci diferite:
//
//   clsx     — construiește șirul de clase din bucăți condiționate
//              (`cn("p-2", esteActiv && "bg-muted")`).
//   twMerge  — rezolvă CONFLICTELE dintre clase Tailwind, păstrând-o pe ultima.
//
// A doua parte e cea care contează și e ușor de subestimat. În CSS obișnuit,
// `class="p-2 p-8"` nu înseamnă „câștigă p-8": câștigă regula cu prioritate mai
// mare din foaia de stil, ceea ce face rezultatul imprevizibil. `twMerge` știe
// că `p-2` și `p-8` sunt aceeași proprietate și o păstrează doar pe ultima.
//
// De asta orice component shadcn primește `className` și îl trece prin `cn`:
// altfel n-ai putea suprascrie din exterior stilul unui buton fără `!important`.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
