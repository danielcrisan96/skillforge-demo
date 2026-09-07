import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Config în format „flat" (`eslint.config.mjs`), nu vechiul `.eslintrc`. Nu e o
// preferință: ESLint 10 renunță la formatul vechi, iar în Next 16 pluginul
// `@next/eslint-plugin-next` livrează implicit varianta flat.
//
// De reținut, pentru că se schimbă față de tutorialele pe Next 15:
// comanda `next lint` A FOST ELIMINATĂ în Next 16, iar `next build` NU mai
// rulează lint. De asta scriptul din package.json cheamă direct `eslint`, iar
// verificarea se face separat de build.
//
// ESLint și Prettier fac lucruri diferite și nu se suprapun aici: ESLint caută
// greșeli (hooks folosite greșit, variabile nefolosite), Prettier doar
// formatează. De asta nu avem nevoie de `eslint-config-prettier`.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Suprascrie lista implicită de ignorate din eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"])
]);

export default eslintConfig;
