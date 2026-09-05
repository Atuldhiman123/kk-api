import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
  GatewayTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AiChatDto } from './dto/ai-chat.dto';
import { AiChatResponse } from './interfaces/ai.interfaces';
import { RagService } from './rag/rag.service';
import { AstrologyService } from '../astrology/astrology.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiTimeoutMs = 25000;

  // In-memory cache for fast repeated queries (TTL 1 hour)
  private readonly responseCache = new Map<string, { message: string; usedBirthChart: boolean; timestamp: number }>();
  private readonly cacheTtlMs = 60 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly ragService: RagService,
    private readonly astrologyService: AstrologyService,
  ) {}

  private getAiCacheKey(dto: AiChatDto): string {
    const q = (dto.message || '').trim().toLowerCase();
    const dob = dto.birthDetails?.dateOfBirth || '';
    const tob = dto.birthDetails?.timeOfBirth || '';
    const lat = dto.birthDetails?.latitude || 0;
    const lng = dto.birthDetails?.longitude || 0;
    return `${q}_${dob}_${tob}_${lat}_${lng}`;
  }

  private getSystemPrompt(): string {
    return [
      'You are Astrologer Atul, Senior Vedic Astrologer & Gemstone Specialist at Kundli Kendra (https://kundlikendra.netlify.app).',
      'This consultation session is EXCLUSIVELY dedicated to Lucky Gemstone Guidance (शुभ रत्न परामर्श) based on the client\'s Janam Kundli.',
      'Your communication style is warm, experienced, empathetic, respectful, and consultative in natural Hindi/Hinglish.',
      '',
      '1. STRICT GEMSTONE-ONLY SCOPE:',
      '   - This session is ONLY for answering gemstone-related questions (Which stone to wear, 1st/5th/9th house lord stones, Ratti/weight, wearing day/metal, energized gemstones, dasha suitability for gemstones).',
      '   - If the user asks general life predictions (e.g. Career prediction, Marriage timing, Love life, Health diagnosis, Wealth forecast, Government job timing, Children):',
      '     Do NOT give life predictions or marriage/job dates here. Politely reply:',
      '     "Namaste! Yeh vishesh consultation session kewal aapki Janam Kundli ke anusaar Lucky Gemstone (शुभ रत्न परामर्श) aur ratna dharan vidhi ke liye samarpit hai. Career, Marriage, Dasha fal ya sampoorna Kundli vishleshan ke liye aap Kundli Kendra platform par Astrologer Atul ji ke sath 1-on-1 personalized live consultation book kar sakte hain ya helpline (+91 93171 17001) par direct sampark kar sakte hain."',
      '',
      '2. KUNDLI DATA & ENGINE TERMINOLOGY RULES:',
      '   - When KUNDLI DATA is provided below, use that verified chart information accurately.',
      '   - State their exact Ascendant / Lagna sign, Moon sign (Rashi), and Active Mahadasha accurately.',
      '   - NEVER invent or assume different signs or house lords.',
      '   - ABSOLUTELY NEVER mention any engine, software, library, or calculation system name (like "Swiss Ephemeris" or "Swiss calculation engine"). Just refer to it naturally as Vedic Kundli calculations or Janam Kundli.',
      '',
      '3. CORE GEMSTONE RECOMMENDATION RULES (PARASHARI PRINCIPLES):',
      '   - Primary Life Benefics (Trikona Lords): ALWAYS recommend gemstones corresponding to the 1st House (Lagna Lord), 5th House (5th Lord), and 9th House (Bhagya Lord / 9th Lord).',
      '   - E.g. For Cancer (Kark) Lagna: 1st House Moon (Moti/Pearl), 5th House Mars (Moonga/Red Coral), 9th House Jupiter (Pukhraj/Yellow Sapphire).',
      '   - E.g. For Aries (Mesh) Lagna: 1st House Mars (Moonga), 5th House Sun (Manik/Ruby), 9th House Jupiter (Pukhraj).',
      '   - E.g. For Taurus (Vrishabha) Lagna: 1st House Venus (Heera/Diamond/Opal), 5th House Mercury (Panna/Emerald), 9th House Saturn (Neelam/Blue Sapphire).',
      '   - E.g. For Gemini (Mithun) Lagna: 1st House Mercury (Panna), 5th House Venus (Heera/Diamond), 9th House Saturn (Neelam).',
      '   - E.g. For Leo (Simha) Lagna: 1st House Sun (Manik), 5th House Jupiter (Pukhraj), 9th House Mars (Moonga).',
      '   - E.g. For Virgo (Kanya) Lagna: 1st House Mercury (Panna), 5th House Saturn (Neelam), 9th House Venus (Heera/Diamond).',
      '   - E.g. For Libra (Tula) Lagna: 1st House Venus (Heera/Diamond), 5th House Saturn (Neelam), 9th House Mercury (Panna).',
      '   - E.g. For Scorpio (Vrischika) Lagna: 1st House Mars (Moonga), 5th House Jupiter (Pukhraj), 9th House Moon (Moti).',
      '   - E.g. For Sagittarius (Dhanu) Lagna: 1st House Jupiter (Pukhraj), 5th House Mars (Moonga), 9th House Sun (Manik).',
      '   - E.g. For Capricorn (Makar) Lagna: 1st House Saturn (Neelam), 5th House Venus (Heera/Diamond), 9th House Mercury (Panna).',
      '   - E.g. For Aquarius (Kumbh) Lagna: 1st House Saturn (Neelam), 5th House Mercury (Panna), 9th House Venus (Heera/Diamond).',
      '   - E.g. For Pisces (Meen) Lagna: 1st House Jupiter (Pukhraj), 5th House Moon (Moti), 9th House Mars (Moonga).',
      '',
      '4. SHANI / RAHU / KETU DASHA OR CHALLENGING TRANSITS QUESTION:',
      '   - If the user asks whether they can wear gemstones during Shani Dasha, Rahu Dasha, or Sade Sati:',
      '   - Clearly and confidently explain: "Aapki Kundli ke Lagna ke shubh Trikona ratna (1st, 5th aur 9th house ke lords ke ratna) hamesha shubh aur labhkari fal dete hain. Kisi bhi Mahadasha (chahe Shani ki ho ya Rahu ki) mein yeh shubh ratna aapko suraksha, man ki shanti aur sakaratmak urja pradaan karte hain."',
      '',
      '5. OTHER PLANET GEMSTONES (OUTSIDE 1st, 5th, 9th HOUSES):',
      '   - If the user asks about wearing a stone for any other planet (e.g. asking if Cancer Lagna can wear Neelam, Panna, or Diamond):',
      '   - Clearly state: "Aapki Kundli ke anusaar aapke primary shubh ratna 1st, 5th aur 9th house ke hain (jaise Moti, Moonga, Pukhraj). Inke alawa kisi anya grah ka ratna dharan karne ke liye aap Astrologer Atul se direct paramarsh lein."',
      '',
      '6. EXACT RATTI (WEIGHT) & 100% GENUINE NATURAL GEMSTONES GUARANTEE:',
      '   - Weight in Ratti: Explain clearly that exact Ratti (Carat) depends on body weight and planetary degrees.',
      '   - Conclude naturally with the guarantee CTA:',
      '     "100% Natural, Genuine Lab-Certified aur Abhimantrit (Energized) Shuddh Ratna 100% result guarantee ke sath prapt karne ke liye aur exact Ratti calculation ke liye aap seedhe Astrologer Atul / Kundli Kendra (+91 93171 17001) se sampark kar sakte hain."',
      '',
      '7. PROHIBITED PHRASES (STRICT):',
      '   - NEVER write disclaimers like \'Koi bhi ratn bina puri kundli ka sukshm adhyayan kiye pehnana uchit nahi hai\' or \'Yeh kewal prathmik sujhaav hain\'.',
      '   - Never mention "Swiss Ephemeris", "Swiss calculation engine" or any software names.',
      '   - Never use \'Cautious Advice\' headings. Speak with the warmth, authority, and confidence of Astrologer Atul.',
    ].join('\n');
  }

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
      this.configService.get<string>('AI_MODEL')?.trim() || 'gemini-2.0-flash';
    const rawBaseUrl =
      this.configService.get<string>('AI_BASE_URL')?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta/openai';

    const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    const chatEndpoint = `${normalizedBaseUrl}/chat/completions`;

    const allModels = [
      primaryModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-1.5-pro',
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
    const msgLower = (dto.message || '').toLowerCase();

    // Strict gemstone-only detection
    const isGemstoneQuery =
      msgLower.includes('ratna') || msgLower.includes('ratn') || msgLower.includes('gemstone') ||
      msgLower.includes('stone') || msgLower.includes('panna') || msgLower.includes('neelam') ||
      msgLower.includes('pukhraj') || msgLower.includes('moti') || msgLower.includes('moonga') ||
      msgLower.includes('munga') || msgLower.includes('heera') || msgLower.includes('manik') ||
      msgLower.includes('gomed') || msgLower.includes('lehsunia') || msgLower.includes('pearl') ||
      msgLower.includes('ruby') || msgLower.includes('emerald') || msgLower.includes('sapphire') ||
      msgLower.includes('diamond') || msgLower.includes('coral') || msgLower.includes('ratti') ||
      msgLower.includes('carat') || msgLower.includes('dharan') || msgLower.includes('pehan') ||
      msgLower.includes('pehen') || msgLower.includes('ring') || msgLower.includes('anguthi') ||
      msgLower.includes('finger') || msgLower.includes('shuddhi') || msgLower.includes('energiz') ||
      msgLower.includes('abhimantrit') || msgLower.includes('lucky stone') || msgLower.includes('lucky ratna');

    // If the query asks for marriage, career, job, health, wealth or general life without gemstone focus, return polite redirect
    const nonGemstoneIntent =
      msgLower.includes('shadi') || msgLower.includes('shaadi') || msgLower.includes('vivah') ||
      msgLower.includes('marriage') || msgLower.includes('rishta') || msgLower.includes('career') ||
      msgLower.includes('naukri') || msgLower.includes('job') || msgLower.includes('business') ||
      msgLower.includes('vyapar') || msgLower.includes('swasthya') || msgLower.includes('health') ||
      msgLower.includes('bimari') || msgLower.includes('santan') || msgLower.includes('paisa') ||
      msgLower.includes('dhan') || msgLower.includes('property') || msgLower.includes('love') ||
      msgLower.includes('pyaar') || msgLower.includes('divorce') || msgLower.includes('future');

    if (!isGemstoneQuery || (nonGemstoneIntent && !isGemstoneQuery)) {
      return {
        conversationId,
        message:
          'Namaste! 🙏 Yeh vishesh consultation session kewal aapki Janam Kundli ke anusaar **Lucky Gemstone (शुभ रत्न परामर्श)** aur ratna dharan vidhi ke liye samarpit hai.\n\nCareer, Marriage, Dasha fal ya sampoorna Kundli vishleshan ke liye aap **Astrologer Atul** ji se Kundli Kendra platform par 1-on-1 personalized live consultation book kar sakte hain ya helpline (+91 93171 17001) par direct sampark kar sakte hain.',
        usedBirthChart: false,
      };
    }

    const cacheKey = this.getAiCacheKey(dto);
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return {
        conversationId,
        message: cached.message,
        usedBirthChart: cached.usedBirthChart,
      };
    }

    let usedBirthChart = false;

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

      promptSections.push('KUNDLI DATA (Vedic Chart Calculations):');
      promptSections.push(JSON.stringify(chartSummary, null, 2));
      promptSections.push('');
      usedBirthChart = true;
    }

    promptSections.push(`USER QUESTION:\n${dto.message}`);
    const userPrompt = promptSections.join('\n');

    const systemPrompt = this.getSystemPrompt();
    const replyMessage = await this.callAiProvider(systemPrompt, userPrompt);

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
