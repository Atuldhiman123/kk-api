export interface BirthDetails {
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: number;
}

export interface AscendantDetail {
  sign: string;
  signLord?: string;
  degree: number;
  globalDegree?: number;
  nakshatra: string;
  nakshatraLord?: string;
  nakshatraPada?: number;
  house?: number;
}

export interface PlanetDetail {
  name: string;
  code?: string;
  sign: string;
  degree: number;
  globalDegree?: number;
  house?: number;
  isRetrograde: boolean;
  nakshatra?: string;
  nakshatraLord?: string;
  nakshatraPada?: number;
}

export interface HouseDetail {
  house: number;
  sign: string;
  degree: number;
  signLord?: string;
  nakshatra?: string;
  nakshatraLord?: string;
  subLord?: string;
}

export interface DashaPeriod {
  planet: string;
  start: string;
  end: string;
}

export interface DashasInfo {
  currentMahadasha?: {
    lord?: string;
    start?: string;
    end?: string;
  };
  mahadashas: DashaPeriod[];
  antardashas?: DashaPeriod[];
}

export interface AstrologyChartResponse {
  birthDetails: BirthDetails;
  ascendant: AscendantDetail;
  planets: PlanetDetail[];
  houses: HouseDetail[];
  dashas: DashasInfo;
}
