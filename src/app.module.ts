import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AiModule } from './ai/ai.module';
import { MealPlanModule } from './mealplan/mealplan.module';
import { WorkoutPlanModule } from './workoutplan/workoutplan.module';
import { NotificationModule } from './notification/notification.module';
import { PlanSchedulerService } from './plan-scheduler/plan-scheduler.service';
import { CommonModule } from './common/common.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { WeightReminderService } from './weight-reminder/weight-reminder.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    AuthModule,
    UserModule,
    AiModule,
    MealPlanModule,
    WorkoutPlanModule,
    NotificationModule,
    SubscriptionModule,
  ],
  controllers: [AppController],
  providers: [AppService, PlanSchedulerService, WeightReminderService],
})
export class AppModule {}
