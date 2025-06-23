import { Module } from '@nestjs/common';
import { MealPlanController } from './mealplan.controller';
import { MealPlanService } from './mealplan.service';
import { AiModule } from '../ai/ai.module';
import { CommonModule } from '../common/common.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [AiModule, CommonModule, SubscriptionModule],
  controllers: [MealPlanController],
  providers: [MealPlanService],
  exports: [MealPlanService],
})
export class MealPlanModule {} 