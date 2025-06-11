import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { NotificationModule } from './notification/notification.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [UserModule, AuthModule, NotificationModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
