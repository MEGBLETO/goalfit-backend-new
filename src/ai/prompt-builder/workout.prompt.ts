export const buildMultiDayWorkoutPrompt = (
  user: {
    gender: string;
    age: number;
    weight: number;
    height: number;
    fitnessLevel: string;
    equipment?: string[];
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
Tu es un coach sportif personnel.

Voici les données de l'utilisateur :
- Genre : ${user.gender}
- Âge : ${user.age} ans
- Poids : ${user.weight} kg
- Taille : ${user.height} cm
- Niveau de forme : ${user.fitnessLevel}
- Objectif : ${user.goal}
- Disponibilité : ${user.availability.daysPerWeek} jours/semaine, ${user.availability.minutesPerDay} minutes/jour
${user.equipment?.length ? `- Matériel disponible : ${user.equipment.join(', ')}` : ''}
${user.healthConsiderations?.length ? `- Problèmes de santé : ${user.healthConsiderations.join(', ')}` : ''}

Génère un plan d'entraînement personnalisé pour chacune des dates suivantes :
${datesList}

Format de réponse JSON strict (tableau d'objets) :

[
  {
    "date": "YYYY-MM-DD",
    "exercises": [
      {
        "name": "nom de l'exercice",
        "description": "courte description",
        "reps": "3x12",
        "durationMinutes": 15,
        "focus": "haut du corps" | "jambes" | "core" | "cardio" | "plein corps",
        "estimatedCalories": 150
      },
      ...
    ]
  },
  ...
]

Chaque date doit avoir entre 3 à 5 exercices.
Les calories doivent être réalistes.
Réponds uniquement avec un tableau JSON, sans texte ou explication.
`;
};
