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

👉 Format de réponse JSON strict :

[
  {
    "date": "YYYY-MM-DD",
    "meals": {
      "breakfast": {
        "title": "Nom du plat",
        "ingredients": ["ingrédient 1", "ingrédient 2"],
        "instructions": ["étape 1", "étape 2"],
        "calories": nombre
      },
      "lunch": { ... },
      "dinner": { ... },
      "snack": { ... }
    }
  },
  ...
]

 Les instructions doivent être un **tableau de courtes phrases**.
 Réponds uniquement avec un tableau JSON, sans texte explicatif ni balisage.
 Les calories doivent être réalistes pour un objectif de ${user.goal}.
`;
};
