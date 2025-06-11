import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { fullWorkoutPlanSchema } from '../schema/workout.schema';
import { buildMultiDayWorkoutPrompt } from '../prompt-builder/workout.prompt';

@Injectable()
export class WorkoutService {
  constructor(private readonly openaiService: OpenaiService) {}

  async generateDailyWorkoutPlans(userData: any, days: string[] = []) {
    try {
      const prompt = buildMultiDayWorkoutPrompt(userData, days);
      const raw = await this.openaiService.chatWithJsonPrompt(prompt);

      const cleanJson = raw.replace(/```json|```/g, '').trim();
      const formattedJson = `{ "days": ${cleanJson} }`;

      console.log(formattedJson, 'Generated Workout Plan');

      const parsed = fullWorkoutPlanSchema.safeParse(JSON.parse(formattedJson));

      if (!parsed.success) {
        console.error('Invalid AI response:', parsed.error.format());
        throw new Error('Invalid workout plan format');
      }

      return parsed.data;
    } catch (error) {
      console.error('Failed to generate workout plan:', error);
      throw new InternalServerErrorException(
        'Unable to generate workout plan at this time',
      );
    }
  }
}
