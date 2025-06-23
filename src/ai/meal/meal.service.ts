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

  async generateDefaultMealPlan(days: string[] = []) {
    try {
      const defaultDays = days.length > 0 ? days : this.generateDefaultDates(7);

      const defaultMealPlan = {
        days: defaultDays.map((date) => ({
          date,
          meals: {
            breakfast: {
              title: 'Petit-déjeuner équilibré',
              ingredients: ["Flocons d'avoine", 'Lait', 'Banane', 'Miel'],
              instructions: [
                "Cuire les flocons d'avoine avec le lait",
                'Ajouter la banane coupée',
                'Arroser de miel',
              ],
              calories: 350,
              macros: {
                carbs: 60,
                proteins: 12,
                fats: 8,
              },
            },
            lunch: {
              title: 'Salade composée',
              ingredients: [
                'Salade verte',
                'Tomates',
                'Concombre',
                'Thon',
                "Huile d'olive",
              ],
              instructions: [
                'Laver et couper les légumes',
                'Ajouter le thon',
                "Assaisonner avec l'huile d'olive",
              ],
              calories: 400,
              macros: {
                carbs: 15,
                proteins: 25,
                fats: 20,
              },
            },
            dinner: {
              title: 'Poulet grillé avec légumes',
              ingredients: [
                'Blanc de poulet',
                'Brocoli',
                'Riz complet',
                'Épices',
              ],
              instructions: [
                'Griller le poulet avec les épices',
                'Cuire le riz complet',
                'Faire cuire les légumes à la vapeur',
              ],
              calories: 450,
              macros: {
                carbs: 45,
                proteins: 35,
                fats: 15,
              },
            },
            snack: {
              title: 'Fruits et noix',
              ingredients: ['Pomme', 'Amandes', 'Noix'],
              instructions: [
                'Couper la pomme en tranches',
                'Servir avec les noix',
              ],
              calories: 200,
              macros: {
                carbs: 25,
                proteins: 6,
                fats: 12,
              },
            },
          },
        })),
      };

      return defaultMealPlan;
    } catch (error) {
      console.error('Failed to generate default meal plan:', error);
      throw new InternalServerErrorException(
        'Unable to generate default meal plan at this time',
      );
    }
  }

  private generateDefaultDates(count: number): string[] {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  }
}
