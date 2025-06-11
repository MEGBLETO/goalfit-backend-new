export const buildMultiDayMealPrompt = (
  user: {
    gender: string;
    age: number;
    weight: number;
    height: number;
    fitnessLevel: string;
    dietaryPreferences?: string[];
    healthConsiderations?: string[];
    goal: string;
    availability: {
      daysPerWeek: number;
      minutesPerDay: number;
    };
  },
  dates: string[],
) => {
  const datesList = dates.map((date) => `- ${date}`).join('\n');

  return `
Tu es un assistant nutritionniste.

En te basant sur ces données :
- Genre : ${user.gender}
- Âge : ${user.age} ans
- Poids : ${user.weight} kg
- Taille : ${user.height} cm
- Niveau de forme : ${user.fitnessLevel}
- Objectif : ${user.goal}
- Disponibilité : ${user.availability.daysPerWeek} jours/semaine, ${user.availability.minutesPerDay} min/jour
${user.dietaryPreferences?.length ? `- Préférences alimentaires : ${user.dietaryPreferences.join(', ')}` : ''}
${user.healthConsiderations?.length ? `- Contraintes de santé : ${user.healthConsiderations.join(', ')}` : ''}

Génère un plan de repas personnalisé pour chaque jour parmi les dates suivantes :
${datesList}

[
  {
    "date": "YYYY-MM-DD",
    "meals": {
      "breakfast": {
        "title": "Nom du plat",
        "ingredients": ["ingrédient 1", "ingrédient 2"],
        "instructions": ["étape 1", "étape 2"],
        "calories": nombre,
        "macros": {
          "carbs": nombre,
          "proteins": nombre,
          "fats": nombre
        }
      },
      "lunch": { ... même format ... },
      "dinner": { ... même format ... },
      "snack": { ... même format ... }
    }
  },
  ...
]

Les instructions doivent être un **tableau de courtes phrases**.
Chaque repas doit inclure un objet \`macros\` indiquant la quantité de **glucides (carbs), protéines (proteins) et lipides (fats) en grammes.
Réponds uniquement avec un tableau JSON **valide**, sans texte explicatif ni balises.
Les calories et macros doivent être cohérents et adaptés à l’objectif : ${user.goal}.
`;
};
