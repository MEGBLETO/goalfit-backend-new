import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { MealPlanService } from './mealplan.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Meal Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bdd/meal')
export class MealPlanController {
  constructor(private readonly mealPlanService: MealPlanService) {}

  @Get('mealplans')
  @ApiOperation({
    summary:
      'Get meal plans for the current user (custom for subscribed, default for unsubscribed)',
  })
  @ApiResponse({
    status: 200,
    description: 'Meal plans retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMealPlans(@Request() req) {
    return this.mealPlanService.getMealPlans(req.user.userId);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default meal plans for unsubscribed users' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to generate (default: 7)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Default meal plans retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDefaultMealPlans(@Query('days') days?: number) {
    return this.mealPlanService.generateDefaultMealPlans(days || 7);
  }

  @Post('generate')
  @ApiOperation({
    summary:
      'Generate and store a new meal plan for the currently authenticated (and subscribed) user',
  })
  @ApiResponse({
    status: 201,
    description: 'Meal plan generated and stored successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not subscribed or does not have a profile.',
  })
  async generateUserMealPlan(@Request() req) {
    return this.mealPlanService.triggerUserMealPlanGeneration(req.user.userId);
  }

  @Post('default/generate')
  @ApiOperation({
    summary: 'Generate and store default meal plans in the database',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to generate (default: 7)',
    type: Number,
  })
  @ApiResponse({
    status: 201,
    description: 'Default meal plans generated and stored successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateAndStoreDefaultMealPlans(@Query('days') days?: number) {
    return this.mealPlanService.generateAndStoreDefaultMealPlans(days || 7);
  }

  @Post('mealplans')
  @ApiOperation({
    summary: 'Generate and store meal plans for subscribed users',
  })
  @ApiResponse({
    status: 201,
    description: 'Meal plans generated and stored successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Subscription required' })
  async generateMealPlans(@Body() data: any, @Request() req) {
    return this.mealPlanService.generateAndStoreMealPlans(
      data.mealplans,
      req.user.userId,
    );
  }

  @Post('log')
  @ApiOperation({ summary: 'Log a meal as taken for the current user' })
  @ApiResponse({ status: 201, description: 'Meal logged successfully' })
  async logMeal(
    @Request() req,
    @Body()
    body: {
      mealType: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      date?: string;
    },
  ) {
    const userId = req.user.userId;
    const { mealType, calories, protein, carbs, fat, date } = body;
    return this.mealPlanService.logMeal({
      userId,
      mealType,
      calories,
      protein,
      carbs,
      fat,
      date: date ? new Date(date) : new Date(),
    });
  }

  @Get('log')
  @ApiOperation({
    summary: 'Get all meal logs for the current user for a given day',
  })
  @ApiResponse({ status: 200, description: 'Meal logs retrieved successfully' })
  async getMealLogs(@Request() req, @Query('date') date: string) {
    const userId = req.user.userId;
    return this.mealPlanService.getMealLogs(userId, date);
  }

  @Get('log/range')
  @ApiOperation({
    summary: 'Get all meal logs for the current user in a date range',
  })
  @ApiResponse({
    status: 200,
    description: 'Meal logs for range retrieved successfully',
  })
  async getMealLogsRange(
    @Request() req,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const userId = req.user.userId;
    return this.mealPlanService.getMealLogsRange(userId, start, end);
  }
}
