import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UserService } from '../user/user.service';
import { MailModule } from '../notification/mail/mail.module';
import { CommonModule } from '../common/common.module';
import { UserModule } from '../user/user.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    MailModule,
    CommonModule,
    UserModule,
    SubscriptionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtStrategy, GoogleStrategy],
})
export class AuthModule {}
