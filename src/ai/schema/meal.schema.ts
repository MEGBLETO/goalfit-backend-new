import { z } from 'zod';

export const mealSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  calories: z.number(),
});

export const dailyMealPlanSchema = z.object({
  date: z.string(),
  meals: z.object({
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema,
    snack: mealSchema.optional(),
  }),
});

export const fullMealPlanSchema = z.object({
  days: z.array(dailyMealPlanSchema),
});
