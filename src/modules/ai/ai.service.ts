import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AstrologyService } from '../astrology/astrology.service';
import { RagService } from './rag/rag.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { AiChatResponse } from './interfaces/ai.interfaces';

interface CachedAiResponse {
  message: string;
  usedBirthChart: boolean;
  timestamp: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiTimeoutMs = 25000;
  private readonly responseCache = new Map<string, CachedAiResponse>();
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly configService: ConfigService,
    private readonly astrologyService: AstrologyService,
    private readonly ragService: RagService,
  ) {}

  /**
   * Generates a normalized cache key based on query text and birth details
   */
  private getAiCacheKey(dto: AiChatDto): string {
    const normalizedMsg = dto.message.trim().toLowerCase().replace(/\s+/g, ' ');
    if (dto.birthDetails) {
      const { dateOfBirth, timeOfBirth, latitude, longitude } = dto.birthDetails;
      const lat = Number(latitude).toFixed(4);
      const lon = Number(longitude).toFixed(4);
      return `${normalizedMsg}__${dateOfBirth}_${timeOfBirth}_${lat}_${lon}`;
    }
    return `${normalizedMsg}__general`;
  }

  /**
   * Dedicated Vedic Astrology System Prompt with RAG, Chart Rules, and Kundli Kendra Gemstone Guidance
   */
  private getSystemPrompt(): string {
    return [
      'You are the official Vedic Astrology AI Assistant for Kundli Kendra (https://kundlikendra.netlify.app).',
      'Your goal is to provide insightful, accurate, empathetic, and clear Vedic astrological guidance.',
      '',
      'CRITICAL RULES & GUIDELINES:',
      '1. Knowledge Base Priority: When RELEVANT ASTROLOGY KNOWLEDGE is provided below, treat it as your primary authoritative reference material. Do not contradict verified Vedic principles.',
      '',
      '2. Personalized Kundli Data: When KUNDLI DATA is provided below, ONLY use that verified chart information calculated by our Swiss Ephemeris engine.',
      '   - If the user asks about their Lagna (Ascendant), state their exact Ascendant Sign (e.g. Cancer / कर्क लग्न) and degree.',
      '   - If the user asks about their Rashi (Moon Sign / Chandra Rashi), state their exact Moon sign (e.g. Leo / सिंह राशि) and Moon Nakshatra (Janma Nakshatra).',
      '   - If the user asks about their Mahadasha, state their exact Active Mahadasha period.',
      '   - If the user asks about planetary placements, describe the planets in their respective houses accurately.',
      '   - NEVER invent, assume, or recalculate planetary positions, houses, signs, nakshatras, or dasha periods on your own.',
      '',
      '3. Kundli Kendra Lagna-Based Gemstone Guidance Methodology (AUTHORITATIVE):',
      '   When a user asks "Which gemstone should I wear?", "Which stone is good for me?", "Can I wear Panna/Neelam/Pukhraj/Manik/Moonga?", or asks for gemstone recommendations:',
      '   - Step A: Verify the user\'s calculated Lagna from the chart. If birth details are missing, politely ask for Date, Time, and Place of Birth.',
      '   - Step B: Apply the Kundli Kendra Lagna rules:',
      '     * Core Rule (Most Lagnas): Recommend gemstones of the lords of 1st house (Lagna), 5th house, and 9th house.',
      '     * Special Rule for Taurus (Vrishabha) Lagna: Recommend Mercury -> Emerald (Panna) [5th lord] and Saturn -> Blue Sapphire (Neelam) [9th lord]. Do NOT recommend Venus/Diamond (Heera).',
      '     * Special Rule for Virgo (Kanya) Lagna: Recommend Mercury -> Emerald (Panna) [1st lord] and Venus -> Diamond (Heera) [9th lord]. Do NOT recommend the 5th-house lord for primary suggestion.',
      '   - Step C: Planet to Gemstone Mapping:',
      '     * Sun (Surya) -> Ruby (Manik)',
      '     * Moon (Chandra) -> Pearl (Moti)',
      '     * Mars (Mangal) -> Red Coral (Moonga)',
      '     * Mercury (Budh) -> Emerald (Panna)',
      '     * Jupiter (Guru) -> Yellow Sapphire (Pukhraj)',
      '     * Venus (Shukra) -> Diamond (Heera)',
      '     * Saturn (Shani) -> Blue Sapphire (Neelam)',
      '     * Rahu -> Hessonite (Gomed)',
      '     * Ketu -> Cat\'s Eye (Lehsunia)',
      '   - Step D: Cautious Language:',
      '     * Use phrasing such as: "According to the Kundli Kendra gemstone-guidance methodology, for your [Lagna]...", "The primary associated gemstones are...".',
      '     * Do NOT say a stone will definitely fix problems, guarantee wealth/marriage/jobs, or tell the user they must wear all stones.',
      '     * Explain that Lagna provides initial candidate gemstones, and recommend a personalized 1-on-1 human consultation with Astrologer Atul at Kundli Kendra for full chart verification before wearing.',
      '',
      '4. Missing Birth Details: If the user asks for a personalized reading or gemstone suggestion without providing birth details, explain that exact Date, Time, and Place of Birth are required, and offer general educational principles in the meantime.',
      '',
      '5. Language Adaptability: If the user writes in Hindi or Hinglish (e.g. "mera kon sa lagan hai", "kon sa gemstone pehen skta hu me"), reply in natural, clear, respectful Hindi/Hinglish with appropriate Vedic terminology.',
      '',
      '6. Ethical & Tone Boundaries:',
      '   - Do NOT claim to be the human astrologer Atul.',
      '   - Do NOT state that this AI response replaces an authentic human consultation.',
      '   - Do NOT make definitive fatalistic predictions.',
      '   - For sensitive life situations, communicate with compassion, calmness, and respect.',
      '   - If the user desires a comprehensive 1-on-1 human consultation, invite them to book a personalized live session through the Kundli Kendra platform.',
    ].join('\n');
  }

  /**
   * Fast, resilient AI Provider call with multi-model pool rotation
   */
  private async callAiProvider(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey =
      this.configService.get<string>('AI_API_KEY')?.trim() ||
      this.configService.get<string>('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      this.logger.error('AI_API_KEY is not configured in environment variables');
      throw new ServiceUnavailableException(
        'AI Chatbot service is currently unavailable due to missing API configuration',
      );
    }

    const primaryModel =
      this.configService.get<string>('AI_MODEL')?.trim() || 'gemini-3.5-flash-lite';
    const rawBaseUrl =
      this.configService.get<string>('AI_BASE_URL')?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta/openai';

    // Ensure baseUrl does not end with trailing slash(es)
    const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    const chatEndpoint = `${normalizedBaseUrl}/chat/completions`;

    const allModels = [
      primaryModel,
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-2.5-flash',
    ];

    const candidateModels = Array.from(new Set(allModels));
    let lastError: any = null;

    for (const model of candidateModels) {
      this.logger.log(`[AiService] Calling model: ${model}`);

      try {
        const response = await fetch(chatEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
          signal: AbortSignal.timeout(this.aiTimeoutMs),
        });

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.warn(`[AiService] Model ${model} HTTP ${response.status}: ${errorText.substring(0, 150)}`);
          lastError = new BadGatewayException(`AI service returned status ${response.status}`);
          continue;
        }

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content;
        if (!answer) {
          lastError = new BadGatewayException('Empty response received from AI service');
          continue;
        }

        this.logger.log(`[AiService] Successfully completed via ${model}`);
        return answer.trim();
      } catch (err: any) {
        this.logger.warn(`[AiService] Model ${model} error: ${err.message}`);
        lastError = err;
        continue;
      }
    }

    if (lastError?.name === 'TimeoutError' || lastError?.name === 'AbortError') {
      throw new GatewayTimeoutException(
        'The AI service timed out while formulating the answer. Please try again.',
      );
    }

    throw lastError || new BadGatewayException('Failed to communicate with AI service. Please try again.');
  }

  /**
   * Executes AI Chat flow with Parallel RAG Knowledge Retrieval + Cached Kundli Chart generation + AI Response Cache
   */
  async chat(dto: AiChatDto): Promise<AiChatResponse> {
    const conversationId = dto.conversationId?.trim() || randomUUID();
    const cacheKey = this.getAiCacheKey(dto);

    // Check if we already have an identical response cached for these birth details
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      this.logger.log(
        `[AiService] Cache HIT for query: "${dto.message.slice(0, 30)}..." (Birth details unchanged) -> Instant 0ms response`,
      );
      return {
        conversationId,
        message: cached.message,
        usedBirthChart: cached.usedBirthChart,
      };
    }

    let usedBirthChart = false;

    // Execute RAG Knowledge Retrieval and Chart Calculation simultaneously in PARALLEL
    const ragPromise = this.ragService.retrieveContext(dto.message);
    const chartPromise = dto.birthDetails
      ? this.astrologyService.generateChart(dto.birthDetails).catch((err) => {
          this.logger.warn(`Could not calculate chart for AI context: ${err.message}`);
          return null;
        })
      : Promise.resolve(null);

    const [ragResult, chart] = await Promise.all([ragPromise, chartPromise]);

    const promptSections: string[] = [];

    if (ragResult.hasKnowledge) {
      promptSections.push(ragResult.formattedContext);
      promptSections.push('');
    }

    if (chart) {
      const moonPlanet = chart.planets?.find((p: any) => p.name?.toLowerCase() === 'moon');
      const sunPlanet = chart.planets?.find((p: any) => p.name?.toLowerCase() === 'sun');

      const chartSummary = {
        ascendantLagna: {
          sign: chart.ascendant?.sign,
          degree: chart.ascendant?.degree,
          nakshatra: chart.ascendant?.nakshatra,
          nakshatraLord: chart.ascendant?.nakshatraLord,
        },
        moonSignRashi: {
          sign: moonPlanet?.sign || 'Unknown',
          house: moonPlanet?.house || 0,
          janmaNakshatra: moonPlanet?.nakshatra || chart.ascendant?.nakshatra,
          nakshatraLord: moonPlanet?.nakshatraLord,
          nakshatraPada: moonPlanet?.nakshatraPada,
        },
        sunSign: {
          sign: sunPlanet?.sign,
          house: sunPlanet?.house,
        },
        activeMahadasha:
          chart.dashas?.currentMahadasha?.lord ||
          (chart.dashas?.currentMahadasha as any)?.planet ||
          (chart.dashas?.mahadashas && chart.dashas.mahadashas[0]?.planet) ||
          'Unknown',
        planetaryPlacements: chart.planets?.map((p: any) => ({
          planet: p.name,
          sign: p.sign,
          house: p.house,
          degree: p.degree,
          nakshatra: p.nakshatra,
          isRetrograde: p.isRetrograde,
        })),
        houses: chart.houses?.map((h: any) => ({
          house: h.house,
          sign: h.sign,
          signLord: h.signLord,
        })),
      };

      promptSections.push('KUNDLI DATA (Calculated via Swiss Ephemeris Engine):');
      promptSections.push(JSON.stringify(chartSummary, null, 2));
      promptSections.push('');
      usedBirthChart = true;
    }

    promptSections.push(`USER QUESTION:\n${dto.message}`);
    const userPrompt = promptSections.join('\n');

    const systemPrompt = this.getSystemPrompt();
    const replyMessage = await this.callAiProvider(systemPrompt, userPrompt);

    // Save in Response Cache for instant future retrieval when birth details / question are unchanged
    this.responseCache.set(cacheKey, {
      message: replyMessage,
      usedBirthChart,
      timestamp: Date.now(),
    });

    return {
      conversationId,
      message: replyMessage,
      usedBirthChart,
    };
  }
}
