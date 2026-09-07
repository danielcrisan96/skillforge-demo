// Tailwind v4 se leagă de proiect ca plugin de PostCSS, printr-un pachet separat
// (`@tailwindcss/postcss`). E singura piesă care face ca `@import "tailwindcss"`
// din `src/app/globals.css` să producă efectiv CSS.
//
// Diferența față de Tailwind v3, care încă apare în majoritatea tutorialelor:
// acolo pluginul se numea chiar `tailwindcss` și avea nevoie de un
// `tailwind.config.js` cu lista fișierelor de scanat (`content`). În v4 nu mai
// există niciunul: temele și utilitarele se declară direct în CSS, iar fișierele
// sunt descoperite automat. De asta nu vei găsi `tailwind.config.js` în proiect —
// nu lipsește, nu mai există.
const config = {
  plugins: {
    "@tailwindcss/postcss": {}
  }
};

export default config;
