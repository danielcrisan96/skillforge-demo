import Link from "next/link";
import { Counter } from "@/components/Counter";
import { HelloProbe } from "@/components/HelloProbe";
import { ServerClock } from "@/components/ServerClock";
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
        <h2 className="text-lg font-medium">Component client vs. component server</h2>
        <p className="text-sm text-muted-foreground">
          Aceleași cifre din browser (stânga) și de pe server (dreapta), randate una lângă alta — ca diferența dintre
          ele să se vadă, nu doar să se explice.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-6">
            <Counter />
          </div>
          <div className="rounded-xl border p-6">
            {/* `ServerClock` e un component de server async — poate fi randat
                direct dintr-un alt component de server, fără vreun `await`
                explicit aici: React așteaptă singur promisiunea, la randare. */}
            <ServerClock />
          </div>
        </div>
      </section>

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
