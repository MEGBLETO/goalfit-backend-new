import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { MealPlanService } from '../mealplan/mealplan.service';
import { WorkoutPlanService } from '../workoutplan/workoutplan.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class PlanSchedulerService {
  private readonly logger = new Logger(PlanSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mealPlanService: MealPlanService,
    private readonly workoutPlanService: WorkoutPlanService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Cron('0 0 */2 * *') // Every 2 days at midnight
  async generatePlansForAllUsers() {
    this.logger.log('Starting scheduled plan generation for all users...');

    try {
      // Get all users
      const users = await this.prisma.user.findMany({
        include: {
          profile: true,
        },
      });

      this.logger.log(`Found ${users.length} users to process`);

      for (const user of users) {
        try {
          await this.generatePlansForUser(user.id);
          this.logger.log(`Successfully generated plans for user ${user.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to generate plans for user ${user.id}:`,
            error,
          );
        }
      }

      this.logger.log('Completed scheduled plan generation for all users');
    } catch (error) {
      this.logger.error('Error in scheduled plan generation:', error);
    }
  }

  async generatePlansForUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
        },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const isSubscribed =
        await this.subscriptionService.hasActiveSubscription(userId);

      if (isSubscribed) {
        // Generate custom plans using AI with user's detailed profile
        await this.generateCustomPlansForUser(userId);
      } else {
        // Generate default plans using AI with generic data
        await this.generateDefaultPlansForUser(userId);
      }

      this.logger.log(
        `Generated ${isSubscribed ? 'custom' : 'default'} plans for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error generating plans for user ${userId}:`, error);
      throw error;
    }
  }

  private async generateCustomPlansForUser(userId: string) {
    try {
      // Generate and store custom meal plan
      await this.mealPlanService.generateAndStoreMealPlans(
        await this.mealPlanService.generateCustomMealPlansForUser(userId),
        userId,
      );

      // Generate and store custom workout plan
      await this.workoutPlanService.generateAndStoreWorkoutPlan(userId);

      this.logger.log(`Generated custom plans for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error generating custom plans for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async generateDefaultPlansForUser(userId: string) {
    try {
      // For default plans, we only need to ensure they exist in the database.
      // They are shared by all users, so we don't need to create them per user.

      const startDate = new Date();
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);

      const defaultMealPlansCount = await this.prisma.mealPlan.count({
        where: {
          isDefault: true,
          userId: null,
          date: { gte: startDate, lte: endDate },
        },
      });

      if (defaultMealPlansCount === 0) {
        this.logger.log('No default meal plans found. Generating new ones.');
        await this.mealPlanService.generateAndStoreDefaultMealPlans(7);
      }

      const defaultWorkoutPlansCount = await this.prisma.workoutPlan.count({
        where: {
          isDefault: true,
          userId: null,
          date: { gte: startDate, lte: endDate },
        },
      });

      if (defaultWorkoutPlansCount === 0) {
        this.logger.log('No default workout plans found. Generating new ones.');
        await this.workoutPlanService.generateAndStoreDefaultWorkoutPlan();
      }

      this.logger.log(`Ensured default plans exist for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error ensuring default plans for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
