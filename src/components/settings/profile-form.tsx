"use client";

import { useState } from "react";
import { ShieldAlert, Trash2, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SKILL_LEVELS, isSkillLevel, type Profile, type Skill } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

// Formularul de profil — locul în care SkillForge încetează să fie un chat generic.
//
// De ce există deja acum, deși modelul nu e conectat: în F2, din exact aceste
// câmpuri se va construi system prompt-ul. Dacă structura lor se stabilește abia
// atunci, formularul și promptul se nasc în același timp și se influențează
// reciproc prost. Așa, forma datelor e fixată și verificată de om înainte.

/**
 * Skill-urile se editează ca text liber, o pereche pe linie, în loc de o listă
 * cu butoane de adăugare/ștergere.
 *
 * Motivul e viteza de introducere: cine își scrie profilul întâi tastează zece
 * rânduri, nu apasă de zece ori „adaugă". Costul e că textul trebuie tradus în
 * date structurate și că pot exista linii greșite — de aici funcția de mai jos
 * și mesajul de eroare, în loc să acceptăm în tăcere ce nu înțelegem.
 */
function parseSkills(raw: string): { skills: Skill[]; invalidLines: string[] } {
  const skills: Skill[] = [];
  const invalidLines: string[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // `separatorIndex`, nu `split(":")`: un skill poate conține „:" în nume
    // („C#: avansat" e simplu, dar „raport 1:1 cu mentorul: intermediar" nu e).
    // Despărțim la ULTIMA apariție, pentru că nivelul e mereu la final.
    const separatorIndex = trimmed.lastIndexOf(":");
    if (separatorIndex === -1) {
      invalidLines.push(trimmed);
      continue;
    }

    const name = trimmed.slice(0, separatorIndex).trim();
    const level = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .toLowerCase();

    if (!name || !isSkillLevel(level)) {
      invalidLines.push(trimmed);
      continue;
    }

    skills.push({ name, level });
  }

  return { skills, invalidLines };
}

function skillsToText(skills: Skill[]): string {
  return skills.map(skill => `${skill.name}: ${skill.level}`).join("\n");
}

export function ProfileForm() {
  const profile = useAppStore(state => state.profile);
  const setProfile = useAppStore(state => state.setProfile);
  const clearProfile = useAppStore(state => state.clearProfile);

  // Textul brut trăiește local, nu în store, pentru că în timpul tastării trece
  // prin stări invalide („React: interm"). Salvat direct, profilul ar pierde
  // skill-uri la fiecare literă scrisă.
  const [skillsText, setSkillsText] = useState(() => skillsToText(profile.skills));

  const { skills, invalidLines } = parseSkills(skillsText);

  const updateField = (field: keyof Pick<Profile, "name" | "stack" | "goal">, value: string) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleSkillsChange = (value: string) => {
    setSkillsText(value);
    // Salvăm doar liniile valide. Cele greșite rămân vizibile în textarea și
    // semnalate mai jos — utilizatorul le poate repara fără să piardă restul.
    setProfile({ ...profile, skills: parseSkills(value).skills });
  };

  const handleClear = () => {
    clearProfile();
    // `skillsText` trăiește local (vezi comentariul de mai sus) și nu se
    // resetează singur odată cu store-ul — trebuie golit explicit, altfel
    // textarea ar arăta skill-urile vechi deasupra unui profil deja șters.
    setSkillsText("");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-medium">Profilul tău</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Din datele astea se va construi contextul trimis modelului. Cu cât sunt mai concrete, cu atât răspunsurile
          sunt mai puțin generice.
        </p>
      </div>

      {/* Notă de transparență: profilul e dată personală, chiar dacă nu e
          „sensibilă" în sens legal (§8.2 din requirements). Utilizatorul are
          dreptul să știe unde stă, cine-l vede și cum îl șterge — fără să
          citească un README ca să afle. */}
      <Alert>
        <ShieldAlert />
        <AlertTitle>Unde stă profilul tău</AlertTitle>
        <AlertDescription>
          Salvat doar în acest browser (<code className="font-mono">localStorage</code>), nu pe un server — alt
          calculator sau golirea datelor de site îl șterge ireversibil, fără backup. E trimis către Anthropic
          (providerul modelului) la fiecare mesaj din conversație, ca răspunsul să țină cont de el. Poți renunța la el
          oricând cu butonul de mai jos.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-name">Nume</Label>
        <Input
          id="profile-name"
          value={profile.name}
          onChange={event => updateField("name", event.target.value)}
          placeholder="Cum vrei să ți se adreseze"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-stack">Stack actual</Label>
        <Input
          id="profile-stack"
          value={profile.stack}
          onChange={event => updateField("stack", event.target.value)}
          placeholder="Ex.: C# / .NET, SQL Server, un pic de JavaScript"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="profile-skills">Skills</Label>
          <span className="text-xs text-muted-foreground">
            {skills.length} {skills.length === 1 ? "skill valid" : "skill-uri valide"}
          </span>
        </div>

        <Textarea
          id="profile-skills"
          value={skillsText}
          onChange={event => handleSkillsChange(event.target.value)}
          rows={8}
          className="font-mono text-sm"
          placeholder={"C#: avansat\nReact: începător"}
        />

        <p className="text-xs text-muted-foreground">
          O pereche pe linie, în formatul <code className="font-mono">nume: nivel</code>. Niveluri acceptate:{" "}
          {SKILL_LEVELS.map(level => (
            <Badge key={level} variant="secondary" className="mx-0.5 font-normal">
              {level}
            </Badge>
          ))}
        </p>

        {/* Eroarea se arată doar când există, și spune exact ce linie e greșită.
            Un „date invalide" generic ar lăsa utilizatorul să caute singur. */}
        {invalidLines.length > 0 && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>
              {invalidLines.length === 1
                ? "O linie nu a putut fi citită"
                : `${invalidLines.length} linii nu au putut fi citite`}
            </AlertTitle>
            <AlertDescription>
              <span>Restul s-au salvat. De reparat:</span>
              <ul className="mt-1 list-disc pl-4">
                {invalidLines.map(line => (
                  <li key={line} className="font-mono text-xs">
                    {line}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-goal">Obiectiv</Label>
        <Input
          id="profile-goal"
          value={profile.goal}
          onChange={event => updateField("goal", event.target.value)}
          placeholder="Ex.: rol de AI Engineer în 12 luni"
        />
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          className="w-fit text-destructive hover:text-destructive"
          onClick={handleClear}
        >
          <Trash2 />
          Șterge profilul
        </Button>
        <p className="text-xs text-muted-foreground">
          Golește numele, stack-ul, skill-urile și obiectivul din acest browser. Conversațiile nu sunt afectate.
        </p>
      </div>
    </div>
  );
}
