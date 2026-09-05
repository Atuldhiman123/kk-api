import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateChartDto } from './dto/generate-chart.dto';
import {
  AscendantDetail,
  AstrologyChartResponse,
  DashasInfo,
  HouseDetail,
  PlanetDetail,
} from './interfaces/astrology.interfaces';

@Injectable()
export class AstrologyService {
  private readonly logger = new Logger(AstrologyService.name);
  private readonly baseUrl = 'https://vedintelastroapi.com';
  private readonly requestTimeoutMs = 12000;
  private readonly l1MemoryCache = new Map<string, AstrologyChartResponse>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getApiKey(): string {
    const apiKey =
      this.configService.get<string>('VEDINTEL_API_KEY')?.trim() ||
      'vai_pk_e3thtY1PC1BfZd125iVgEX7NV7mfHtbo';
    if (!apiKey) {
      this.logger.error('VEDINTEL_API_KEY is not configured in environment variables');
      throw new InternalServerErrorException(
        'Astrology service is currently unavailable due to configuration error',
      );
    }
    return apiKey;
  }

  /**
   * Generates a normalized cache key for birth details
   */
  private getCacheKey(dto: GenerateChartDto): string {
    const lat = Number(dto.latitude).toFixed(4);
    const lon = Number(dto.longitude).toFixed(4);
    const tz = Number(dto.timezone).toFixed(2);
    return `${dto.dateOfBirth}_${dto.timeOfBirth}_${lat}_${lon}_${tz}`;
  }

  /**
   * Converts YYYY-MM-DD to DD/MM/YYYY for VedIntel API
   */
  private formatDob(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  /**
   * Securely performs HTTP GET request to VedIntel API
   */
  private async fetchVedIntel(endpoint: string, params: Record<string, string>): Promise<any> {
    const apiKey = this.getApiKey();
    const query = new URLSearchParams({
      api_key: apiKey,
      ...params,
    });

    const url = `${this.baseUrl}${endpoint}?${query.toString()}`;
    this.logger.log(`[VedIntel API] Consuming live call to: ${endpoint}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `VedIntel API error on ${endpoint}: HTTP ${response.status} - ${errorText}`,
        );
        throw new BadGatewayException(`Astrology service returned status ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      if (err instanceof BadGatewayException || err instanceof InternalServerErrorException) {
        throw err;
      }

      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        this.logger.error(`Timeout while calling VedIntel endpoint: ${endpoint}`);
        throw new GatewayTimeoutException('Astrology service timed out. Please try again.');
      }

      this.logger.error(`Failed calling VedIntel endpoint ${endpoint}: ${err.message}`);
      throw new BadGatewayException('Failed to communicate with astrology service');
    }
  }

