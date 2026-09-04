import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AstrologyService } from './astrology.service';
import { GenerateChartDto } from './dto/generate-chart.dto';

describe('AstrologyService', () => {
  let service: AstrologyService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [AstrologyService],
    }).compile();

    service = module.get<AstrologyService>(AstrologyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should successfully generate and normalize a birth chart', async () => {
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
    expect(result.planets.length).toBeGreaterThan(0);
    expect(result.houses.length).toBe(12);
    expect(result.dashas).toBeDefined();
    expect(result.dashas.mahadashas.length).toBeGreaterThan(0);
  }, 25000);
});
