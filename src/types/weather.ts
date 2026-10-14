export type WeatherConditionType = 
  | 'clear'        // Ясно, солнце
  | 'clouds'       // Облачно, пасмурно
  | 'rain'         // Дождь, ливень
  | 'drizzle'      // Морось
  | 'snow'         // Снег, метель, мороз
  | 'storm'        // Гроза, шторм
  | 'fog'          // Туман
  | 'wind'         // Сильный ветер
  | 'heat'         // Зной, жара
  | 'any';         // Универсальное

export interface CityData {
  id: string;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  condition: WeatherConditionType;
  conditionRu: string;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number; // mm Hg
  uvIndex: number;
  precipitation: number;
  isDay: boolean;
  time: string;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: WeatherConditionType;
  conditionRu: string;
  precipitationProbability: number;
  weatherCode: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  condition: WeatherConditionType;
  weatherCode: number;
}

export interface WeatherData {
  city: CityData;
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  updatedAt: string;
}

export interface EllochkaWordEntry {
  id: string;
  word: string;             // например: "Мрак!", "Красота!", "Жуть!"
  transcription?: string;    // фонетика / восклицание
  meaning: string;          // значение из книги «12 стульев»
  condition: WeatherConditionType;
  conditionLabel: string;   // "Дождь и ливень", "Солнце и тепло"
  action: string;           // "Раскрывает шелковый зонтик, морщит носик на капли"
  dialogue: string;         // Ироничная цитата или шутка
  videoType: 'umbrella_rain' | 'sun_tea_strainer' | 'shivering_furs' | 'taxi_storm' | 'chic_pose' | 'fan_flutter' | 'fog_look' | 'wind_boa' | 'custom';
  videoUrl?: string;        // Пользовательское видео или GIF/MP4 ссылка
  isCustom?: boolean;
  author?: string;
  createdAt?: string;
}

export interface VideoClipEntry {
  id: string;
  title: string;
  word: string;
  phrase: string;
  condition: WeatherConditionType;
  conditionLabel: string;
  videoUrl?: string;
  posterUrl?: string;
  startTime?: number; // seconds
  endTime?: number;   // seconds
  playbackRate?: number;
  duration?: number;
  description: string;
  characterAction: string;
  isCustom?: boolean;
  uploadedAt?: string;
  styleTags: string[];
}

export interface CloudSyncPayload {
  syncCode: string;
  updatedAt: string;
  customEntries: EllochkaWordEntry[];
  customVideos?: VideoClipEntry[];
  favoriteCities: CityData[];
  deviceNote?: string;
}

