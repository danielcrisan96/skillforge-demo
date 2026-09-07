import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// De ce fonturile se declară aici și nu într-un <link> în HTML:
// next/font descarcă fontul la BUILD și îl servește de pe domeniul nostru. Fără
// asta, browserul ar cere fontul de la Google la fiecare vizită — o rundă de
// rețea în plus înainte să se poată desena textul, plus un request către un
// terț la fiecare încărcare de pagină.
const geistSans = Geist({
  // Numele variabilei NU e ales la întâmplare: `globals.css` (scris de shadcn)
  // consumă `--font-sans`. Dacă am lăsa aici `--font-geist-sans`, tokenul din
  // @theme ar rămâne nedefinit și `font-sans` din Tailwind n-ar aplica nimic —
  // fără nicio eroare, doar cu fontul de sistem pe toată aplicația.
  variable: "--font-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "SkillForge",
  description: "Copilot personal de skills și carieră"
};

/**
 * Script care aplică tema ÎNAINTE de prima desenare.
 *
 * Fără el ar exista un „flash": serverul trimite HTML fără clasa `.dark`,
 * browserul îl desenează alb, iar tema întunecată s-ar aplica abia după ce
 * JavaScript-ul pornește și store-ul se rehidratează. Pe o aplicație folosită
 * pe dark, asta înseamnă un fulger alb la fiecare încărcare.
 *
 * Rulează sincron, înaintea React, și citește exact cheia în care `persist`
 * salvează starea. Totul e în try/catch pentru că `localStorage` poate arunca
 * (navigare privată, cookie-uri blocate) — iar dacă aruncă, aplicația trebuie
 * să pornească pe tema implicită, nu să rămână albă.
 */
const themeScript = `(function(){try{var raw=localStorage.getItem("skillforge-app");var pref=raw?JSON.parse(raw).state.theme:"system";var dark=pref==="dark"||(pref!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning` pentru că scriptul de mai sus modifică
    // `<html>` înainte ca React să compare HTML-ul primit cu ce ar fi randat el.
    // Fără el, React ar raporta o nepotrivire pe care noi am provocat-o intenționat.
    <html
      lang="ro"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* ThemeProvider ține tema în sinc cu sistemul de operare cât timp
            aplicația e deschisă; scriptul de mai sus rezolvă doar prima desenare. */}
        <ThemeProvider>
          {/* Un singur TooltipProvider pentru toată aplicația: altfel fiecare
              tooltip și-ar porni propriul temporizator, iar întârzierile ar fi
              inconsecvente între componente. */}
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
