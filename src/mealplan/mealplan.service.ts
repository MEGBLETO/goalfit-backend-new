import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MealService } from '../ai/meal/meal.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class MealPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mealService: MealService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async getMealPlans(userId: string) {
    const logger = new Logger(MealPlanService.name);
    try {
      logger.log(`Starting getMealPlans for user ${userId}`);

      const hasActiveSubscription =
        await this.subscriptionService.hasActiveSubscription(userId);

      if (hasActiveSubscription) {
        logger.log(
          `[MealPlanService] User ${userId} has active subscription. Looking for user-specific meal plans.`,
        );

        const startDate = new Date();
        startDate.setUTCHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        const userMealPlans = await this.prisma.mealPlan.findMany({
          where: {
            userId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { date: 'asc' },
        });

        logger.log(
          `[MealPlanService] Found ${userMealPlans.length} user-specific meal plans for user ${userId}.`,
        );

        if (userMealPlans.length > 0) {
          logger.log('[MealPlanService] Returning user-specific meal plans.');
          return userMealPlans.map((plan) => ({
            day: plan.date,
            ...(plan.content as any),
          }));
        }
      }

      logger.log(
        '[MealPlanService] No user-specific meal plans found or user is not subscribed. Falling back to default plans.',
      );
      return this.getDefaultMealPlans();
    } catch (error) {
      logger.error('Error getting meal plans:', error);
      throw error;
    }
  }

  async getDefaultMealPlans() {
    const logger = new Logger(MealPlanService.name);
    try {
      const existingDefaultPlans = await this.prisma.mealPlan.findMany({
        where: {
          isDefault: true,
          userId: null,
          date: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { date: 'asc' },
      });

      if (existingDefaultPlans.length > 0) {
        return existingDefaultPlans.map((plan) => ({
          day: plan.date,
          ...(plan.content as any),
        }));
      }

      // If no default plans exist, generate them using AI
      logger.log(
        '[MealPlanService] No existing default plans found. Generating new ones.',
      );
      return this.generateAndStoreDefaultMealPlans(7);
    } catch (error) {
      logger.error('Error getting default meal plans:', error);
      throw error;
    }
  }

  async generateAndStoreDefaultMealPlans(days: number = 7) {
    const logger = new Logger(MealPlanService.name);
    try {
      const aiGeneratedPlans = await this.generateDefaultMealPlans(days);

      const storedPlans = [];
      for (const mealPlan of aiGeneratedPlans) {
        const storedPlan = await this.prisma.mealPlan.create({
          data: {
            date: new Date(mealPlan.day),
            content: mealPlan,
            isDefault: true,
            calories: this.calculateTotalCalories(mealPlan),
            protein: this.calculateTotalProtein(mealPlan),
            carbs: this.calculateTotalCarbs(mealPlan),
            fat: this.calculateTotalFat(mealPlan),
          },
        });
        storedPlans.push(storedPlan);
      }

      return aiGeneratedPlans;
    } catch (error) {
      logger.error('Error generating and storing default meal plans:', error);
      throw error;
    }
  }

  async generateDefaultMealPlans(days: number = 7) {
    const logger = new Logger(MealPlanService.name);
    try {
      // Generate default dates
      const dates = this.generateDefaultDates(days);

      const defaultUserData = {
        gender: 'homme',
        age: 30,
        weight: 70,
        height: 170,
        fitnessLevel: 'débutant',
        goal: 'maintenance',
        dietaryPreferences: [],
        healthConsiderations: [],
        equipment: [],
        availability: {
          daysPerWeek: 3,
          minutesPerDay: 30,
        },
      };

      const aiGeneratedPlans = await this.mealService.generateDailyMealPlans(
        defaultUserData,
        dates,
      );

      return aiGeneratedPlans.days.map((day) => ({
        day: day.date,
        breakfast: {
          name: day.meals.breakfast.title,
          nutrition: {
            calories: day.meals.breakfast.calories,
            protein: day.meals.breakfast.macros.proteins,
            carbs: day.meals.breakfast.macros.carbs,
            fat: day.meals.breakfast.macros.fats,
          },
          ingredients: day.meals.breakfast.ingredients,
          instructions: day.meals.breakfast.instructions,
          duration: 15,
        },
        lunch: {
          name: day.meals.lunch.title,
          nutrition: {
            calories: day.meals.lunch.calories,
            protein: day.meals.lunch.macros.proteins,
            carbs: day.meals.lunch.macros.carbs,
            fat: day.meals.lunch.macros.fats,
          },
          ingredients: day.meals.lunch.ingredients,
          instructions: day.meals.lunch.instructions,
          duration: 20,
        },
        dinner: {
          name: day.meals.dinner.title,
          nutrition: {
            calories: day.meals.dinner.calories,
            protein: day.meals.dinner.macros.proteins,
            carbs: day.meals.dinner.macros.carbs,
            fat: day.meals.dinner.macros.fats,
          },
          ingredients: day.meals.dinner.ingredients,
          instructions: day.meals.dinner.instructions,
          duration: 30,
        },
        snack: day.meals.snack
          ? {
              name: day.meals.snack.title,
              nutrition: {
                calories: day.meals.snack.calories,
                protein: day.meals.snack.macros.proteins,
                carbs: day.meals.snack.macros.carbs,
                fat: day.meals.snack.macros.fats,
              },
              ingredients: day.meals.snack.ingredients,
              instructions: day.meals.snack.instructions,
              duration: 10,
            }
          : null,
      }));
    } catch (error) {
      logger.error('Error generating default meal plans with AI:', error);
      return this.generateStaticDefaultMealPlans(days);
    }
  }

  async generateAndStoreMealPlans(mealPlans: any[], userId: string) {
    const logger = new Logger(MealPlanService.name);
    try {
      // Check if user has active subscription
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true,
          profile: {
            include: {
              dietaryPreferences: true,
              availability: true,
              goals: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.subscription || user.subscription.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Active subscription required to generate custom meal plans',
        );
      }

      const storedPlans = [];
      for (const mealPlan of mealPlans) {
        const planDate = new Date(mealPlan.day);
        planDate.setUTCHours(0, 0, 0, 0);

        const storedPlan = await this.prisma.mealPlan.upsert({
          where: {
            userId_date: {
              userId,
              date: planDate,
            },
          },
          update: {
            content: mealPlan,
            isDefault: false,
            calories: this.calculateTotalCalories(mealPlan),
            protein: this.calculateTotalProtein(mealPlan),
            carbs: this.calculateTotalCarbs(mealPlan),
            fat: this.calculateTotalFat(mealPlan),
          },
          create: {
            userId,
            date: planDate,
            content: mealPlan,
            isDefault: false,
            calories: this.calculateTotalCalories(mealPlan),
            protein: this.calculateTotalProtein(mealPlan),
            carbs: this.calculateTotalCarbs(mealPlan),
            fat: this.calculateTotalFat(mealPlan),
          },
        });
        logger.log(
          `[MealPlanService] Upserted meal plan for user ${userId} on date ${planDate.toISOString()}`,
        );
        storedPlans.push(storedPlan);
      }

      return {
        message: 'Meal plans generated and stored successfully',
        count: storedPlans.length,
        plans: storedPlans,
      };
    } catch (error) {
      logger.error('Error generating and storing meal plans:', error);
      throw error;
    }
  }

  async generateCustomMealPlansForUser(userId: string) {
    const logger = new Logger(MealPlanService.name);
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            include: {
              dietaryPreferences: true,
              availability: true,
              goals: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create detailed user data for custom plans
      const customUserData = {
        gender: user.profile?.gender || 'homme',
        age: this.calculateAge(user.profile?.dateOfBirth) || 30,
        weight: user.profile?.weight || 70,
        height: user.profile?.height || 170,
        fitnessLevel: user.profile?.fitnessLevel || 'débutant',
        goal: user.profile?.goals?.[0]?.name || 'maintenance',
        dietaryPreferences:
          user.profile?.dietaryPreferences?.restrictions || [],
        healthConsiderations: user.profile?.healthConsiderations || [],
        equipment: user.profile?.equipment || [],
        availability: user.profile?.availability || {
          daysPerWeek: 3,
          minutesPerDay: 30,
        },
      };

      const aiGeneratedPlans = await this.mealService.generateDailyMealPlans(
        customUserData,
        this.generateDefaultDates(7),
      );

      const transformedPlans = aiGeneratedPlans.days.map((day) => ({
        day: day.date,
        breakfast: {
          name: day.meals.breakfast.title,
          nutrition: {
            calories: day.meals.breakfast.calories,
            protein: day.meals.breakfast.macros.proteins,
            carbs: day.meals.breakfast.macros.carbs,
            fat: day.meals.breakfast.macros.fats,
          },
          ingredients: day.meals.breakfast.ingredients,
          instructions: day.meals.breakfast.instructions,
          duration: 15,
        },
        lunch: {
          name: day.meals.lunch.title,
          nutrition: {
            calories: day.meals.lunch.calories,
            protein: day.meals.lunch.macros.proteins,
            carbs: day.meals.lunch.macros.carbs,
            fat: day.meals.lunch.macros.fats,
          },
          ingredients: day.meals.lunch.ingredients,
          instructions: day.meals.lunch.instructions,
          duration: 20,
        },
        dinner: {
          name: day.meals.dinner.title,
          nutrition: {
            calories: day.meals.dinner.calories,
            protein: day.meals.dinner.macros.proteins,
            carbs: day.meals.dinner.macros.carbs,
            fat: day.meals.dinner.macros.fats,
          },
          ingredients: day.meals.dinner.ingredients,
          instructions: day.meals.dinner.instructions,
          duration: 30,
        },
        snack: day.meals.snack
          ? {
              name: day.meals.snack.title,
              nutrition: {
                calories: day.meals.snack.calories,
                protein: day.meals.snack.macros.proteins,
                carbs: day.meals.snack.macros.carbs,
                fat: day.meals.snack.macros.fats,
              },
              ingredients: day.meals.snack.ingredients,
              instructions: day.meals.snack.instructions,
              duration: 10,
            }
          : null,
      }));

      return transformedPlans;
    } catch (error) {
      logger.error('Error generating custom meal plans with AI:', error);
      throw error;
    }
  }

  async triggerUserMealPlanGeneration(userId: string) {
    const logger = new Logger(MealPlanService.name);
    try {
      // First, generate the custom meal plans using the user's profile
      const generatedPlans = await this.generateCustomMealPlansForUser(userId);

      if (!generatedPlans || generatedPlans.length === 0) {
        throw new Error('AI generation failed to return plans.');
      }

      // Then, store these newly generated plans in the database
      return await this.generateAndStoreMealPlans(generatedPlans, userId);
    } catch (error) {
      logger.error(
        `Error triggering meal plan generation for user ${userId}:`,
        error,
      );
      throw error;
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

  private calculateAge(dateOfBirth: Date | null): number | null {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private generateStaticDefaultMealPlans(days: number = 7) {
    const defaultMealPlans = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      defaultMealPlans.push({
        day: date.toISOString().split('T')[0],
        breakfast: {
          name: 'Petit-déjeuner équilibré',
          nutrition: {
            calories: 350,
            protein: 12,
            carbs: 60,
            fat: 8,
          },
          ingredients: ["Flocons d'avoine", 'Lait', 'Banane', 'Miel'],
          instructions: [
            "Cuire les flocons d'avoine avec le lait",
            'Ajouter la banane coupée',
            'Arroser de miel',
          ],
          duration: 15,
        },
        lunch: {
          name: 'Salade composée',
          nutrition: {
            calories: 400,
            protein: 25,
            carbs: 15,
            fat: 20,
          },
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
          duration: 20,
        },
        dinner: {
          name: 'Poulet grillé avec légumes',
          nutrition: {
            calories: 450,
            protein: 35,
            carbs: 45,
            fat: 15,
          },
          ingredients: ['Blanc de poulet', 'Brocoli', 'Riz complet', 'Épices'],
          instructions: [
            'Griller le poulet avec les épices',
            'Cuire le riz complet',
            'Faire cuire les légumes à la vapeur',
          ],
          duration: 30,
        },
      });
    }

    return defaultMealPlans;
  }

  private calculateTotalCalories(mealPlan: any): number {
    let totalCalories = 0;
    if (mealPlan.breakfast)
      totalCalories += mealPlan.breakfast.nutrition.calories;
    if (mealPlan.lunch) totalCalories += mealPlan.lunch.nutrition.calories;
    if (mealPlan.dinner) totalCalories += mealPlan.dinner.nutrition.calories;
    if (mealPlan.snack) totalCalories += mealPlan.snack.nutrition.calories;
    return totalCalories;
  }

  private calculateTotalProtein(mealPlan: any): number {
    let totalProtein = 0;
    if (mealPlan.breakfast)
      totalProtein += mealPlan.breakfast.nutrition.protein;
    if (mealPlan.lunch) totalProtein += mealPlan.lunch.nutrition.protein;
    if (mealPlan.dinner) totalProtein += mealPlan.dinner.nutrition.protein;
    if (mealPlan.snack) totalProtein += mealPlan.snack.nutrition.protein;
    return totalProtein;
  }

  private calculateTotalCarbs(mealPlan: any): number {
    let totalCarbs = 0;
    if (mealPlan.breakfast) totalCarbs += mealPlan.breakfast.nutrition.carbs;
    if (mealPlan.lunch) totalCarbs += mealPlan.lunch.nutrition.carbs;
    if (mealPlan.dinner) totalCarbs += mealPlan.dinner.nutrition.carbs;
    if (mealPlan.snack) totalCarbs += mealPlan.snack.nutrition.carbs;
    return totalCarbs;
  }

  private calculateTotalFat(mealPlan: any): number {
    let totalFat = 0;
    if (mealPlan.breakfast) totalFat += mealPlan.breakfast.nutrition.fat;
    if (mealPlan.lunch) totalFat += mealPlan.lunch.nutrition.fat;
    if (mealPlan.dinner) totalFat += mealPlan.dinner.nutrition.fat;
    if (mealPlan.snack) totalFat += mealPlan.snack.nutrition.fat;
    return totalFat;
  }

  // Helper to get existing meal plan dates for a user or default
  private async getExistingMealPlanDates(
    userId: string | null,
    dates: string[],
  ): Promise<string[]> {
    const where: any = {
      date: { in: dates.map((date) => new Date(date)) },
    };
    if (userId) {
      where.userId = userId;
    } else {
      where.isDefault = true;
    }
    const existingPlans = await this.prisma.mealPlan.findMany({
      where,
      select: { date: true },
    });
    return existingPlans.map((plan) => plan.date.toISOString().split('T')[0]);
  }

  async generateAndStoreMealPlan(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            dietaryPreferences: true,
            availability: true,
            goals: true,
          },
        },
      },
    });

    if (!user || !user.profile) {
      throw new NotFoundException(`User profile not found for ID: ${userId}`);
    }

    const userData = {
      gender: user.profile.gender || 'homme',
      age: this.calculateAge(user.profile.dateOfBirth) || 30,
      weight: user.profile.weight || 70,
      height: user.profile.height || 170,
      fitnessLevel: user.profile.fitnessLevel || 'débutant',
      goal: user.profile.goals?.[0]?.name || 'maintenance',
      dietaryPreferences: user.profile.dietaryPreferences?.restrictions || [],
      healthConsiderations: user.profile.healthConsiderations || [],
      equipment: user.profile.equipment || [],
      availability: user.profile.availability || {
        daysPerWeek: 3,
        minutesPerDay: 30,
      },
    };

    const dates = this.generateDefaultDates(7);
    const existingDates = await this.getExistingMealPlanDates(userId, dates);
    const missingDates = dates.filter((date) => !existingDates.includes(date));
    if (missingDates.length === 0) {
      return { message: 'All days already have a meal plan.' };
    }

    const aiGeneratedPlans = await this.mealService.generateDailyMealPlans(
      userData,
      missingDates,
    );

    const storedPlans = [];
    for (const day of aiGeneratedPlans.days) {
      const mealPlan = {
        day: day.date,
        breakfast: {
          name: day.meals.breakfast.title,
          nutrition: {
            calories: day.meals.breakfast.calories,
            protein: day.meals.breakfast.macros.proteins,
            carbs: day.meals.breakfast.macros.carbs,
            fat: day.meals.breakfast.macros.fats,
          },
          ingredients: day.meals.breakfast.ingredients,
          instructions: day.meals.breakfast.instructions,
          duration: 15,
        },
        lunch: {
          name: day.meals.lunch.title,
          nutrition: {
            calories: day.meals.lunch.calories,
            protein: day.meals.lunch.macros.proteins,
            carbs: day.meals.lunch.macros.carbs,
            fat: day.meals.lunch.macros.fats,
          },
          ingredients: day.meals.lunch.ingredients,
          instructions: day.meals.lunch.instructions,
          duration: 20,
        },
        dinner: {
          name: day.meals.dinner.title,
          nutrition: {
            calories: day.meals.dinner.calories,
            protein: day.meals.dinner.macros.proteins,
            carbs: day.meals.dinner.macros.carbs,
            fat: day.meals.dinner.macros.fats,
          },
          ingredients: day.meals.dinner.ingredients,
          instructions: day.meals.dinner.instructions,
          duration: 30,
        },
        snack: day.meals.snack
          ? {
              name: day.meals.snack.title,
              nutrition: {
                calories: day.meals.snack.calories,
                protein: day.meals.snack.macros.proteins,
                carbs: day.meals.snack.macros.carbs,
                fat: day.meals.snack.macros.fats,
              },
              ingredients: day.meals.snack.ingredients,
              instructions: day.meals.snack.instructions,
              duration: 10,
            }
          : undefined,
      };

      const storedPlan = await this.prisma.mealPlan.create({
        data: {
          userId,
          date: new Date(mealPlan.day),
          content: mealPlan,
          isDefault: false,
          calories: this.calculateTotalCalories(mealPlan),
          protein: this.calculateTotalProtein(mealPlan),
          carbs: this.calculateTotalCarbs(mealPlan),
          fat: this.calculateTotalFat(mealPlan),
        },
      });
      storedPlans.push(storedPlan);
    }
    return storedPlans;
  }

  async generateAndStoreDefaultMealPlan(): Promise<any> {
    const userData = {
      gender: 'homme',
      age: 30,
      weight: 70,
      height: 170,
      fitnessLevel: 'débutant',
      goal: 'maintenance',
      dietaryPreferences: [],
      healthConsiderations: [],
      equipment: [],
      availability: { daysPerWeek: 3, minutesPerDay: 30 },
    };

    const dates = this.generateDefaultDates(7);
    const existingDates = await this.getExistingMealPlanDates(null, dates);
    const missingDates = dates.filter((date) => !existingDates.includes(date));
    if (missingDates.length === 0) {
      return { message: 'All days already have a default meal plan.' };
    }

    const aiGeneratedPlans = await this.mealService.generateDailyMealPlans(
      userData,
      missingDates,
    );

    const storedPlans = [];
    for (const day of aiGeneratedPlans.days) {
      const mealPlan = {
        day: day.date,
        breakfast: {
          name: day.meals.breakfast.title,
          nutrition: {
            calories: day.meals.breakfast.calories,
            protein: day.meals.breakfast.macros.proteins,
            carbs: day.meals.breakfast.macros.carbs,
            fat: day.meals.breakfast.macros.fats,
          },
          ingredients: day.meals.breakfast.ingredients,
          instructions: day.meals.breakfast.instructions,
          duration: 15,
        },
        lunch: {
          name: day.meals.lunch.title,
          nutrition: {
            calories: day.meals.lunch.calories,
            protein: day.meals.lunch.macros.proteins,
            carbs: day.meals.lunch.macros.carbs,
            fat: day.meals.lunch.macros.fats,
          },
          ingredients: day.meals.lunch.ingredients,
          instructions: day.meals.lunch.instructions,
          duration: 20,
        },
        dinner: {
          name: day.meals.dinner.title,
          nutrition: {
            calories: day.meals.dinner.calories,
            protein: day.meals.dinner.macros.proteins,
            carbs: day.meals.dinner.macros.carbs,
            fat: day.meals.dinner.macros.fats,
          },
          ingredients: day.meals.dinner.ingredients,
          instructions: day.meals.dinner.instructions,
          duration: 30,
        },
        snack: day.meals.snack
          ? {
              name: day.meals.snack.title,
              nutrition: {
                calories: day.meals.snack.calories,
                protein: day.meals.snack.macros.proteins,
                carbs: day.meals.snack.macros.carbs,
                fat: day.meals.snack.macros.fats,
              },
              ingredients: day.meals.snack.ingredients,
              instructions: day.meals.snack.instructions,
              duration: 10,
            }
          : undefined,
      };

      const storedPlan = await this.prisma.mealPlan.create({
        data: {
          userId: null,
          date: new Date(mealPlan.day),
          content: mealPlan,
          isDefault: true,
          calories: this.calculateTotalCalories(mealPlan),
          protein: this.calculateTotalProtein(mealPlan),
          carbs: this.calculateTotalCarbs(mealPlan),
          fat: this.calculateTotalFat(mealPlan),
        },
      });
      storedPlans.push(storedPlan);
    }
    return storedPlans;
  }

  // Log a meal as taken for a user
  async logMeal({
    userId,
    mealType,
    calories,
    protein,
    carbs,
    fat,
    date,
  }: {
    userId: string;
    mealType: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: Date;
  }) {
    try {
      console.log(
        `Logging meal for user ${userId} on ${date.toISOString()} as ${mealType}`,
      );
      const result = await this.prisma.mealLog.upsert({
        where: {
          userId_date_mealType: {
            userId,
            date,
            mealType,
          },
        },
        update: {
          calories,
          protein,
          carbs,
          fat,
          updatedAt: new Date(),
        },
        create: {
          userId,
          date,
          mealType,
          calories,
          protein,
          carbs,
          fat,
        },
      });
      console.log('Meal log successful:', result);
      return result;
    } catch (error) {
      console.error(`Error logging meal for user ${userId}:`, error);
      throw new Error('Failed to log meal.');
    }
  }

  // Get all meal logs for a user for a given day
  async getMealLogs(userId: string, date: string) {
    try {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);

      console.log(
        `Fetching meal logs for user ${userId} on ${start.toISOString()}`,
      );

      const logs = await this.prisma.mealLog.findMany({
        where: {
          userId,
          date: {
            gte: start,
            lt: end,
          },
        },
        orderBy: { mealType: 'asc' },
      });

      console.log(`Found ${logs.length} meal logs for user ${userId}`);
      return logs;
    } catch (error) {
      console.error(
        `Error retrieving meal logs for user ${userId} on ${date}:`,
        error,
      );
      throw new Error('Failed to retrieve meal logs.');
    }
  }

  // Get all meal logs for a user in a date range
  async getMealLogsRange(userId: string, start: string, end: string) {
    return this.prisma.mealLog.findMany({
      where: {
        userId,
        date: {
          gte: new Date(start),
          lt: new Date(end),
        },
      },
      orderBy: { date: 'asc' },
    });
  }
}
