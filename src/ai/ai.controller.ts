import { Controller, Post, Body } from '@nestjs/common';
import { MealService } from './meal/meal.service';
import { WorkoutService } from './workout/workout.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly mealService: MealService,
    private readonly workoutService: WorkoutService,
  ) {}

  @Post('meal-plan')
  async generateMealPlan(@Body() generatePlanDto: GeneratePlanDto) {
    const { dates, ...userData } = generatePlanDto;
    return this.mealService.generateDailyMealPlans(userData, dates);
  }

  @Post('workout-plan')
  async generateWorkoutPlan(@Body() generatePlanDto: GeneratePlanDto) {
    const { dates, ...userData } = generatePlanDto;
    return this.workoutService.generateDailyWorkoutPlans(userData, dates);
  }
}
