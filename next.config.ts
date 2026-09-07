import type { NextConfig } from "next";

// Fișierul e gol intenționat. În Next 16 nu mai e nevoie de configurare pentru
// lucrurile care înainte o cereau:
//   - Turbopack e activ implicit la `next dev` ȘI la `next build` (în Next 15
//     trebuia pornit cu `--turbopack` în scripturi);
//   - Tailwind se configurează din CSS (`src/app/globals.css`), nu de aici.
//
// Îl păstrăm ca să existe locul: aici vor intra, la pașii următori, setări
// precum `images.remotePatterns` sau opțiuni de cache.
//
// De reținut: tipul `NextConfig` nu e decorativ. Fără el, o cheie scrisă greșit
// ar fi pur și simplu ignorată în tăcere, iar setarea n-ar avea niciun efect.
const nextConfig: NextConfig = {};

export default nextConfig;
