import { z } from 'zod';

export const exerciseSchema = z.object({
  name: z.string(),
  reps: z.string(),
  bodyPart: z.string().optional(),
  description: z.string().optional(),
});

export const workoutSchema = z.object({
  name: z.string(),
  description: z.string(),
  durationMin: z.number(),
  intensity: z.string(),
  estimatedCalories: z.number(),
  exercises: z.array(exerciseSchema),
});

export const dailyWorkoutPlanSchema = z.object({
  date: z.string(),
  workouts: z.array(workoutSchema),
});

export const fullWorkoutPlanSchema = z.object({
  days: z.array(dailyWorkoutPlanSchema),
});
