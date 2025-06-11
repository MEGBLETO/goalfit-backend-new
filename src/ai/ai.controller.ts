import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MealService } from './meal/meal.service';
import { WorkoutService } from './workout/workout.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Public } from 'src/auth/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
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

  @Public()
  @Post('workout-plan')
  async generateWorkoutPlan(@Body() generatePlanDto: GeneratePlanDto) {
    const { dates, ...userData } = generatePlanDto;
    return this.workoutService.generateDailyWorkoutPlans(userData, dates);
  }
}
