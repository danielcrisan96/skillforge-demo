// Declanșează o descărcare de fișier direct în browser, fără niciun endpoint
// nou pe server: conținutul există deja, ca text, în memorie — un `route.ts`
// nou ar fi însemnat să retrimitem la server date pe care le avem deja aici.
//
// Atinge `document` și `URL`, deci NU stă în `message-utils.ts` — acolo
// funcțiile trebuie să rămână pure ca să poată fi testate fără browser.
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  // Ancora se adaugă în DOM înainte de `click()`: unele browsere (Safari,
  // notabil) ignoră `download` pe un element care nu e montat.
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Fără asta, fiecare export ar lăsa în memoria browserului o copie a
  // fișierului — `createObjectURL` nu se eliberează singur, spre deosebire de
  // alte resurse legate de un component React care dispar la demontare.
  URL.revokeObjectURL(url);
}
