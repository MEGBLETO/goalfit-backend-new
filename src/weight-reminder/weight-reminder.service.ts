import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { MailService } from '../notification/mail/mail.service';

@Injectable()
export class WeightReminderService {
  private readonly logger = new Logger(WeightReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // Runs every Monday at 8am Paris time
  @Cron(CronExpression.EVERY_WEEK, { timeZone: 'Europe/Paris' })
  async sendWeeklyWeightReminders() {
    this.logger.log('Running weekly weight reminder job...');

    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      include: { profile: true },
    });

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    for (const user of users) {
      if (!user.email) continue;

      const weightEntry = await this.prisma.userWeightEntry.findFirst({
        where: {
          userId: user.id,
          date: {
            gte: startOfWeek,
            lt: endOfWeek,
          },
        },
      });

      if (!weightEntry) {
        try {
          await this.mailService.sendGenericEmail(
            user.email,
            "N'oubliez pas de renseigner votre poids cette semaine !",
            `<p>Bonjour ${user.name || ''},</p>
<p>C'est le moment d'entrer votre poids de la semaine sur GoalFit pour suivre vos progrès !</p>
<p><a href=\"${process.env.FRONTEND_URL}/profil\">Cliquez ici pour saisir votre poids</a></p>
<p>À bientôt sur GoalFit !</p>`,
          );
          this.logger.log(`Sent weight reminder to ${user.email}`);
        } catch (err) {
          this.logger.error(
            `Failed to send weight reminder to ${user.email}:`,
            err,
          );
        }
      }
    }
  }
}
