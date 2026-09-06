import * as Astronomy from 'astronomy-engine';
import {
  AscendantDetail,
  AstrologyChartResponse,
  BirthDetails,
  DashasInfo,
  HouseDetail,
  PlanetDetail,
} from '../interfaces/astrology.interfaces';

// 12 Zodiac Signs & their Vedic Lords
const ZODIAC_SIGNS = [
  { name: 'Aries', lord: 'Mars' },
  { name: 'Taurus', lord: 'Venus' },
  { name: 'Gemini', lord: 'Mercury' },
  { name: 'Cancer', lord: 'Moon' },
  { name: 'Leo', lord: 'Sun' },
  { name: 'Virgo', lord: 'Mercury' },
  { name: 'Libra', lord: 'Venus' },
  { name: 'Scorpio', lord: 'Mars' },
  { name: 'Sagittarius', lord: 'Jupiter' },
  { name: 'Capricorn', lord: 'Saturn' },
  { name: 'Aquarius', lord: 'Saturn' },
  { name: 'Pisces', lord: 'Jupiter' },
];

// 27 Nakshatras & their Vimshottari Lords
const NAKSHATRAS = [
  { name: 'Ashwini', lord: 'Ketu' },
  { name: 'Bharani', lord: 'Venus' },
  { name: 'Krittika', lord: 'Sun' },
  { name: 'Rohini', lord: 'Moon' },
  { name: 'Mrigashira', lord: 'Mars' },
  { name: 'Ardra', lord: 'Rahu' },
  { name: 'Punarvasu', lord: 'Jupiter' },
  { name: 'Pushya', lord: 'Saturn' },
  { name: 'Ashlesha', lord: 'Mercury' },
  { name: 'Magha', lord: 'Ketu' },
  { name: 'Purva Phalguni', lord: 'Venus' },
  { name: 'Uttara Phalguni', lord: 'Sun' },
  { name: 'Hasta', lord: 'Moon' },
  { name: 'Chitra', lord: 'Mars' },
  { name: 'Swati', lord: 'Rahu' },
  { name: 'Vishakha', lord: 'Jupiter' },
  { name: 'Anuradha', lord: 'Saturn' },
  { name: 'Jyeshtha', lord: 'Mercury' },
  { name: 'Mula', lord: 'Ketu' },
  { name: 'Purva Ashadha', lord: 'Venus' },
  { name: 'Uttara Ashadha', lord: 'Sun' },
  { name: 'Shravana', lord: 'Moon' },
  { name: 'Dhanishta', lord: 'Mars' },
  { name: 'Shatabhisha', lord: 'Rahu' },
  { name: 'Purva Bhadrapada', lord: 'Jupiter' },
  { name: 'Uttara Bhadrapada', lord: 'Saturn' },
  { name: 'Revati', lord: 'Mercury' },
];

// Vimshottari Dasha Lords Order & Duration in Years
const VIMSHOTTARI_LORDS = [
  { lord: 'Ketu', years: 7 },
  { lord: 'Venus', years: 20 },
  { lord: 'Sun', years: 6 },
  { lord: 'Moon', years: 10 },
  { lord: 'Mars', years: 7 },
  { lord: 'Rahu', years: 18 },
  { lord: 'Jupiter', years: 16 },
  { lord: 'Saturn', years: 19 },
  { lord: 'Mercury', years: 17 },
];

export class AstronomyCalculator {
  /**
   * Calculates high-precision Lahiri (Chitra Paksha) Ayanamsha for the given Astronomy.AstroTime.
   * Note: In Astronomy Engine, astroTime.ut is DAYS since J2000.0 (2000-01-01 12:00 UTC).
   */
  public static calculateLahiriAyanamsha(astroTime: Astronomy.AstroTime): number {
    const T = astroTime.ut / 36525.0; // Julian centuries from J2000.0
    const yearsFrom2000 = astroTime.ut / 365.25;
    // Standard Lahiri Ayanamsha (23°51'22" at J2000 with 50.290966"/yr precession)
    const ayanamsha = 23.856111 + (50.290966 * yearsFrom2000) / 3600.0 - 0.000111 * T * T;
    return ayanamsha;
  }

