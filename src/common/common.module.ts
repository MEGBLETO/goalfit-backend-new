import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UnsplashService } from './unsplash.service';

@Module({
  providers: [PrismaService, UnsplashService],
  exports: [PrismaService, UnsplashService],
})
export class CommonModule {} 