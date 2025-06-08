import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as Mailgen from 'mailgen';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private mailGenerator: Mailgen;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.mailGenerator = new Mailgen({
      theme: 'default',
      product: {
        name: 'GoalFit',
        link: process.env.FRONTEND_URL,
      },
    });
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    verificationUrl: string,
  ) {
    try {
      console.log(email, name, verificationUrl, 'hello from mail service');

      const emailBody = this.mailGenerator.generate({
        body: {
          name,
          intro: 'Welcome to GoalFit! Please verify your email to continue.',
          action: {
            instructions: 'Click the button below to verify your email:',
            button: {
              color: '#22BC66',
              text: 'Verify Email',
              link: verificationUrl,
            },
          },
          outro: 'Need help? Just reply to this email.',
        },
      });

      const plainTextBody = this.mailGenerator.generatePlaintext({
        body: {
          name,
          intro: 'Welcome to GoalFit! Please verify your email to continue.',
          action: {
            instructions: 'Click the button below to verify your email:',
            button: {
              text: 'Verify Email',
              link: verificationUrl,
            },
          },
          outro: 'Need help? Just reply to this email.',
        },
      });

      await this.transporter.sendMail({
        from: `"GoalFit" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify your email address',
        html: emailBody,
        text: plainTextBody,
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string) {
    try {
      const email = {
        body: {
          name: 'GoalFit User',
          intro: 'We received a request to reset your password.',
          action: {
            instructions: 'Click the button below to reset your password:',
            button: {
              color: '#22BC66',
              text: 'Reset Password',
              link: resetLink,
            },
          },
          outro:
            'If you did not request this, you can safely ignore this email.',
        },
      };

      const html = this.mailGenerator.generate(email);
      const text = this.mailGenerator.generatePlaintext(email);

      await this.transporter.sendMail({
        from: `"GoalFit" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Reset your GoalFit password',
        html,
        text,
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new InternalServerErrorException('Failed to send reset email');
    }
  }
}
