import { Test, TestingModule } from '@nestjs/testing';
import { AstrologyService } from './astrology.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateChartDto } from './dto/generate-chart.dto';

describe('AstrologyService', () => {
  let service: AstrologyService;

  const mockPrismaService = {
    astrologyChartCache: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AstrologyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AstrologyService>(AstrologyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should accurately calculate and normalize Vedic birth chart in-house', async () => {
    const dto: GenerateChartDto = {
      dateOfBirth: '1990-04-15',
      timeOfBirth: '08:30',
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 5.5,
    };

    const result = await service.generateChart(dto);

    expect(result).toBeDefined();
    expect(result.birthDetails).toEqual(dto);
    expect(result.ascendant).toBeDefined();
    expect(result.ascendant.sign).toBe('Taurus');
    expect(result.ascendant.signLord).toBe('Venus');
    expect(result.planets.length).toBe(9); // Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu
    expect(result.houses.length).toBe(12);
    expect(result.dashas).toBeDefined();
    expect(result.dashas.mahadashas.length).toBe(9);
    expect(result.dashas.currentMahadasha).toBeDefined();
    expect(result.dashas.currentMahadasha?.lord).toBeDefined();
    expect(result.dashas.antardashas?.length).toBe(9);
  });
});
