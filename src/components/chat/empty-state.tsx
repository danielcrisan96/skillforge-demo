"use client";

import { Compass, GraduationCap, Target, User, Wand2, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

// Ecranul de conversație nouă.
//
// De ce nu e o pagină goală cu un cursor care clipește: momentul ăsta e cel în
// care utilizatorul nu știe ce poate cere. Un ecran gol mută pe el sarcina de a
// ghici la ce e bună aplicația. Salutul cu numele lui și patru sugestii concrete
// răspund la întrebarea „ce pot să întreb aici" fără să citească documentație.
//
// De ce sugestiile doar completează inputul, în loc să trimită direct: prima
// întrebare aproape niciodată nu e bună exact așa cum e propusă. Textul pus în
// composer poate fi ajustat înainte de trimitere — sugestia e un punct de
// plecare, nu o comandă.

type Suggestion = {
  label: string;
  icon: LucideIcon;
  /** Textul pus în composer. Formulat la persoana I, ca și cum l-ar fi scris utilizatorul. */
  prompt: string;
};

/**
 * Registru, nu patru butoane copiate. Sugestiile se vor schimba des (în F5 vor
 * putea depinde de profil), deci trebuie să fie date, nu marcaj.
 */
const SUGGESTIONS: Suggestion[] = [
  {
    label: "Plan de învățare",
    icon: GraduationCap,
    prompt: "Fă-mi un plan de învățare pentru următoarele 4 săptămâni, pornind de la skill-urile din profilul meu."
  },
  {
    label: "Gap analysis",
    icon: Target,
    prompt: "Ce-mi lipsește ca să ajung la obiectivul din profil? Spune-mi și ce NU trebuie să învăț."
  },
  {
    label: "Pregătire interviu",
    icon: Compass,
    prompt: "Ce întrebări de interviu mi se pot pune, dat fiind stack-ul meu actual și rolul spre care merg?"
  },
  {
    label: "Alege tu",
    icon: Wand2,
    prompt: "Uită-te la profilul meu și spune-mi tu care e cel mai util lucru de discutat acum."
  }
];

export function EmptyState({ onSuggestionSelect }: { onSuggestionSelect: (prompt: string) => void }) {
  const name = useAppStore(state => state.profile.name);
  const goal = useAppStore(state => state.profile.goal);

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">SkillForge</h1>
        <p className="text-lg text-muted-foreground">
          {name ? `Salut, ${name}. Cu ce mergem mai departe?` : "Cu ce mergem mai departe?"}
        </p>

        {/* Singurul semn din interfață că profilul chiar ajunge la model —
            fără el, testarea personei ar însemna ghicit din răspunsuri. Textul
            arată exact ce va folosi system prompt-ul, ca discrepanța dintre
            „am completat profilul" și „modelul îl vede" să fie vizibilă imediat. */}
        <div className="mt-1 flex justify-center">
          {goal ? (
            <Badge variant="secondary">
              <Target />
              Profil activ · {goal}
            </Badge>
          ) : (
            <Badge variant="outline">
              <User />
              Profil necompletat — răspunsurile vor fi generice
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map(suggestion => (
          <Button
            key={suggestion.label}
            variant="outline"
            size="sm"
            onClick={() => onSuggestionSelect(suggestion.prompt)}
          >
            <suggestion.icon />
            {suggestion.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
