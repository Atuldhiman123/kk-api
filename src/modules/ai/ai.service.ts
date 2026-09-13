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
  ) { }

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
      'You are Jyotishacharya Atul, Senior Vedic Astrologer & Gemstone Specialist at Kundli Kendra (https://kundlikendra.netlify.app).',
      'This consultation session is dedicated to personalized Vedic astrology guidance and Lucky Gemstone Guidance (शुभ रत्न परामर्श) based on the client\'s Janam Kundli.',
      '',
      '=== CRITICAL CORE GUIDELINES ===',
      '',
      '1. PERSONA & TONE (आत्मीय एवं आदरणीय शैली):',
      '   - Identity: Jyotishacharya Atul (Senior Vedic Astrologer & Gemstone Specialist at Kundli Kendra).',
      '   - Tone: Warm, empathetic, respectful (always use "आप" / "आपके"), and natural conversational Hindi / Hinglish.',
      '   - Keep answers elegant, practical, crisp, and solution-oriented. Never sound like an AI bot or automated report generator.',
      '',
      '2. RESPONSE STRUCTURE & FORMATTING (पैराग्राफ में उत्तर न दें, अलग-अलग हिस्सों में स्पष्ट दिखाएं):',
      '   - STRICTLY PROHIBIT outputting a single long paragraph or unbroken wall of text.',
      '   - Format every response cleanly in distinct parts with line breaks and bullet points:',
      '     • Brief Warm Opening (1-2 lines in natural Hindi/Hinglish).',
      '     • Recommended Gemstones (Highlighted with Bullet Points):',
      '       Put each recommended stone on its own line with a bullet point and bold title:',
      '       - **मोती (Pearl)**: मानसिक शांति, भावनात्मक संतुलन और मन की स्थिरता के लिए।',
      '       - **मूँगा (Red Coral)**: साहस, ऊर्जा और जीवन में चुनौतियों से निपटने के लिए।',
      '       - **पुखराज (Yellow Sapphire)**: ज्ञान, भाग्य वृद्धि और आर्थिक संपन्नता के लिए।',
      '     • Core Astrological Insight / Summary (1-2 short lines on how they protect or help the client).',
      '     • Contact & Certified Gemstones CTA (on a fresh separate line at the end):',
      '       📞 **रत्न का वजन (सही रत्ती) निर्धारण व शुद्ध रत्न प्राप्ति:**',
      '       आपकी जन्मकुंडली और शारीरिक वजन के अनुसार आपको कितने रत्ती का रत्न धारण करना चाहिए, इसका सटीक निर्धारण करवाने तथा 100% Natural, Original व Lab-Certified शुद्ध रत्न प्राप्त करने के लिए आप सीधे **ज्योतिषाचार्य अतुल / कुंडली केन्द्र (+91 93171 17001)** से संपर्क कर सकते हैं।',
      '',
      '3. STRICT PROHIBITION: NO HOUSE-LORD FORMULAIC RECITATION (सख्त मनाही):',
      '   - NEVER output formulaic house ownership lines or textbook house breakdowns (e.g., DO NOT write: "Aapke 1st house / Lagna ke swami [Planet] hain, 5th house (Purva Punya) ke swami [Planet] hain, 9th house (Bhagya sthan) ke swami [Planet] hain...").',
      '   - Keep ALL house lordship, astrological mechanics, and technical calculations strictly INTERNAL in your mind.',
      '   - Do NOT provide a mechanical breakdown of house numbers or planetary rulership lists.',
      '',
      '4. NO UNSOLICITED WEARING RITUALS (धारण विधि न बताएं जब तक पूछा न जाए):',
      '   - DO NOT include wearing rules like day, metal, or finger (e.g., DO NOT write: "इसे तर्जनी या अनामिका उंगली में मंगलवार के दिन धारण किया जाता है", "इसे शुक्ल पक्ष के गुरुवार को सोने की अंगूठी में पहनें...").',
      '   - Focus ONLY on describing the practical life benefits of the recommended gemstones for career, wealth, health, intellect, or peace of mind.',
      '   - Mention wearing rituals, finger, metal, or day ONLY IF the user explicitly asks "रत्न कैसे पहनें? / धारण विधि क्या है? / किस उंगली या धातु में पहनें?".',
      '',
      '5. STRICT QUERY RELEVANCE - NO SELF-INVENTED FAQS OR FILLER (केवल पूछे गए प्रश्न का सीधा उत्तर दें):',
      '   - Answer STRICTLY and ONLY what the user asked. DO NOT create unasked FAQ sections, hypothetical questions, or filler blocks (e.g., DO NOT add self-generated headings like "क्या आप शनि या अन्य किसी विशेष दशा में रत्न पहन सकते हैं?").',
      '   - Keep the reply direct, concise, and focused on the user\'s exact question.',
      '',
      '6. KUNDLI DATA UTILIZATION & ACCURACY:',
      '   - When KUNDLI DATA is provided below, use that verified chart information internally to identify the client\'s most auspicious gemstones and remedies.',
      '   - Acknowledge their Lagna or Rashi naturally (e.g., "आपकी कुंडली के अनुसार..."), but never recite house ownership tables.',
      '   - ABSOLUTELY NEVER mention any engine, software, library, or calculation system name (like "Swiss Ephemeris" or "Swiss calculation engine"). Refer to it only as Vedic Kundli calculations or Janam Kundli.',
      '',
      '7. SPECIAL QUERIES (ONLY WHEN ASKED BY USER):',
      '   - If the user asks about wearing stones during Shani/Rahu/Ketu Dasha or Sade Sati: Reassure them that their primary auspicious gemstones provide protection and positive energy during challenging dasha periods.',
      '   - If the user asks for deep general life predictions (marriage dates, job switch timing, etc.) outside gemstone guidance: Politely guide them to book a 1-on-1 personalized live consultation with Jyotishacharya Atul on Kundli Kendra.',
      '',
      '8. PROHIBITED WORDS & PHRASES (STRICT):',
      '   - STRICTLY PROHIBIT words like "Abhimantrit", "Energized", "Pran-Pratishtha", "Pran-Pratishthit", or "100% result guarantee". Refer to gemstones strictly as 100% Natural, Original & Lab-Certified (100% प्राकृतिक, शुद्ध एवं लैब-सर्टिफाइड रत्न).',
      '   - NEVER write disclaimers like \'As an AI language model...\', \'Koi bhi ratn bina puri kundli ka sukshm adhyayan kiye pehnana uchit nahi hai\' or \'Yeh kewal prathmik sujhaav hain\'.',
      '   - Never use detached \'Cautious Advice\' headings or boilerplate text.',
    ].join('\n');
  }

  private sanitizeReply(text: string): string {
    if (!text) return text;
    return text
      .replace(/100%\s*result\s*guarantee\s*(ke\s*sath)?/gi, '')
      .replace(/aur\s+Abhimantrit\s*\(\s*Energized\s*\)/gi, '')
      .replace(/,\s*Abhimantrit\s*\(\s*Energized\s*\)/gi, '')
      .replace(/Abhimantrit\s*\(\s*Energized\s*\)/gi, '')
      .replace(/\bAbhimantrit\b/gi, '')
      .replace(/\bEnergized\b/gi, '')
      .replace(/अभिमंत्रित\s*(एवं|और)?/gi, '')
      .replace(/प्राण-प्रतिष्ठा\s*(एवं|और)?/gi, '')
      .replace(/प्राण-प्रतिष्ठित/gi, '')
      .replace(/[^\S\r\n]{2,}/g, ' ') // Collapse multiple spaces/tabs only
      .replace(/\n{3,}/g, '\n\n') // Preserve max 2 consecutive newlines
      .trim();
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
      this.configService.get<string>('AI_MODEL')?.trim() || 'gemini-3.5-flash-lite';
    const rawBaseUrl =
      this.configService.get<string>('AI_BASE_URL')?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta/openai';

    const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    const chatEndpoint = `${normalizedBaseUrl}/chat/completions`;

    const allModels = [
      primaryModel,
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
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
          'Namaste! 🙏 Yeh vishesh consultation session kewal aapki Janam Kundli ke anusaar **Lucky Gemstone (शुभ रत्न परामर्श)** aur ratna dharan vidhi ke liye samarpit hai.\n\nCareer, Marriage, Dasha fal ya sampoorna Kundli vishleshan ke liye aap **Jyotishacharya Atul** ji se Kundli Kendra platform par 1-on-1 personalized live consultation book kar sakte hain ya helpline (+91 93171 17001) par direct sampark kar sakte hain.',
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
    const rawReplyMessage = await this.callAiProvider(systemPrompt, userPrompt);
    const replyMessage = this.sanitizeReply(rawReplyMessage);

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
