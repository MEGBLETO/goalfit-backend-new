import { z } from 'zod';

const macrosSchema = z.object({
  carbs: z.number(),
  proteins: z.number(),
  fats: z.number(),
});

export const mealSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  calories: z.number(),
  macros: macrosSchema,
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
