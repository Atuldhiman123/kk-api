import { Injectable, Logger, ServiceUnavailableException, BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly timeoutMs = 15000;

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string | null {
    const apiKey =
      this.configService.get<string>('AI_API_KEY')?.trim() ||
      this.configService.get<string>('OPENAI_API_KEY')?.trim();
    return apiKey || null;
  }

  /**
   * Generates a 1536-dimensional embedding vector for a given text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const cleanText = text.replace(/\n+/g, ' ').trim();
    if (!cleanText) return new Array(1536).fill(0);

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Embedding service is currently unavailable. Please configure AI_API_KEY.',
      );
    }

    const model =
      this.configService.get<string>('AI_EMBEDDING_MODEL')?.trim() || 'gemini-embedding-001';
    const baseUrl =
      this.configService.get<string>('AI_BASE_URL')?.trim() || 'https://generativelanguage.googleapis.com/v1beta/openai/';
    const dimensions = Number(this.configService.get<number>('AI_EMBEDDING_DIMENSIONS') || 1536);

    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    try {
      const response = await fetch(`${normalizedBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: cleanText,
          dimensions,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Embedding provider HTTP error ${response.status}: ${errText}`);
        throw new BadGatewayException(`Embedding provider returned status ${response.status}`);
      }

      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        throw new BadGatewayException('Malformed embedding returned by provider');
      }

      return embedding;
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException || err instanceof BadGatewayException) {
        throw err;
      }
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        this.logger.error('Embedding provider request timed out');
        throw new GatewayTimeoutException('Embedding generation timed out');
      }
      this.logger.error(`Embedding call failed: ${err.message}`);
      throw new BadGatewayException('Failed to generate text embedding');
    }
  }
}
