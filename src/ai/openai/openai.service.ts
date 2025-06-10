import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class OpenaiService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async askOpenAI(question: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: question }],
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error communicating with OpenAI:', error);
      throw new Error('Failed to get response from OpenAI');
    }
  }
}
