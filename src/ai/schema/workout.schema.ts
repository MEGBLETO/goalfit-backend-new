import { z } from 'zod';

export const flatExerciseSchema = z.object({
  name: z.string(),
  reps: z.string(),
  description: z.string().optional(),
  focus: z.string(),
  durationMinutes: z.number(),
  estimatedCalories: z.number(),
});

export const flatDailyWorkoutSchema = z.object({
  date: z.string(),
  exercises: z.array(flatExerciseSchema),
});

export const fullWorkoutPlanSchema = z.object({
  days: z.array(flatDailyWorkoutSchema),
});
