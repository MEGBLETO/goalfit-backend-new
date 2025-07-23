import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UnsplashService {
  private readonly logger = new Logger(UnsplashService.name);
  private readonly accessKey = process.env.UNSPLASH_API_KEY;

  async getImageUrl(query: string): Promise<string | null> {
    try {
      const maskedKey = this.accessKey
        ? this.accessKey.slice(0, 6) + '...'
        : 'undefined';
      this.logger.log(`[UnsplashService] Using API Key: ${maskedKey}`);
      this.logger.log(`[UnsplashService] Query: ${query}`);

      const url = 'https://api.unsplash.com/search/photos';
      const headers = {
        Authorization: `Client-ID ${this.accessKey}`,
        'accept-version': 'v1',
      };
      const params = {
        query,
        orientation: 'landscape',
        per_page: 1,
      };
      this.logger.log(`[UnsplashService] Request URL: ${url}`);
      this.logger.log(
        `[UnsplashService] Request Headers: ${JSON.stringify(headers)}`,
      );
      this.logger.log(
        `[UnsplashService] Request Params: ${JSON.stringify(params)}`,
      );

      const response = await axios.get(url, {
        params,
        headers,
      });
      this.logger.log(`[UnsplashService] Response status: ${response.status}`);
      const results = response.data?.results;
      if (results && results.length > 0) {
        this.logger.log(
          `[UnsplashService] Image URL: ${results[0].urls?.regular}`,
        );
        return results[0].urls?.regular || null;
      }
      this.logger.warn('[UnsplashService] No image found for query.');
      return null;
    } catch (error) {
      this.logger.error(
        '[UnsplashService] Error fetching image from Unsplash:',
      );
      if (axios.isAxiosError(error)) {
        this.logger.error(`AxiosError: ${error.message}`);
        if (error.response) {
          this.logger.error(`Status: ${error.response.status}`);
          this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
        }
      } else {
        this.logger.error(error);
      }
      return null;
    }
  }
}
