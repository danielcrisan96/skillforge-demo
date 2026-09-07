// Primul cod din proiect care trimite date ÎN TIMP, nu dintr-o bucată.
//
// Ce repetă pasul acesta: exact drumul pe care va veni, la pasul următor,
// răspunsul modelului de limbaj. Se schimbă doar SURSA bucăților — array-ul de
// mai jos devine răspunsul providerului. Protocolul, headerele și tot codul de
// citire din browser rămân aceleași.
//
// De asta merită scris de mână o dată: ce pare „magie" într-un hook gata făcut
// (`useChat` și rudele lui) e fix ce e scris aici și în `about-form.tsx`.

/**
 * `nodejs` — și în Next 16 e deja valoarea implicită, deci exportul e aici ca
 * să fie DECLARAT, nu pentru că schimbă ceva.
 *
 * Atenție dacă știi Next 14/15: acolo `runtime = "edge"` era alegerea „modernă"
 * pentru streaming, iar exemplele o foloseau peste tot. În Next 16, Edge
 * Runtime e DEPRECAT (vezi `node_modules/next/dist/docs/.../runtime.md`), iar
 * recomandarea e să nu mai pui deloc exportul. Deci întrebarea „Edge sau Node?"
 * nu se mai pune la fel: rămâne Node.
 *
 * Ce e important de reținut: streamingul nu depindea niciodată de Edge. Merge
 * identic pe amândouă — `ReadableStream` e API web standard, pe care Node îl
 * are de mult.
 */
export const runtime = "nodejs";

// Aici NU e nevoie de `export const dynamic = "force-dynamic"`.
//
// Merită spus explicit, pentru că în orice tutorial de streaming scris pe Next
// 14 îl vezi pus reflex. Motivul lui era că pe atunci un `GET` dintr-un Route
// Handler se cachea implicit: Next îl executa la build, consuma stream-ul o
// dată, salva rezultatul și-l servea apoi dintr-o bucată — efectul dispărea
// fără nicio eroare, doar cu un răspuns „suspect de rapid".
//
// În Next 16 implicitul e invers: Route Handlers NU se cachează, iar cache-ul e
// ceva ce ceri tu, cu `dynamic = "force-static"`. Deci `force-dynamic` ar fi
// aici o linie care nu face nimic — și care ar învăța o regulă falsă.

/**
 * Descrierea aplicației, tăiată în bucăți.
 *
 * Stă AICI, pe server, și nicăieri altundeva: interfața nu conține niciun cuvânt
 * din textul ăsta, deci poate fi schimbat fără să atingi vreo componentă. E
 * exact motivul pentru care nu l-am pus în `src/lib/mock/` — acolo stau datele
 * pe care le consumă interfața (conversații, profil), pe când textul ăsta nu
 * ajunge niciodată în bundle-ul de client, ci doar prin stream.
 *
 * Tăierea în bucăți nu e decorativă: fără ea n-ar exista ce să curgă. Un model
 * de limbaj produce natural bucăți de mărimea asta (câteva cuvinte), deci și
 * ritmul de aici seamănă cu ce vom vedea la pasul următor.
 */
const CHUNKS = [
  "SkillForge e un copilot personal de skills și carieră.\n\n",
  "Spre deosebire de un chat generic, ",
  "el îți cunoaște profilul real: ",
  "stack-ul cu care lucrezi acum, ",
  "skill-urile tale cu nivelul fiecăruia ",
  "și obiectivul spre care mergi.\n\n",
  "De aceea răspunsurile lui nu sunt sfaturi valabile pentru oricine, ",
  "ci pași concreți, în contextul tău: ",
  "ce-ți lipsește ca să ajungi unde vrei, ",
  "în ce ordine are sens să înveți ",
  "și — la fel de important — ce NU trebuie să înveți.\n\n",
  "Textul pe care tocmai l-ai văzut apărând ",
  "nu e scris în interfață. ",
  "A venit de pe server, bucată cu bucată, ",
  "prin exact același mecanism prin care va veni ",
  "răspunsul agentului AI la pasul următor."
];

/** Pauza dintre bucăți. Destul cât efectul să se vadă cu ochiul liber. */
const CHUNK_DELAY_MS = 120;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const chunk of CHUNKS) {
          // FORMATUL SSE: fiecare eveniment e `data: <ceva>\n\n`.
          //
          // `\n\n` e SEPARATORUL de evenimente. Deci un text care conține el
          // însuși linii noi (și al nostru conține, are paragrafe) ar rupe
          // protocolul: clientul ar vedea două evenimente acolo unde noi am
          // trimis unul, iar al doilea ar fi un fragment fără sens.
          //
          // Soluția e să nu trimitem niciodată text brut, ci text CODAT:
          // `JSON.stringify` transformă orice `\n` în secvența `\n`, care e
          // doar două caractere obișnuite. Clientul face `JSON.parse` și
          // recuperează textul exact. Aceeași problemă și aceeași soluție ca la
          // providerii reali de LLM.
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          await sleep(CHUNK_DELAY_MS);
        }

        // Marcaj de final. Fără el, clientul ar ști că s-a terminat doar când se
        // închide conexiunea — ceea ce arată identic cu o conexiune CĂZUTĂ.
        // Convenția `[DONE]` e aceeași pe care o folosesc providerii de LLM.
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        // Dacă ceva crapă la mijlocul stream-ului, closing-ul normal nu mai are
        // sens: clientul a primit deja o parte din text și trebuie să afle că
        // restul nu mai vine.
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      // Tipul care spune „ăsta e un flux de evenimente, nu un document".
      "Content-Type": "text/event-stream; charset=utf-8",

      // `no-cache` ține răspunsul departe de cache. `no-transform` e piesa
      // subtilă: fără el, un proxy sau un CDN are voie să TAMPONEZE răspunsul
      // ca să-l comprime, iar atunci îl primești întreg, la final, dintr-o
      // bucată. Aplicația ar merge — dar exact efectul pentru care există codul
      // ăsta ar dispărea, și fără niciun mesaj de eroare.
      "Cache-Control": "no-cache, no-transform",

      // Conexiunea rămâne deschisă cât curge stream-ul.
      Connection: "keep-alive"
    }
  });
}
