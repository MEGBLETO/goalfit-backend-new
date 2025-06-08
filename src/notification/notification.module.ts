import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { MailService } from './mail/mail.service';
import { MailModule } from './mail/mail.module';

@Module({
  providers: [MailService],
  controllers: [NotificationController],
  exports: [MailService],
  imports: [MailModule],
})
export class NotificationModule {}