  /**
   * Calculates high-precision Mean & True Ascending Lunar Node (Rahu) in Tropical degrees
   */
  public static calculateRahuTropical(astroTime: Astronomy.AstroTime): number {
    const T = astroTime.ut / 36525.0;
    // Mean node of the Moon (Omega)
    let omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000.0;
    omega = omega % 360.0;
    if (omega < 0) omega += 360.0;

    // Periodic corrections for True Node (Jean Meeus Astronomical Algorithms)
    const deg2rad = Math.PI / 180.0;
    const D = ((297.85036 + 445267.11148 * T) % 360.0) * deg2rad;
    const M = ((357.52772 + 35999.05034 * T) % 360.0) * deg2rad;
    const F = ((93.27191 + 483202.017538 * T) % 360.0) * deg2rad;

    const correction =
      -1.4979 * Math.sin(2 * (D - F)) -
      0.15 * Math.sin(M) -
      0.1226 * Math.sin(2 * D) +
      0.1176 * Math.sin(2 * F) -
      0.0801 * Math.sin(2 * (D - M));

    let trueNode = (omega + correction) % 360.0;
    if (trueNode < 0) trueNode += 360.0;
    return trueNode;
  }

  /**
   * Converts Tropical longitude to Sidereal (Nirayana) longitude
   */
  public static toSidereal(tropicalLon: number, ayanamsha: number): number {
    let sid = (tropicalLon - ayanamsha) % 360.0;
    if (sid < 0) sid += 360.0;
    return sid;
  }

  /**
   * Calculates Nakshatra details (Name, Lord, Pada) for a given sidereal longitude
   */
  public static getNakshatraDetail(siderealDegree: number): {
    nakshatra: string;
    nakshatraLord: string;
    nakshatraPada: number;
    subLord: string;
  } {
    const nakSpan = 360.0 / 27.0; // 13.3333333333°
    const padaSpan = nakSpan / 4.0; // 3.3333333333°

    const nakIndex = Math.min(26, Math.max(0, Math.floor(siderealDegree / nakSpan)));
    const posInNak = siderealDegree - nakIndex * nakSpan;
    const pada = Math.min(4, Math.max(1, Math.floor(posInNak / padaSpan) + 1));

    const nak = NAKSHATRAS[nakIndex];

    // Calculate KP Sub-lord
    const startLordIdx = nakIndex % 9;
    let accumulatedSpan = 0;
    let subLord = nak.lord;

    for (let i = 0; i < 9; i++) {
      const currentLordIdx = (startLordIdx + i) % 9;
      const subSpan = (nakSpan * VIMSHOTTARI_LORDS[currentLordIdx].years) / 120.0;
      accumulatedSpan += subSpan;
      if (posInNak <= accumulatedSpan) {
        subLord = VIMSHOTTARI_LORDS[currentLordIdx].lord;
        break;
      }
    }

    return {
      nakshatra: nak.name,
      nakshatraLord: nak.lord,
      nakshatraPada: pada,
      subLord,
    };
  }

  /**
   * Calculates Ascendant (Lagna) in degrees
   */
  public static calculateAscendant(
    astroTime: Astronomy.AstroTime,
    latitude: number,
    longitude: number,
    ayanamsha: number,
  ): AscendantDetail {
    const T = astroTime.ut / 36525.0;
    const eps = 23.4392911 - 0.0130042 * T; // True Obliquity of Ecliptic
    const epsRad = (eps * Math.PI) / 180.0;

    const gmstHours = Astronomy.SiderealTime(astroTime);
    const gmstDeg = gmstHours * 15.0;
    let ramc = (gmstDeg + longitude) % 360.0;
    if (ramc < 0) ramc += 360.0;
    const ramcRad = (ramc * Math.PI) / 180.0;
    const latRad = (latitude * Math.PI) / 180.0;

    // Tropical Ascendant formula
    const y = Math.cos(ramcRad);
    const x = -Math.sin(ramcRad) * Math.cos(epsRad) - Math.tan(latRad) * Math.sin(epsRad);
    let ascTropical = (Math.atan2(y, x) * 180.0) / Math.PI;
    if (ascTropical < 0) ascTropical += 360.0;

    const ascSidereal = this.toSidereal(ascTropical, ayanamsha);
    const signIndex = Math.floor(ascSidereal / 30.0) % 12;
    const degreeInSign = Number((ascSidereal % 30.0).toFixed(2));
    const sign = ZODIAC_SIGNS[signIndex];
    const nakDetail = this.getNakshatraDetail(ascSidereal);

    return {
      sign: sign.name,
      signLord: sign.lord,
      degree: degreeInSign,
      globalDegree: Number(ascSidereal.toFixed(2)),
      nakshatra: nakDetail.nakshatra,
      nakshatraLord: nakDetail.nakshatraLord,
      nakshatraPada: nakDetail.nakshatraPada,
      house: 1,
    };
  }

