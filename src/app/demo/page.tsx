import Link from "next/link";
import { HelloProbe } from "@/components/HelloProbe";
import { Button } from "@/components/ui/button";

// Ruta „/demo" există pentru că există folderul `src/app/demo/` cu un `page.tsx`
// în el. Atât — nu s-a înregistrat nicăieri.
//
// Pagina asta nu e umplutură: fixează structura de rutare ÎNAINTE să avem ce
// pune în ea. La pașii următori, tot așa apar `/chat` și `/profil` — un folder și
// un `page.tsx`. Iar layout-ul din `src/app/layout.tsx` rămâne montat la trecerea
// dintre ele.
export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">/demo</h1>
        <p className="text-muted-foreground">
          A doua rută, ca structura să fie stabilită. Aici se vede drumul complet: browser → rută proprie pe server →
          înapoi în browser.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Endpoint propriu</h2>
        <div className="rounded-xl border p-6">
          <HelloProbe />
        </div>
      </section>

      <Button asChild variant="outline" className="w-fit">
        <Link href="/">Înapoi la pagina principală</Link>
      </Button>
    </main>
  );
}
