import { Module } from '@nestjs/common';
import { WorkoutPlanController } from './workoutplan.controller';
import { WorkoutPlanService } from './workoutplan.service';
import { AiModule } from '../ai/ai.module';
import { CommonModule } from '../common/common.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [AiModule, CommonModule, SubscriptionModule],
  controllers: [WorkoutPlanController],
  providers: [WorkoutPlanService],
  exports: [WorkoutPlanService],
})
export class WorkoutPlanModule {}