  /**
   * Calculates 12 Houses (Bhavas)
   */
  public static calculateHouses(
    ascendantGlobalDegree: number,
    ascendantSignIndex: number,
  ): HouseDetail[] {
    const houses: HouseDetail[] = [];

    for (let h = 1; h <= 12; h++) {
      const houseCuspGlobal = (ascendantGlobalDegree + (h - 1) * 30.0) % 360.0;
      const houseSignIndex = (ascendantSignIndex + (h - 1)) % 12;
      const sign = ZODIAC_SIGNS[houseSignIndex];
      const nakDetail = this.getNakshatraDetail(houseCuspGlobal);
      const degreeInSign = Number((houseCuspGlobal % 30.0).toFixed(2));

      houses.push({
        house: h,
        sign: sign.name,
        signLord: sign.lord,
        degree: degreeInSign,
        nakshatra: nakDetail.nakshatra,
        nakshatraLord: nakDetail.nakshatraLord,
        subLord: nakDetail.subLord,
      });
    }

    return houses;
  }

  /**
   * Calculates 9 Vedic Planets (Grahas + Rahu/Ketu)
   */
  public static calculatePlanets(
    astroTime: Astronomy.AstroTime,
    ayanamsha: number,
    ascendantSignIndex: number,
  ): { planets: PlanetDetail[]; moonSidereal: number } {
    const bodies = [
      { name: 'Sun', code: 'Su', body: Astronomy.Body.Sun },
      { name: 'Moon', code: 'Mo', body: Astronomy.Body.Moon },
      { name: 'Mars', code: 'Ma', body: Astronomy.Body.Mars },
      { name: 'Mercury', code: 'Me', body: Astronomy.Body.Mercury },
      { name: 'Jupiter', code: 'Ju', body: Astronomy.Body.Jupiter },
      { name: 'Venus', code: 'Ve', body: Astronomy.Body.Venus },
      { name: 'Saturn', code: 'Sa', body: Astronomy.Body.Saturn },
    ];

    const planets: PlanetDetail[] = [];
    let moonSidereal = 0;

    for (const b of bodies) {
      const geoVec = Astronomy.GeoVector(b.body, astroTime, true);
      const ecliptic = Astronomy.Ecliptic(geoVec);
      const tropicalLon = ecliptic.elon;
      const siderealLon = this.toSidereal(tropicalLon, ayanamsha);

      if (b.name === 'Moon') {
        moonSidereal = siderealLon;
      }

      // Check Retrograde motion
      let isRetrograde = false;
      if (b.name !== 'Sun' && b.name !== 'Moon') {
        const timeFuture = astroTime.AddDays(0.02);
        const geoVecFuture = Astronomy.GeoVector(b.body, timeFuture, true);
        const eclipticFuture = Astronomy.Ecliptic(geoVecFuture);
        let diff = eclipticFuture.elon - tropicalLon;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;
        isRetrograde = diff < 0;
      }

      const signIndex = Math.floor(siderealLon / 30.0) % 12;
      const degreeInSign = Number((siderealLon % 30.0).toFixed(2));
      const sign = ZODIAC_SIGNS[signIndex];
      const nakDetail = this.getNakshatraDetail(siderealLon);
      const house = ((signIndex - ascendantSignIndex + 12) % 12) + 1;

      planets.push({
        name: b.name,
        code: b.code,
        sign: sign.name,
        degree: degreeInSign,
        globalDegree: Number(siderealLon.toFixed(2)),
        house,
        isRetrograde,
        nakshatra: nakDetail.nakshatra,
        nakshatraLord: nakDetail.nakshatraLord,
        nakshatraPada: nakDetail.nakshatraPada,
      });
    }

    // Rahu (North Node) & Ketu (South Node)
    const rahuTropical = this.calculateRahuTropical(astroTime);
    const rahuSidereal = this.toSidereal(rahuTropical, ayanamsha);
    const ketuSidereal = (rahuSidereal + 180.0) % 360.0;

    // Rahu
    const rahuSignIndex = Math.floor(rahuSidereal / 30.0) % 12;
    const rahuDegreeInSign = Number((rahuSidereal % 30.0).toFixed(2));
    const rahuSign = ZODIAC_SIGNS[rahuSignIndex];
    const rahuNak = this.getNakshatraDetail(rahuSidereal);
    const rahuHouse = ((rahuSignIndex - ascendantSignIndex + 12) % 12) + 1;

    planets.push({
      name: 'Rahu',
      code: 'Ra',
      sign: rahuSign.name,
      degree: rahuDegreeInSign,
      globalDegree: Number(rahuSidereal.toFixed(2)),
      house: rahuHouse,
      isRetrograde: true,
      nakshatra: rahuNak.nakshatra,
      nakshatraLord: rahuNak.nakshatraLord,
      nakshatraPada: rahuNak.nakshatraPada,
    });

    // Ketu
    const ketuSignIndex = Math.floor(ketuSidereal / 30.0) % 12;
    const ketuDegreeInSign = Number((ketuSidereal % 30.0).toFixed(2));
    const ketuSign = ZODIAC_SIGNS[ketuSignIndex];
    const ketuNak = this.getNakshatraDetail(ketuSidereal);
    const ketuHouse = ((ketuSignIndex - ascendantSignIndex + 12) % 12) + 1;

    planets.push({
      name: 'Ketu',
      code: 'Ke',
      sign: ketuSign.name,
      degree: ketuDegreeInSign,
      globalDegree: Number(ketuSidereal.toFixed(2)),
      house: ketuHouse,
      isRetrograde: true,
      nakshatra: ketuNak.nakshatra,
      nakshatraLord: ketuNak.nakshatraLord,
      nakshatraPada: ketuNak.nakshatraPada,
    });

    return { planets, moonSidereal };
  }

