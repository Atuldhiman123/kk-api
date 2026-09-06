import { Test, TestingModule } from '@nestjs/testing';
import { AstrologyController } from './astrology.controller';
import { AstrologyService } from './astrology.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateChartDto } from './dto/generate-chart.dto';

describe('AstrologyController', () => {
  let controller: AstrologyController;

  const mockPrismaService = {
    astrologyChartCache: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AstrologyController],
      providers: [
        AstrologyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<AstrologyController>(AstrologyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return normalized chart from controller', async () => {
    const dto: GenerateChartDto = {
      dateOfBirth: '1990-04-15',
      timeOfBirth: '08:30',
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 5.5,
    };

    const response = await controller.generateChart(dto);
    expect(response).toBeDefined();
    expect(response.ascendant.sign).toBe('Taurus');
    expect(response.planets.some((p) => p.name.includes('Sun'))).toBe(true);
  });
});
