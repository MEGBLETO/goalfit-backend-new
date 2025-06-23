import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
} from '@nestjs/common';
import { MealService } from './meal/meal.service';
import { WorkoutService } from './workout/workout.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('AI Plan Generation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly mealService: MealService,
    private readonly workoutService: WorkoutService,
  ) {}

  @Post('meal-plan')
  @ApiOperation({
    summary:
      'Generate custom meal plan for subscribed users or default plan for unsubscribed users',
  })
  @ApiBody({ type: GeneratePlanDto })
  @ApiResponse({ status: 200, description: 'Meal plan generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Subscription required for custom plans',
  })
  async generateMealPlan(
    @Body() generatePlanDto: GeneratePlanDto,
    @Request() req,
  ) {
    const { dates, ...userData } = generatePlanDto;
    return this.mealService.generateDailyMealPlans(userData, dates);
  }

  @Post('workout-plan')
  @ApiOperation({
    summary:
      'Generate custom workout plan for subscribed users or default plan for unsubscribed users',
  })
  @ApiBody({ type: GeneratePlanDto })
  @ApiResponse({
    status: 200,
    description: 'Workout plan generated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Subscription required for custom plans',
  })
  async generateWorkoutPlan(
    @Body() generatePlanDto: GeneratePlanDto,
    @Request() req,
  ) {
    const { dates, ...userData } = generatePlanDto;
    return this.workoutService.generateDailyWorkoutPlans(userData, dates);
  }

  @Get('meal-plan/default')
  @ApiOperation({ summary: 'Get default meal plan for unsubscribed users' })
  @ApiQuery({
    name: 'dates',
    required: false,
    description: 'Comma-separated dates (YYYY-MM-DD)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Default meal plan retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDefaultMealPlan(@Query('dates') dates?: string) {
    const dateArray = dates ? dates.split(',') : [];
    return this.mealService.generateDailyMealPlans({}, dateArray);
  }

  @Get('workout-plan/default')
  @ApiOperation({ summary: 'Get default workout plan for unsubscribed users' })
  @ApiQuery({
    name: 'dates',
    required: false,
    description: 'Comma-separated dates (YYYY-MM-DD)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Default workout plan retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDefaultWorkoutPlan(@Query('dates') dates?: string) {
    const dateArray = dates ? dates.split(',') : [];
    return this.workoutService.generateDailyWorkoutPlans({}, dateArray);
  }
}
