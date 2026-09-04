import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AstrologyController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /astrology/chart', () => {
    it('should generate a normalized astrology chart for valid birth details', async () => {
      const payload = {
        dateOfBirth: '1990-04-15',
        timeOfBirth: '08:30',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 5.5,
      };

      const res = await request(app.getHttpServer())
        .post('/astrology/chart')
        .send(payload)
        .expect(200);

      expect(res.body).toHaveProperty('birthDetails');
      expect(res.body.birthDetails).toEqual(payload);

      // Ascendant
      expect(res.body).toHaveProperty('ascendant');
      expect(res.body.ascendant.sign).toBe('Taurus');
      expect(res.body.ascendant.nakshatra).toBe('Rohini');
      expect(typeof res.body.ascendant.degree).toBe('number');

      // Planets
      expect(res.body).toHaveProperty('planets');
      expect(Array.isArray(res.body.planets)).toBe(true);
      expect(res.body.planets.length).toBeGreaterThanOrEqual(7);

      const sun = res.body.planets.find((p: any) => p.name.includes('Sun'));
      expect(sun).toBeDefined();
      expect(sun.sign).toBe('Aries');
      expect(sun.house).toBe(12);

      // Houses
      expect(res.body).toHaveProperty('houses');
      expect(res.body.houses.length).toBe(12);
      expect(res.body.houses[0].house).toBe(1);
      expect(res.body.houses[0].sign).toBe('Taurus');

      // Dashas
      expect(res.body).toHaveProperty('dashas');
      expect(res.body.dashas.mahadashas.length).toBeGreaterThan(0);
      expect(res.body.dashas.currentMahadasha).toBeDefined();
    }, 25000);

    it('should reject invalid dateOfBirth format with 400 Bad Request', async () => {
      const payload = {
        dateOfBirth: '15-04-1990', // invalid format (expects YYYY-MM-DD)
        timeOfBirth: '08:30',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 5.5,
      };

      const res = await request(app.getHttpServer())
        .post('/astrology/chart')
        .send(payload)
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('dateOfBirth must be in YYYY-MM-DD format')]),
      );
    });

    it('should reject out-of-range coordinates with 400 Bad Request', async () => {
      const payload = {
        dateOfBirth: '1990-04-15',
        timeOfBirth: '08:30',
        latitude: 195.5, // invalid (> 90)
        longitude: -200, // invalid (< -180)
        timezone: 5.5,
      };

      const res = await request(app.getHttpServer())
        .post('/astrology/chart')
        .send(payload)
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('latitude must be between -90 and 90'),
          expect.stringContaining('longitude must be between -180 and 180'),
        ]),
      );
    });
  });
});
