import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../notification/mail/mail.service';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new BadRequestException('Email already registered');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          surname: dto.surname,
          isEmailVerified: false,
        },
      });

      const verificationToken = this.jwtService.sign(
        { email: user.email },
        { expiresIn: '1h' },
      );

      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      console.log(verificationToken, 'hello');
      console.log(verificationUrl, 'hello');

      await this.mailService.sendVerificationEmail(
        user.email,
        user.name,
        verificationUrl,
      );

      return user;
    } catch (error) {
      throw new InternalServerErrorException('Registration failed');
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user || !(await bcrypt.compare(dto.password, user.password))) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.generateToken(user);
    } catch (error) {
      throw new UnauthorizedException('Login failed');
    }
  }

  async generateToken(user: any) {
    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
      }),
    };
  }

  async VerifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new BadRequestException('Token invalid or expired');
    }
  }

  async verifyEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) throw new BadRequestException('User not found');

      if (user.isEmailVerified) {
        return { message: 'Email already verified' };
      }

      await this.prisma.user.update({
        where: { email },
        data: { isEmailVerified: true },
      });
    } catch (error) {
      throw new InternalServerErrorException('Email verification failed');
    }
  }

  async validateOrCreateGoogleUser(googleUser: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
    });

    if (existingUser) {
      return existingUser;
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: googleUser.email,
        googleId: googleUser.googleId,
        name: googleUser.name,
        surname: googleUser.surname,
        isEmailVerified: true,
      },
    });

    return newUser;
  }

  async requestPasswordReset(dto: RequestResetDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) return; 

    const token = this.jwtService.sign(
      { email: user.email },
      { expiresIn: '15m' },
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${user.email}`;

    await this.mailService.sendPasswordResetEmail(user.email, resetLink);
    return { message: 'If your email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(dto.token);
      const user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) throw new Error();

      const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

      await this.prisma.user.update({
        where: { email: user.email },
        data: { password: hashedPassword },
      });

      return { message: 'Password has been reset successfully.' };
    } catch (err) {
      throw new BadRequestException('Invalid or expired token.');
    }
  }
}
