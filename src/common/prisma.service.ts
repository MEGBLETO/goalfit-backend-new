import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma'; // Adjust the import path as necessary

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      app.close();
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
