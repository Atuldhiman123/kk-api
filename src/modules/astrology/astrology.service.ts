import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateChartDto } from './dto/generate-chart.dto';
import { AstronomyCalculator } from './engine/astronomy.calculator';
import { AstrologyChartResponse } from './interfaces/astrology.interfaces';

@Injectable()
export class AstrologyService {
  private readonly logger = new Logger(AstrologyService.name);
  private readonly l1MemoryCache = new Map<string, AstrologyChartResponse>();

  constructor(private readonly prisma: PrismaService) {}

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
   * Generates a normalized astrology chart using 2-Tier Persistent Caching:
   * Tier 1: In-Memory RAM Map (0ms)
   * Tier 2: Persistent PostgreSQL Database (0 recalculations)
   * Fallback: High-precision In-House Vedic Astronomy Engine (Saved immediately to Tier 1 & 2)
   */
  async generateChart(dto: GenerateChartDto): Promise<AstrologyChartResponse> {
    const cacheKey = this.getCacheKey(dto);

    // 1. Check Tier 1: In-Memory RAM Cache
    const inMem = this.l1MemoryCache.get(cacheKey);
    if (inMem) {
      this.logger.log(`[AstrologyService] Cache HIT (Tier 1 Memory): ${cacheKey} -> 0ms`);
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
        this.logger.log(`[AstrologyService] Cache HIT (Tier 2 DB): ${cacheKey} -> loaded from database`);
        return cachedChart;
      }
    } catch (dbErr: any) {
      this.logger.warn(`[AstrologyService] DB cache lookup skipped: ${dbErr.message}`);
    }

    // 3. In-House Astronomy Calculation Engine (NASA Ephemeris + Lahiri Ayanamsha)
    this.logger.log(`[AstrologyService] Computing Vedic Chart in-house for: ${cacheKey}`);

    try {
      const result = AstronomyCalculator.calculateChart({
        dateOfBirth: dto.dateOfBirth,
        timeOfBirth: dto.timeOfBirth,
        latitude: Number(dto.latitude),
        longitude: Number(dto.longitude),
        timezone: Number(dto.timezone),
      });

      // Save to Tier 1 (RAM)
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
    } catch (calcErr: any) {
      this.logger.error(`[AstrologyService] Error calculating chart: ${calcErr.message}`, calcErr.stack);
      throw new InternalServerErrorException('Failed to calculate astrological chart.');
    }
  }
}
