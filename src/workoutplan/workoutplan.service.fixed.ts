import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { WorkoutService } from '../ai/workout/workout.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { buildMultiDayWorkoutPrompt } from '../ai/prompt-builder/workout.prompt';
import { User, WorkoutPlan } from '@prisma/client';

@Injectable()
export class WorkoutPlanService {
  private readonly logger = new Logger(WorkoutPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workoutService: WorkoutService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async getWorkoutPlanForUser(userId: string): Promise<any> {
    this.logger.log(`Fetching workout plan for user: ${userId}`);
    try {
      const hasActiveSubscription =
        await this.subscriptionService.hasActiveSubscription(userId);
      if (!hasActiveSubscription) {
        this.logger.log(
          `User ${userId} has no active subscription. Fetching default workout plan.`,
        );
        return this.getDefaultWorkoutPlan();
      }

      const { startOfWeek, endOfWeek } = this.getStartAndEndOfWeek(new Date());
      let userPlan = await this.prisma.workoutPlan.findFirst({
        where: { userId, date: { gte: startOfWeek, lte: endOfWeek } },
        include: { workouts: { include: { exercises: true } } },
      });

      if (userPlan) {
        this.logger.log(`Found existing workout plan for user ${userId}.`);
        return this.transformWorkoutsForFrontend(userPlan.workouts, userPlan.date);
      }

      this.logger.log(
        `No existing plan for user ${userId}. Generating a new one.`,
      );
      userPlan = await this.generateAndStoreWorkoutPlan(userId);
      return this.transformWorkoutsForFrontend(userPlan.workouts, userPlan.date);
    } catch (error) {
      this.logger.error(
        `Error fetching workout plan for user ${userId}:`,
        error.stack,
      );
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Could not retrieve workout plan.',
      );
    }
  }

  // Legacy method for backward compatibility
  async getWorkoutPlans(userId: string): Promise<any> {
    return this.getWorkoutPlanForUser(userId);
  }

  async getDefaultWorkoutPlan(): Promise<any> {
    this.logger.log('Fetching default workout plan.');
    try {
      const { startOfWeek, endOfWeek } = this.getStartAndEndOfWeek(new Date());
      let defaultPlan = await this.prisma.workoutPlan.findFirst({
        where: { isDefault: true, date: { gte: startOfWeek, lte: endOfWeek } },
        include: { workouts: { include: { exercises: true } } },
      });

      if (defaultPlan) {
        this.logger.log('Found existing default workout plan.');
        return this.transformWorkoutsForFrontend(defaultPlan.workouts, defaultPlan.date);
      }

      this.logger.log('No existing default plan. Generating a new one.');
      defaultPlan = await this.generateAndStoreDefaultWorkoutPlan();
      return this.transformWorkoutsForFrontend(defaultPlan.workouts, defaultPlan.date);
    } catch (error) {
      this.logger.error('Error fetching default workout plan:', error.stack);
      throw new InternalServerErrorException(
        'Could not retrieve default workout plan.',
      );
    }
  }

  // Legacy method for backward compatibility
  async generateDefaultWorkoutPlans(days: number = 7): Promise<any> {
    return this.getDefaultWorkoutPlan();
  }

