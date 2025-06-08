import { Module } from '@nestjs/common';
import { WorkoutPlanService } from './workout-plan.service';
import { WorkoutPlanController } from './workout-plan.controller';

@Module({
  providers: [WorkoutPlanService],
  controllers: [WorkoutPlanController]
})
export class WorkoutPlanModule {}
