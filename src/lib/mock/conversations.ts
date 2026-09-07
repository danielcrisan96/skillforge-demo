import type { Conversation } from "@/lib/types";

// Conversațiile inventate cu care pornește aplicația.
//
// De ce avem nevoie de ele: o listă goală nu arată nimic. Cu conversații reale
// în sidebar se poate verifica navigarea, evidențierea celei active, redenumirea,
// ștergerea și felul în care arată o discuție lungă — adică exact lucrurile care
// se strică ușor și care, altfel, s-ar descoperi abia după integrarea modelului.
//
// Conținutul e scris în stilul în care ar răspunde agentul SkillForge: sprijinit
// pe skill-urile din profil, cu pași concreți. Așa se vede dacă interfața face
// față unui răspuns lung, nu doar unui „ok".

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-gap-analysis",
    title: "Ce-mi lipsește pentru AI Engineer",
    createdAt: "2026-08-28T09:12:00.000Z",
    messages: [
      {
        id: "m-1",
        role: "user",
        content: "Ce-mi lipsește ca să pot aplica pe un rol de AI Engineer?",
        createdAt: "2026-08-28T09:12:00.000Z"
      },
      {
        id: "m-2",
        role: "assistant",
        content:
          "Pornind de la profilul tău — C# și SQL la nivel avansat, React și LLM la început — diferența până la un rol de AI Engineer nu e „încă un limbaj”, ci trei lucruri:\n\n1. Integrarea unui model, nu folosirea lui. Știi să chemi un API. Ce lipsește e partea din jur: streaming către interfață, gestionarea contextului când conversația crește, tratarea erorilor de rate limit. Backend-ul tău te ajută aici mai mult decât crezi.\n\n2. Evaluarea răspunsurilor. E partea pe care o sar aproape toți. Fără o metodă de a spune „varianta asta de prompt e mai bună decât cealaltă”, orice îmbunătățire e ghicit.\n\n3. Frontend cât să livrezi. Nu ai nevoie de React avansat. Ai nevoie de cât să construiești o interfață care afișează un răspuns în streaming fără să pară blocată.\n\nCe nu îți lipsește: matematica de machine learning. Pentru rolul ăsta nu antrenezi modele, le integrezi.",
        createdAt: "2026-08-28T09:12:30.000Z"
      },
      {
        id: "m-3",
        role: "user",
        content: "De unde încep, dacă am cam 6 ore pe săptămână?",
        createdAt: "2026-08-28T09:19:00.000Z"
      },
      {
        id: "m-4",
        role: "assistant",
        content:
          "Cu 6 ore pe săptămână, ordinea contează mai mult decât viteza. Începe cu punctul 1, pentru că se sprijină pe ce ai deja.\n\nSăptămânile 1–3: un endpoint care cheamă un model și returnează stream. În stack-ul tău e echivalentul unui controller care scrie progresiv în response — teritoriu cunoscut.\n\nSăptămânile 4–6: interfața care consumă stream-ul. Aici atingi React exact cât trebuie.\n\nSăptămânile 7–9: construirea promptului din date reale, nu dintr-un text fix.\n\nAbia după asta are sens evaluarea, pentru că ai ce evalua.",
        createdAt: "2026-08-28T09:19:25.000Z"
      }
    ]
  },
  {
    id: "conv-plan-react",
    title: "Plan de învățare React",
    createdAt: "2026-08-30T18:40:00.000Z",
    messages: [
      {
        id: "m-5",
        role: "user",
        content: "Fă-mi un plan de React pentru 4 săptămâni. Vin din backend, nu am răbdare de tutoriale lungi.",
        createdAt: "2026-08-30T18:40:00.000Z"
      },
      {
        id: "m-6",
        role: "assistant",
        content:
          "Atunci sar peste „ce este o componentă”. Plan pe patru săptămâni, cu un livrabil pe săptămână:\n\nS1 — Stare și randare. `useState`, de ce re-randarea nu e un bug, ce înseamnă că interfața e o funcție de stare. Livrabil: un formular care validează în timp ce scrii.\n\nS2 — Efecte și date. `useEffect` și, mai important, când nu îl folosești. Livrabil: o listă care încarcă date și are stările de loading și eroare.\n\nS3 — Compunere. Componente care primesc alte componente, în loc de props tot mai multe. Livrabil: un dialog refolosibil.\n\nS4 — Stare partajată. Când starea locală nu mai ajunge. Livrabil: un mic store și două ecrane care îl folosesc.\n\nVenind din C#, partea care te va irita cel mai mult e că nu există „un singur loc corect” pentru stare. Nu e neglijență în design — e o alegere.",
        createdAt: "2026-08-30T18:40:35.000Z"
      }
    ]
  },
  {
    id: "conv-interviu",
    title: "Pregătire interviu — întrebări de sistem",
    createdAt: "2026-09-01T20:05:00.000Z",
    messages: [
      {
        id: "m-7",
        role: "user",
        content: "Ce mă întreabă la interviu despre integrarea unui LLM, dat fiind că vin din backend?",
        createdAt: "2026-09-01T20:05:00.000Z"
      },
      {
        id: "m-8",
        role: "assistant",
        content:
          "Cel mai probabil nu te întreabă cum funcționează un transformer. Te întreabă lucruri de inginerie, unde experiența ta de backend e un avantaj:\n\n- „Unde ții cheia de API și de ce?” — răspunsul corect atinge granița client/server, nu configurarea.\n- „Ce faci când răspunsul nu mai încape în fereastra de context?” — vor să audă o strategie (rezumat, ferestre glisante, selecție), nu „mărim limita”.\n- „Cum știi că o schimbare de prompt a fost o îmbunătățire?” — aici cad majoritatea candidaților.\n- „Ce se întâmplă dacă providerul pică?” — degradare elegantă, retry, provider alternativ.\n\nUltimele două sunt exact zonele în care cineva venit din backend poate răspunde mai bine decât cineva venit din data science.",
        createdAt: "2026-09-01T20:05:40.000Z"
      }
    ]
  }
];

/**
 * Răspunsul „de mimă” folosit când utilizatorul trimite un mesaj nou.
 *
 * Există dintr-un singur motiv: fără el, butonul de trimitere, indicatorul
 * „scrie…” și butonul de stop n-ar avea ce să declanșeze, iar stările astea de
 * interfață ar rămâne netestate până la integrarea reală.
 *
 * Este singurul loc care va fi înlocuit cu apelul la model. Restul aplicației nu
 * știe de unde vine textul, deci nu se schimbă.
 */
export const MOCK_ASSISTANT_REPLY =
  "Momentan răspund din date inventate — încă nu e conectat niciun model de limbaj.\n\nCe funcționează deja este tot ce vezi în jur: conversațiile, profilul, tema, stările de încărcare și eroare. La pasul următor, exact acest text va fi înlocuit de răspunsul real, primit în streaming, iar restul interfeței rămâne neschimbat.";

/**
 * Titlul unei conversații noi. Stă aici, lângă restul conținutului inventat,
 * pentru că în F3 titlul va fi generat din primul mesaj — tot o dată cu datele.
 */
export const NEW_CONVERSATION_TITLE = "Conversație nouă";