  /**
   * Generates a normalized astrology chart using 2-Tier Persistent Caching:
   * Tier 1: In-Memory RAM Map (0ms)
   * Tier 2: PostgreSQL Database (0 VedIntel API calls)
   * Fallback: Live VedIntel API (Saved immediately to Tier 1 & 2)
   */
  async generateChart(dto: GenerateChartDto): Promise<AstrologyChartResponse> {
    const cacheKey = this.getCacheKey(dto);

    // 1. Check Tier 1: In-Memory Cache
    const inMem = this.l1MemoryCache.get(cacheKey);
    if (inMem) {
      this.logger.log(`[AstrologyService] Cache HIT (Tier 1 Memory): ${cacheKey} -> 0ms, 0 API calls`);
      return inMem;
    }

    // 2. Check Tier 2: Persistent PostgreSQL Database Cache
    try {
      const dbCached = await this.prisma.astrologyChartCache.findUnique({
        where: { cacheKey },
      });

      if (dbCached && dbCached.chartData) {
        const cachedChart = dbCached.chartData as unknown as AstrologyChartResponse;
        this.l1MemoryCache.set(cacheKey, cachedChart);
        this.logger.log(`[AstrologyService] Cache HIT (Tier 2 DB): ${cacheKey} -> 0 VedIntel API calls consumed`);
        return cachedChart;
      }
    } catch (dbErr: any) {
      this.logger.warn(`[AstrologyService] DB cache lookup skipped: ${dbErr.message}`);
    }

    // 3. Fallback to Live VedIntel API (Only if never computed before)
    this.logger.warn(`[AstrologyService] Cache MISS: ${cacheKey}. Fetching live from VedIntel API...`);

    const formattedDob = this.formatDob(dto.dateOfBirth);

    const queryParams: Record<string, string> = {
      dob: formattedDob,
      tob: dto.timeOfBirth,
      lat: dto.latitude.toString(),
      lon: dto.longitude.toString(),
      tz: dto.timezone.toString(),
      lang: 'en',
    };

    // Parallel fetch of required endpoints
    const [planetData, houseData, dashaData] = await Promise.allSettled([
      this.fetchVedIntel('/api/v1/horoscope/planet-details', queryParams),
      this.fetchVedIntel('/api/v1/extended-horoscope/kp-houses', queryParams),
      this.fetchVedIntel('/api/v1/dashas/current-mahadasha-full', queryParams),
    ]);

    if (planetData.status === 'rejected') {
      throw planetData.reason;
    }

    const rawPlanets = planetData.value?.response || {};
    const rawHouses = houseData.status === 'fulfilled' ? houseData.value?.response : [];
    const rawDashas = dashaData.status === 'fulfilled' ? dashaData.value?.response : {};

    // Extract and Normalize Ascendant & Planets
    let ascendant: AscendantDetail = {
      sign: 'Unknown',
      degree: 0,
      nakshatra: 'Unknown',
    };
    const planets: PlanetDetail[] = [];

    const planetEntries = Object.values(rawPlanets) as any[];

    for (const item of planetEntries) {
      if (!item || typeof item !== 'object') continue;

      const isAsc =
        item.name === 'As' ||
        item.full_name?.toLowerCase() === 'ascendant' ||
        (item.zodiac && item.house === 1 && item.name === 'As');

      if (isAsc) {
        ascendant = {
          sign: item.zodiac || item.sign || 'Unknown',
          signLord: item.sign_lord || item.nakshatra_lord,
          degree: Number(Number(item.local_degree ?? item.degree ?? 0).toFixed(2)),
          globalDegree: Number(Number(item.global_degree ?? 0).toFixed(2)),
          nakshatra: item.nakshatra || 'Unknown',
          nakshatraLord: item.nakshatra_lord,
          nakshatraPada: item.nakshatra_pada ? Number(item.nakshatra_pada) : undefined,
          house: item.house ? Number(item.house) : 1,
        };
      } else {
        const isRetro =
          item.retro === true ||
          item.is_retro === 'true' ||
          item.is_retro === true ||
          item.isRetro === true;

        planets.push({
          name: item.full_name || item.name || 'Unknown',
          code: item.name,
          sign: item.zodiac || item.sign || 'Unknown',
          degree: Number(Number(item.local_degree ?? item.degree ?? 0).toFixed(2)),
          globalDegree: Number(Number(item.global_degree ?? 0).toFixed(2)),
          house: item.house ? Number(item.house) : undefined,
          isRetrograde: Boolean(isRetro),
          nakshatra: item.nakshatra,
          nakshatraLord: item.nakshatra_lord,
          nakshatraPada: item.nakshatra_pada ? Number(item.nakshatra_pada) : undefined,
        });
      }
    }

    // Extract and Normalize Houses
    const houses: HouseDetail[] = [];
    if (Array.isArray(rawHouses)) {
      for (const h of rawHouses) {
        if (!h || typeof h !== 'object') continue;
        houses.push({
          house: Number(h.house),
          sign: h.sign || 'Unknown',
          degree: Number(Number(h.local_degree ?? h.cusp_degree ?? 0).toFixed(2)),
          signLord: h.sign_lord,
          nakshatra: h.nakshatra,
          nakshatraLord: h.nakshatra_lord,
          subLord: h.sub_lord,
        });
      }
    }

    // Extract and Normalize Dashas
    const dashas: DashasInfo = {
      mahadashas: [],
      antardashas: [],
    };

    if (rawDashas) {
      if (rawDashas.order_of_dashas?.major) {
        dashas.currentMahadasha = {
          lord: rawDashas.order_of_dashas.major.name || rawDashas.order_of_dashas.major.key,
          start: rawDashas.order_of_dashas.major.start,
          end: rawDashas.order_of_dashas.major.end,
        };
      }

      if (Array.isArray(rawDashas.mahadasha)) {
        dashas.mahadashas = rawDashas.mahadasha.map((m: any) => ({
          planet: m.name || m.key,
          start: m.start,
          end: m.end,
        }));
      }

      if (Array.isArray(rawDashas.antardasha)) {
        dashas.antardashas = rawDashas.antardasha.map((a: any) => ({
          planet: a.name || a.key,
          start: a.start,
          end: a.end,
        }));
      }
    }

    const result: AstrologyChartResponse = {
      birthDetails: {
        dateOfBirth: dto.dateOfBirth,
        timeOfBirth: dto.timeOfBirth,
        latitude: dto.latitude,
        longitude: dto.longitude,
        timezone: dto.timezone,
      },
      ascendant,
      planets,
      houses,
      dashas,
    };

    // Save to Tier 1 (Memory)
    this.l1MemoryCache.set(cacheKey, result);

    // Save to Tier 2 (PostgreSQL Database)
    try {
      await this.prisma.astrologyChartCache.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          chartData: result as any,
        },
        update: {
          chartData: result as any,
        },
      });
      this.logger.log(`[AstrologyService] Successfully persisted chart to DB cache: ${cacheKey}`);
    } catch (saveErr: any) {
      this.logger.warn(`[AstrologyService] Could not persist chart to DB: ${saveErr.message}`);
    }

    return result;
  }
}
