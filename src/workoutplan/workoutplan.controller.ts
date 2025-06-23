import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { WorkoutPlanService } from './workoutplan.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Workout Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bdd/workout')
export class WorkoutPlanController {
  constructor(private readonly workoutPlanService: WorkoutPlanService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get workout plans for the current user (custom for subscribed, default for unsubscribed)',
  })
  @ApiResponse({
    status: 200,
    description: 'Workout plans retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWorkoutPlans(@Request() req) {
    return this.workoutPlanService.getWorkoutPlanForUser(req.user.userId);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default workout plans' })
  @ApiResponse({
    status: 200,
    description: 'Default workout plans retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDefaultWorkoutPlans() {
    return this.workoutPlanService.getDefaultWorkoutPlan();
  }

  @Post('generate')
  @ApiOperation({
    summary:
      'Generate and store a new workout plan for the authenticated (and subscribed) user',
  })
  @ApiResponse({
    status: 201,
    description: 'Custom workout plan generated and stored successfully',
  })
  async generateAndStoreCustomWorkoutPlans(@Request() req) {
    const userId = req.user.userId;
    return this.workoutPlanService.generateAndStoreWorkoutPlan(userId);
  }

  @Post('default/generate')
  @ApiOperation({
    summary:
      'Generate and store a new default workout plan for all users (admin)',
  })
  @ApiResponse({
    status: 201,
    description: 'Default workout plan generated and stored successfully',
  })
  async generateAndStoreDefaultWorkoutPlans() {
    return this.workoutPlanService.generateAndStoreDefaultWorkoutPlan();
  }
}
