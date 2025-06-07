import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { MealPlanModule } from './meal-plan/meal-plan.module';
import { WorkoutPlanModule } from './workout-plan/workout-plan.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [UserModule, AuthModule, MealPlanModule, WorkoutPlanModule, NotificationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
