import type { Profile } from "@/lib/types";

// Profilul inventat cu care pornește aplicația la prima deschidere.
//
// De ce există: fără el, primul ecran ar fi un formular gol, iar salutul din
// pagina de conversație nouă n-ar avea ce nume să folosească. Un profil
// pre-completat arată din prima ce înseamnă „răspunde în contextul meu".
//
// De ce stă aici și nu în store: `src/lib/mock/` e singurul loc din proiect cu
// date inventate. Când profilul va veni din `localStorage`-ul real (F2) sau din
// baza de date (F6), se schimbă sursa importului, nu logica din store.

export const MOCK_PROFILE: Profile = {
  // `userId` fix, pentru că în pasul acesta nu există autentificare. Vezi D-7:
  // câmpul există de pe acum ca F6 să nu fie o rescriere.
  userId: "local-user",
  name: "Daniel",
  stack: "C# / .NET, SQL Server, un pic de JavaScript",
  skills: [
    { name: "C#", level: "avansat" },
    { name: "SQL", level: "avansat" },
    { name: "REST API", level: "intermediar" },
    { name: "JavaScript", level: "intermediar" },
    { name: "React", level: "începător" },
    { name: "Docker", level: "începător" },
    { name: "LLM / prompting", level: "începător" }
  ],
  goal: "Rol de AI Engineer în 12 luni, fără să renunț la partea de backend"
};