  /**
   * Calculates Vimshottari Mahadashas & Current Antardashas
   */
  public static calculateVimshottariDasha(
    moonSidereal: number,
    birthDate: Date,
  ): DashasInfo {
    const nakSpan = 360.0 / 27.0; // 13.3333333333°
    const nakIndex = Math.min(26, Math.max(0, Math.floor(moonSidereal / nakSpan)));
    const posInNak = moonSidereal - nakIndex * nakSpan;
    const fractionRemaining = (nakSpan - posInNak) / nakSpan;

    const startLordIdx = nakIndex % 9;
    const birthLord = VIMSHOTTARI_LORDS[startLordIdx];
    const balanceYears = birthLord.years * fractionRemaining;

    const mahadashas: { planet: string; start: string; end: string }[] = [];
    let currentStartDate = new Date(birthDate.getTime());

    let activeMahadasha:
      | {
          lord: string;
          start: string;
          end: string;
          planetIndex: number;
          startDate: Date;
          endDate: Date;
        }
      | undefined;

    const now = new Date();

    for (let i = 0; i < 9; i++) {
      const idx = (startLordIdx + i) % 9;
      const lordObj = VIMSHOTTARI_LORDS[idx];
      const durationYears = i === 0 ? balanceYears : lordObj.years;

      const durationMs = durationYears * 365.25 * 24 * 60 * 60 * 1000;
      const endDate = new Date(currentStartDate.getTime() + durationMs);

      const startIso = currentStartDate.toISOString().split('T')[0];
      const endIso = endDate.toISOString().split('T')[0];

      mahadashas.push({
        planet: lordObj.lord,
        start: startIso,
        end: endIso,
      });

      if (now >= currentStartDate && now < endDate && !activeMahadasha) {
        activeMahadasha = {
          lord: lordObj.lord,
          start: startIso,
          end: endIso,
          planetIndex: idx,
          startDate: new Date(currentStartDate.getTime()),
          endDate: new Date(endDate.getTime()),
        };
      }

      currentStartDate = new Date(endDate.getTime());
    }

    // If for any reason now is beyond 120 years, pick the last or first
    if (!activeMahadasha && mahadashas.length > 0) {
      activeMahadasha = {
        lord: mahadashas[0].planet,
        start: mahadashas[0].start,
        end: mahadashas[0].end,
        planetIndex: startLordIdx,
        startDate: new Date(birthDate.getTime()),
        endDate: new Date(birthDate.getTime() + balanceYears * 365.25 * 24 * 60 * 60 * 1000),
      };
    }

    // Calculate Antardashas for the Active Mahadasha
    const antardashas: { planet: string; start: string; end: string }[] = [];
    if (activeMahadasha) {
      const mdLordObj = VIMSHOTTARI_LORDS[activeMahadasha.planetIndex];
      let adStartDate = new Date(activeMahadasha.startDate.getTime());

      for (let j = 0; j < 9; j++) {
        const adIdx = (activeMahadasha.planetIndex + j) % 9;
        const adLordObj = VIMSHOTTARI_LORDS[adIdx];

        // Antardasha duration proportion = (MD_years * AD_years) / 120
        const adYears = (mdLordObj.years * adLordObj.years) / 120.0;
        const adDurationMs = adYears * 365.25 * 24 * 60 * 60 * 1000;
        const adEndDate = new Date(adStartDate.getTime() + adDurationMs);

        antardashas.push({
          planet: adLordObj.lord,
          start: adStartDate.toISOString().split('T')[0],
          end: adEndDate.toISOString().split('T')[0],
        });

        adStartDate = new Date(adEndDate.getTime());
      }
    }

    return {
      currentMahadasha: activeMahadasha
        ? {
            lord: activeMahadasha.lord,
            start: activeMahadasha.start,
            end: activeMahadasha.end,
          }
        : undefined,
      mahadashas,
      antardashas,
    };
  }

