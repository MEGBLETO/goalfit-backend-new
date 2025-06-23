import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { OpenaiService } from './openai/openai.service';
import { WorkoutService } from './workout/workout.service';
import { MealService } from './meal/meal.service';

@Module({
  controllers: [AiController],
  providers: [OpenaiService, WorkoutService, MealService],
  exports: [MealService, WorkoutService],
})
export class AiModule {}