  async generateAndStoreWorkoutPlan(userId: string): Promise<any> {
    this.logger.log(`Generating and storing workout plan for user: ${userId}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: { include: { goals: true, availability: true } } },
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
        equipment: user.profile.equipment || ['bodyweight'],
        healthConsiderations: user.profile.healthConsiderations || [],
        availability: user.profile.availability || {
          daysPerWeek: 3,
          minutesPerDay: 30,
        },
      };

      const dates = this.generateDefaultDates(7);
      const rawPlan = await this.workoutService.generateDailyWorkoutPlans(userData, dates);
      const normalizedPlan = this.normalizeAiResponse(rawPlan, userId);

      return this.upsertWorkoutPlan(normalizedPlan);
    } catch (error) {
      this.logger.error(
        `Failed to generate and store workout plan for user ${userId}:`,
        error.stack,
      );
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'AI workout plan generation failed.',
      );
    }
  }

  // Legacy method for backward compatibility
  async generateCustomWorkoutPlansForUser(userId: string): Promise<any> {
    return this.generateAndStoreWorkoutPlan(userId);
  }

  // Legacy method for backward compatibility
  async generateAndStoreWorkoutPlans(
    workoutPlans: any[],
    userId: string,
  ): Promise<any> {
    this.logger.log(
      `Storing ${workoutPlans.length} workout plans for user: ${userId}`,
    );
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.subscription || user.subscription.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Active subscription required to generate custom workout plans',
        );
      }

      const storedPlans = [];
      for (const workoutPlan of workoutPlans) {
        const planDate = new Date(workoutPlan.day);
        planDate.setUTCHours(0, 0, 0, 0);

        const storedPlan = await this.prisma.workoutPlan.upsert({
          where: {
            userId_date: {
              userId,
              date: planDate,
            },
          },
          update: {
            workouts: {
              deleteMany: {},
              create: workoutPlan.workouts.map((workout: any) => ({
                name: workout.name,
                description: workout.description,
                duration: workout.duration,
                intensity: workout.intensity,
                exercises: {
                  create: workout.exercises.map((exercise: any) => ({
                    name: exercise.name,
                    reps: exercise.reps,
                    bodyPart: exercise.bodyPart,
                    description: exercise.description,
                  })),
                },
              })),
            },
          },
          create: {
            userId,
            date: planDate,
            isDefault: false,
            workouts: {
              create: workoutPlan.workouts.map((workout: any) => ({
                name: workout.name,
                description: workout.description,
                duration: workout.duration,
                intensity: workout.intensity,
                exercises: {
                  create: workout.exercises.map((exercise: any) => ({
                    name: exercise.name,
                    reps: exercise.reps,
                    bodyPart: exercise.bodyPart,
                    description: exercise.description,
                  })),
                },
              })),
            },
          },
          include: {
            workouts: {
              include: {
                exercises: true,
              },
            },
          },
        });
        storedPlans.push(storedPlan);
      }

      return {
        message: 'Workout plans generated and stored successfully',
        count: storedPlans.length,
        plans: storedPlans,
      };
    } catch (error) {
      this.logger.error(
        `Error in generateAndStoreWorkoutPlans for user ${userId}:`,
        error.stack,
      );
      throw error;
    }
  }

  async generateAndStoreDefaultWorkoutPlan(): Promise<any> {
    this.logger.log('Generating and storing new default workout plan.');
    try {
      const userData = {
        gender: 'homme',
        age: 30,
        weight: 70,
        height: 170,
        fitnessLevel: 'débutant',
        goal: 'maintenance',
        equipment: ['bodyweight'],
        healthConsiderations: [],
        availability: {
          daysPerWeek: 3,
          minutesPerDay: 30,
        },
      };

      const dates = this.generateDefaultDates(7);
      const rawPlan = await this.workoutService.generateDailyWorkoutPlans(userData, dates);
      const normalizedPlan = this.normalizeAiResponse(rawPlan, null);

      return this.upsertWorkoutPlan(normalizedPlan);
    } catch (error) {
      this.logger.error(
        'Failed to generate and store default workout plan:',
        error.stack,
      );
      throw new InternalServerErrorException(
        'AI default plan generation failed.',
      );
    }
  }

  // Legacy method for backward compatibility
  async generateAndStoreDefaultWorkoutPlans(days: number = 7): Promise<any> {
    return this.generateAndStoreDefaultWorkoutPlan();
  }

  // Helper method to transform workouts for frontend compatibility
  private transformWorkoutsForFrontend(workouts: any[], planDate: Date): any[] {
    if (!workouts || workouts.length === 0) {
      return [];
    }

    // Generate dates for the week starting from the plan date
    const weekDates = [];
    const startDate = new Date(planDate);
    startDate.setUTCHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      weekDates.push(date);
    }

    // Map workouts to individual dates
    return workouts.map((workout, index) => ({
      ...workout,
      date: weekDates[index] || weekDates[0], // Fallback to first date if index out of bounds
    }));
  }

  private normalizeAiResponse(rawPlan: any, userId: string | null): any {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    return {
      userId: userId,
      date: now,
      isDefault: !userId,
      workouts: {
        create: rawPlan.days.map((day: any) => ({
          name: day.name || `Workout for ${day.date}`,
          description: day.description || 'AI Generated Workout',
          duration: `${(day.exercises || []).reduce((acc, ex) => acc + (ex.durationMinutes || 0), 0)} min`,
          intensity: 'Moderate',
          exercises: {
            create: (day.exercises || []).map((ex: any) => ({
              name: ex.name,
              reps: ex.reps,
              bodyPart: ex.focus,
              description: ex.description,
            })),
          },
        })),
      },
    };
  }

  private async upsertWorkoutPlan(planData: any): Promise<any> {
    const { userId, date } = planData;
    this.logger.log(
      `Upserting workout plan for user: ${userId || 'default'} for date: ${date.toISOString()}`,
    );

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.prisma.$transaction(async (tx) => {
      let existingPlan;
      if (userId) {
        existingPlan = await tx.workoutPlan.findFirst({
          where: { userId, date: { gte: targetDate, lte: endOfDay } },
        });
      } else {
        existingPlan = await tx.workoutPlan.findFirst({
          where: { isDefault: true, date: { gte: targetDate, lte: endOfDay } },
        });
      }

      if (existingPlan) {
        this.logger.log(
          `Deleting existing plan ${existingPlan.id} before upsert.`,
        );
        // Prisma requires deleting nested relations first
        const workouts = await tx.workout.findMany({
          where: { workoutPlanId: existingPlan.id },
        });
        for (const workout of workouts) {
          await tx.exercise.deleteMany({ where: { workoutId: workout.id } });
        }
        await tx.workout.deleteMany({
          where: { workoutPlanId: existingPlan.id },
        });
        await tx.workoutPlan.delete({ where: { id: existingPlan.id } });
      }

      this.logger.log('Creating new plan.');
      return tx.workoutPlan.create({
        data: planData,
        include: { workouts: { include: { exercises: true } } },
      });
    });
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

  private getStartAndEndOfWeek(date: Date): {
    startOfWeek: Date;
    endOfWeek: Date;
  } {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setUTCDate(diff));

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  }

  // Additional legacy methods for backward compatibility
  async create(createWorkoutPlanDto: any, userId: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription || subscription.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Only subscribed users can create custom workout plans',
        );
      }

      return this.prisma.workoutPlan.create({
        data: {
          ...createWorkoutPlanDto,
          userId,
          isDefault: createWorkoutPlanDto.isDefault || false,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error creating workout plan for user ${userId}:`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(userId: string) {
    try {
      return this.prisma.workoutPlan.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding all workout plans for user ${userId}:`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not retrieve workout plans.',
      );
    }
  }

  async findByDate(userId: string, date: Date) {
    try {
      return this.prisma.workoutPlan.findUnique({
        where: { userId_date: { userId, date } },
      });
    } catch (error) {
      this.logger.error(
        `Error finding workout plan for user ${userId} on ${date}:`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not retrieve workout plan.',
      );
    }
  }

  async update(id: string, updateWorkoutPlanDto: any) {
    try {
      const workoutPlan = await this.prisma.workoutPlan.findUnique({
        where: { id },
      });
      if (!workoutPlan) throw new NotFoundException('Workout plan not found');

      return this.prisma.workoutPlan.update({
        where: { id },
        data: updateWorkoutPlanDto,
      });
    } catch (error) {
      this.logger.error(`Error updating workout plan ${id}:`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Could not update workout plan.');
    }
  }

  async remove(id: string) {
    try {
      const workoutPlan = await this.prisma.workoutPlan.findUnique({
        where: { id },
      });
      if (!workoutPlan) throw new NotFoundException('Workout plan not found');

      await this.prisma.workoutPlan.delete({ where: { id } });
    } catch (error) {
      this.logger.error(`Error removing workout plan ${id}:`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Could not remove workout plan.');
    }
  }

  async getDefaultWorkoutPlanForUser(userId: string) {
    try {
      return this.prisma.workoutPlan.findFirst({
        where: { userId, isDefault: true },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error getting default workout plan for user ${userId}:`, error.stack);
      throw new InternalServerErrorException('Could not retrieve default workout plan.');
    }
  }
} 