import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenaiService } from './openai/openai.service';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController],
  providers: [AiService, OpenaiService]
})
export class AiModule {}
