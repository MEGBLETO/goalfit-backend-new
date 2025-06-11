import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class OpenaiService {
  private readonly openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async chatWithJsonPrompt(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const message = response.choices[0].message.content;
      if (!message) throw new Error('No content returned from OpenAI');

      return message.trim();
    } catch (error) {
      console.error('Error from OpenAI:', error);
      throw new Error('OpenAI request failed');
    }
  }
}
