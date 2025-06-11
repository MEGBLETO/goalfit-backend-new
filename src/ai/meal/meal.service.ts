import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { buildMultiDayMealPrompt } from '../prompt-builder/meal.prompt';
import { fullMealPlanSchema } from '../schema/meal.schema';

@Injectable()
export class MealService {
  constructor(private readonly openaiService: OpenaiService) {}

  async generateDailyMealPlans(userData: any, days: string[] = []) {
    try {
      const prompt = buildMultiDayMealPrompt(userData, days);
      const raw = await this.openaiService.chatWithJsonPrompt(prompt);

      const cleanJson = raw.replace(/```json|```/g, '').trim();

      const formattedJson = `{ "days": ${cleanJson} }`;

      console.log(formattedJson, 'hellloooo');

      const parsed = fullMealPlanSchema.safeParse(JSON.parse(formattedJson));
      if (!parsed.success) {
        console.error('Invalid AI response:', parsed.error.format());
        throw new Error('Invalid meal plan format');
      }

      return parsed.data;
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      throw new InternalServerErrorException(
        'Unable to generate meal plan at this time',
      );
    }
  }
}
