import { connection } from "next/server";

// Fișierul ăsta NU are "use client". Asta îl face component de SERVER — modul
// implicit în App Router. Codul de aici nu ajunge niciodată în browser.
//
// De ce contează pentru SkillForge, nu doar ca exercițiu:
// aici e locul unde se poate citi o cheie de API, se poate interoga o bază de
// date sau se poate chema modelul de limbaj. Nimic din ce se întâmplă în acest
// fișier nu e vizibil în bundle-ul trimis clientului. Componentul client de
// alături (Counter) nu are voie la niciunul dintre lucrurile astea.
//
// Un component de server poate fi `async` și poate face `await` direct în corp.
// Un component client NU poate — de asta încărcarea datelor stă natural aici.
export async function ServerClock() {
  // `connection()` spune explicit: „nu randa asta la build, ci la fiecare cerere".
  //
  // Fără ea, Next ar avea voie să prerandeze pagina o singură dată, la build, iar
  // ora afișată ar fi ora build-ului — înghețată, identică la fiecare refresh.
  // N-ar fi o eroare, ci exact genul de rezultat care derutează: pagina merge,
  // dar valoarea e greșită.
  //
  // Aceeași problemă apare la orice date care depind de cerere (utilizatorul
  // curent, profilul lui, o valoare din baza de date). De aceea contează acum.
  await connection();

  const now = new Date();
  // Locale "ro-RO" nu e o alegere de identificator, ci de FORMAT afișat: ora se
  // vede de utilizator, deci se formatează românește.
  const formattedTime = new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  }).format(now);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Component <strong className="text-foreground">server</strong> — rulează pe server
      </p>

      <p className="font-mono text-3xl tabular-nums">{formattedTime}</p>

      <p className="text-xs text-muted-foreground">
        Calculat la cerere, pe server. Nu se schimbă singur în pagină — abia la refresh apare altă valoare, pentru că
        atunci se face o cerere nouă.
      </p>
    </div>
  );
}