  /**
   * Generates Complete Vedic Astrology Chart
   */
  public static calculateChart(details: BirthDetails): AstrologyChartResponse {
    const [yearStr, monthStr, dayStr] = details.dateOfBirth.split('-');
    const [hourStr, minuteStr] = details.timeOfBirth.split(':');

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const hours = parseInt(hourStr, 10) || 0;
    const minutes = parseInt(minuteStr, 10) || 0;

    // Convert Local Birth Time to UTC Date
    const localMs = Date.UTC(year, month - 1, day, hours, minutes, 0);
    const tzOffsetMs = Number(details.timezone) * 60 * 60 * 1000;
    const utcDate = new Date(localMs - tzOffsetMs);

    const astroTime = Astronomy.MakeTime(utcDate);
    const ayanamsha = this.calculateLahiriAyanamsha(astroTime);

    // 1. Ascendant
    const ascendant = this.calculateAscendant(
      astroTime,
      details.latitude,
      details.longitude,
      ayanamsha,
    );

    const ascSignIndex = ZODIAC_SIGNS.findIndex(
      (z) => z.name.toLowerCase() === ascendant.sign.toLowerCase(),
    );

    // 2. 12 Houses
    const houses = this.calculateHouses(
      ascendant.globalDegree || 0,
      ascSignIndex >= 0 ? ascSignIndex : 0,
    );

    // 3. Planets
    const { planets, moonSidereal } = this.calculatePlanets(
      astroTime,
      ayanamsha,
      ascSignIndex >= 0 ? ascSignIndex : 0,
    );

    // 4. Dashas
    const localBirthDate = new Date(year, month - 1, day, hours, minutes, 0);
    const dashas = this.calculateVimshottariDasha(moonSidereal, localBirthDate);

    return {
      birthDetails: details,
      ascendant,
      planets,
      houses,
      dashas,
    };
  }
}
