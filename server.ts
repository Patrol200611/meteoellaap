import express, { Request, Response } from 'express';
import { GoogleGenAI, Type, GenerateVideosOperation } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';

const execPromise = util.promisify(exec);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Ensure data and videos folders exist
const DATA_DIR = path.resolve(process.cwd(), 'data');
const VIDEOS_DIR = path.join(DATA_DIR, 'videos');
const SYNC_FILE = path.join(DATA_DIR, 'cloud_sync.json');
const VIDEO_LIB_FILE = path.join(DATA_DIR, 'video_library.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

interface SyncDataMap {
  [code: string]: {
    syncCode: string;
    updatedAt: string;
    customEntries: any[];
    customVideos?: any[];
    favoriteCities: any[];
  };
}

function readSyncStore(): SyncDataMap {
  try {
    if (fs.existsSync(SYNC_FILE)) {
      const content = fs.readFileSync(SYNC_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading sync store:', err);
  }
  return {};
}

function writeSyncStore(data: SyncDataMap) {
  try {
    fs.writeFileSync(SYNC_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing sync store:', err);
  }
}

function readVideoLibraryStore(): any[] {
  try {
    if (fs.existsSync(VIDEO_LIB_FILE)) {
      const content = fs.readFileSync(VIDEO_LIB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading video library store:', err);
  }
  return [];
}

function writeVideoLibraryStore(items: any[]) {
  try {
    fs.writeFileSync(VIDEO_LIB_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing video library store:', err);
  }
}

// Initialize Gemini SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for WMO weather codes to condition
function mapWmoToCondition(code: number): { condition: string; conditionRu: string } {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return { condition: 'clear', conditionRu: 'Ясно' };
  if (code === 1) return { condition: 'clear', conditionRu: 'Преимущественно ясно' };
  if (code === 2) return { condition: 'clouds', conditionRu: 'Переменная облачность' };
  if (code === 3) return { condition: 'clouds', conditionRu: 'Пасмурно' };
  if (code === 45 || code === 48) return { condition: 'fog', conditionRu: 'Густой туман' };
  if (code >= 51 && code <= 57) return { condition: 'drizzle', conditionRu: 'Моросящий дождь' };
  if (code >= 61 && code <= 67) return { condition: 'rain', conditionRu: 'Дождь' };
  if (code >= 71 && code <= 77) return { condition: 'snow', conditionRu: 'Снегопад' };
  if (code >= 80 && code <= 82) return { condition: 'rain', conditionRu: 'Ливень' };
  if (code >= 85 && code <= 86) return { condition: 'snow', conditionRu: 'Снежный заряд' };
  if (code === 95) return { condition: 'storm', conditionRu: 'Гроза' };
  if (code >= 96 && code <= 99) return { condition: 'storm', conditionRu: 'Гроза с градом' };
  return { condition: 'clouds', conditionRu: 'Облачно' };
}

// 1. Weather forecast endpoint proxying Open-Meteo
app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : 55.7558;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : 37.6173;
    const cityName = (req.query.name as string) || 'Москва';
    const country = (req.query.country as string) || 'Россия';

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    const weatherRes = await fetch(url);
    if (!weatherRes.ok) {
      throw new Error(`Open-Meteo error: ${weatherRes.statusText}`);
    }

    const data = await weatherRes.json();
    const currentCode = data.current?.weather_code ?? 0;
    const mapped = mapWmoToCondition(currentCode);
    
    // Check extreme heat
    const temp = Math.round(data.current?.temperature_2m ?? 18);
    const windSpeed = Math.round(data.current?.wind_speed_10m ?? 5);
    
    let finalCondition = mapped.condition;
    if (temp >= 28 && finalCondition === 'clear') {
      finalCondition = 'heat';
    } else if (windSpeed >= 12 && (finalCondition === 'clouds' || finalCondition === 'clear')) {
      finalCondition = 'wind';
    }

    // Pressure in mmHg (hPa * 0.750062)
    const rawPressure = data.current?.surface_pressure ?? 1013;
    const pressureMmHg = Math.round(rawPressure * 0.750062);

    // Daily forecast (next 7 days)
    const dailyForecasts = (data.daily?.time || []).slice(0, 7).map((d: string, index: number) => {
      const dayCode = data.daily?.weather_code?.[index] ?? 0;
      const dayMapped = mapWmoToCondition(dayCode);
      return {
        date: d,
        tempMax: Math.round(data.daily?.temperature_2m_max?.[index] ?? 20),
        tempMin: Math.round(data.daily?.temperature_2m_min?.[index] ?? 10),
        condition: dayMapped.condition,
        conditionRu: dayMapped.conditionRu,
        precipitationProbability: data.daily?.precipitation_probability_max?.[index] ?? 0,
        weatherCode: dayCode,
      };
    });

    // Hourly forecast (next 24 hours)
    const currentHourIndex = Math.min(new Date().getHours(), 23);
    const hourlyTimes = (data.hourly?.time || []).slice(currentHourIndex, currentHourIndex + 24);
    const hourlyForecasts = hourlyTimes.map((hTime: string, i: number) => {
      const idx = currentHourIndex + i;
      const hCode = data.hourly?.weather_code?.[idx] ?? 0;
      const hMapped = mapWmoToCondition(hCode);
      return {
        time: hTime,
        temp: Math.round(data.hourly?.temperature_2m?.[idx] ?? temp),
        condition: hMapped.condition,
        weatherCode: hCode,
      };
    });

    res.json({
      city: {
        id: `${lat.toFixed(2)}_${lon.toFixed(2)}`,
        name: cityName,
        country: country,
        latitude: lat,
        longitude: lon,
      },
      current: {
        temperature: temp,
        feelsLike: Math.round(data.current?.apparent_temperature ?? temp),
        condition: finalCondition,
        conditionRu: mapped.conditionRu,
        weatherCode: currentCode,
        humidity: data.current?.relative_humidity_2m ?? 50,
        windSpeed: windSpeed,
        windDirection: data.current?.wind_direction_10m ?? 0,
        pressure: pressureMmHg,
        uvIndex: 4,
        precipitation: data.current?.precipitation ?? 0,
        isDay: data.current?.is_day === 1,
        time: data.current?.time ?? new Date().toISOString(),
      },
      daily: dailyForecasts,
      hourly: hourlyForecasts,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// 2. City Geocoding Search
app.get('/api/cities/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=ru&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      throw new Error(`Geocoding error: ${geoRes.statusText}`);
    }

    const geoData = await geoRes.json();
    const results = (geoData.results || []).map((item: any) => ({
      id: `${item.latitude.toFixed(2)}_${item.longitude.toFixed(2)}`,
      name: item.name,
      country: item.country || '',
      admin1: item.admin1 || '',
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone,
    }));

    res.json(results);
  } catch (error) {
    console.error('Geocoding search error:', error);
    res.status(500).json({ error: 'Failed to search cities' });
  }
});

// 3. Cloud Sync: Push (Save to cloud)
app.post('/api/sync/save', (req: Request, res: Response) => {
  try {
    const { syncCode, customEntries, customVideos, favoriteCities, deviceNote } = req.body;
    if (!syncCode || typeof syncCode !== 'string' || syncCode.trim().length < 3) {
      return res.status(400).json({ error: 'Код синхронизации должен содержать минимум 3 символа' });
    }

    const normalizedCode = syncCode.trim().toUpperCase();
    const store = readSyncStore();

    store[normalizedCode] = {
      syncCode: normalizedCode,
      updatedAt: new Date().toISOString(),
      customEntries: customEntries || [],
      customVideos: customVideos || [],
      favoriteCities: favoriteCities || [],
    };

    writeSyncStore(store);

    res.json({
      success: true,
      syncCode: normalizedCode,
      updatedAt: store[normalizedCode].updatedAt,
      message: `Данные успешно сохранены в облаке под кодом ${normalizedCode}`,
    });
  } catch (err) {
    console.error('Sync save error:', err);
    res.status(500).json({ error: 'Ошибка сохранения в облако' });
  }
});

// 4. Cloud Sync: Pull (Load from cloud)
app.get('/api/sync/load/:syncCode', (req: Request, res: Response) => {
  try {
    const syncCode = (req.params.syncCode || '').trim().toUpperCase();
    const store = readSyncStore();

    if (!store[syncCode]) {
      return res.status(404).json({
        error: `Библиотека с кодом «${syncCode}» не найдена. Проверьте правильность кода или сохраните библиотеку впервые.`,
      });
    }

    res.json({
      success: true,
      ...store[syncCode],
    });
  } catch (err) {
    console.error('Sync load error:', err);
    res.status(500).json({ error: 'Ошибка загрузки из облака' });
  }
});

// 4.1 Video Library: List
app.get('/api/videos/library', (_req: Request, res: Response) => {
  try {
    const videos = readVideoLibraryStore();
    res.json(videos);
  } catch (err) {
    console.error('Get video library error:', err);
    res.status(500).json({ error: 'Ошибка чтения библиотеки видео' });
  }
});

// 4.2 Video Library: Upload Video File (Base64)
app.post('/api/videos/upload', (req: Request, res: Response) => {
  try {
    const { title, word, phrase, condition, conditionLabel, characterAction, base64Data, filename, startTime, endTime } = req.body;

    if (!title || !base64Data) {
      return res.status(400).json({ error: 'Название и видеоданные обязательны' });
    }

    // Clean base64 header if present (e.g. data:video/mp4;base64,...)
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : 'video/mp4';
    const rawData = matches ? matches[2] : base64Data;
    const buffer = Buffer.from(rawData, 'base64');

    const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
    const videoId = `video-${Date.now()}`;
    const safeFilename = `${videoId}.${ext}`;
    const filePath = path.join(VIDEOS_DIR, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const videoUrl = `/api/videos/stream/${safeFilename}`;

    const newClip = {
      id: videoId,
      title: title || 'Пользовательское видео',
      word: word || 'Мрак!',
      phrase: phrase || '',
      condition: condition || 'rain',
      conditionLabel: conditionLabel || 'Погода',
      characterAction: characterAction || 'Эллочка на видео',
      videoUrl: videoUrl,
      startTime: startTime || 0,
      endTime: endTime || 20,
      isCustom: true,
      uploadedAt: new Date().toISOString(),
      styleTags: ['Пользовательское', '1920s'],
    };

    const currentLib = readVideoLibraryStore();
    currentLib.unshift(newClip);
    writeVideoLibraryStore(currentLib);

    res.json({ success: true, video: newClip });
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ error: 'Ошибка загрузки видео' });
  }
});

// 4.3 Video Library: Add Link / Preset Clip
app.post('/api/videos/library', (req: Request, res: Response) => {
  try {
    const clip = req.body;
    if (!clip || !clip.title) {
      return res.status(400).json({ error: 'Данные видео обязательны' });
    }

    const currentLib = readVideoLibraryStore();
    const newClip = {
      ...clip,
      id: clip.id || `clip-${Date.now()}`,
      isCustom: true,
      uploadedAt: new Date().toISOString(),
    };

    currentLib.unshift(newClip);
    writeVideoLibraryStore(currentLib);

    res.json({ success: true, video: newClip });
  } catch (err) {
    console.error('Add video clip error:', err);
    res.status(500).json({ error: 'Ошибка добавления видео' });
  }
});

// 4.4 Video Library: Delete Video Clip
app.delete('/api/videos/library/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const currentLib = readVideoLibraryStore();
    const clipIndex = currentLib.findIndex(item => item.id === id);

    if (clipIndex !== -1) {
      const clip = currentLib[clipIndex];
      // If it has local file, remove it
      if (clip.videoUrl && clip.videoUrl.startsWith('/api/videos/stream/')) {
        const fname = clip.videoUrl.replace('/api/videos/stream/', '');
        const p = path.join(VIDEOS_DIR, fname);
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      }
      currentLib.splice(clipIndex, 1);
      writeVideoLibraryStore(currentLib);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete video clip error:', err);
    res.status(500).json({ error: 'Ошибка удаления видео' });
  }
});

// 4.5 Video Streaming Endpoint with HTTP 206 Partial Content
app.get('/api/videos/stream/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  // Sanitize filename to prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(VIDEOS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Video not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(safeFilename).toLowerCase();
  const contentType = ext === '.webm' ? 'video/webm' : 'video/mp4';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// 5. Gemini API: Generate Ellochka Joke / Reaction for specific weather
app.post('/api/gemini/generate-joke', async (req: Request, res: Response) => {
  try {
    const { condition, cityName, temperature, conditionRu } = req.body;

    const weatherPrompt = `Город: ${cityName || 'Москва'}, Погода: ${conditionRu || 'Дождь'}, Температура: ${temperature ?? 15}°C.`;

    const systemInstruction = `Ты — знаменитая Эллочка Щукина («Эллочка-людоедка») из бессмертного романа Ильфа и Петрова «12 стульев».
Твой знаменитый словарный запас состоит ровно из 30 классических выражений:
«Хамите!», «Хо-хо!», «Знаменито!», «Мрак!», «Жуть!», «Парниша!», «Не учите меня жить!», «Как ребенка!», «Кр-р-расота!», «Толстый и красивый!», «Поедем на таксо!», «Поедем на извозчике!», «Подумаешь!», «У вас вся спина белая!», «Подайте мне...», «Ого!», «Железно!», «Блеск!», «Шик!», «Колоссально!», «Мякоть!», «Шанхайский барс!», «Мексиканский тушкан!», «Чайное ситечко!», «Убейся, Вандербильдиха!», «Поэма!», «Чудно!», «Мальчик!», «Ату его!», «Слабо?».

Твоя заклятая соперница — дочь американского миллиардера Вандербильда («Вандербильдиха»), которую ты стремишься превзойти в роскоши, мехах и стиле вопреки любой погоде.
Твой муж — инженер Эрнест Щукин, которому вечно достается.
Ты только что выглянула в окно или сверилась с барометром.
Сгенерируй короткую, невероятно смешную и аутентичную реакцию Эллочки на погоду.

Ответ должен быть строго в формате JSON со следующими полями:
- word: Главное слово-восклицание из её 30 слов (например: "Мрак!", "Кр-р-расота!", "Жуть!", "Хо-хо!", "Поедем на таксо!", "Шанхайский барс!", "Убейся, Вандербильдиха!")
- dialogue: 1-2 предложения реплики Эллочки от первого лица в её уникальной манере.
- action: Какое действие она совершает (например: "Открывает шелковый зонтик, стряхивая капли с крашеного кролика", "Крутит чайное ситечко на солнце", "Кутается в мексиканского тушкана", "Грозит тучам страусовым веером").
- dressingAdvice: Саркастичный совет от Эллочки, как одеться по погоде (упоминая фильдеперс, шанхайского барса, лаковые туфельки, болонью).
- videoType: один из вариантов ("umbrella_rain", "sun_tea_strainer", "shivering_furs", "taxi_storm", "chic_pose", "fan_flutter", "fog_look", "wind_boa")`;

    let generatedData = null;

    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Придумай реакцию Эллочки на погоду: ${weatherPrompt}`,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                dialogue: { type: Type.STRING },
                action: { type: Type.STRING },
                dressingAdvice: { type: Type.STRING },
                videoType: { type: Type.STRING },
              },
              required: ['word', 'dialogue', 'action', 'dressingAdvice', 'videoType'],
            },
          },
        });

        if (response.text) {
          generatedData = JSON.parse(response.text.trim());
        }
      } catch (geminiErr) {
        console.warn('Gemini generateContent error, falling back to scripted witty humor:', geminiErr);
      }
    }

    // High quality fallback if Gemini is not responding or key is missing
    if (!generatedData) {
      if (condition === 'rain' || condition === 'drizzle') {
        generatedData = {
          word: 'Мрак!',
          dialogue: `Мрак! В городе ${cityName} льет как из дырявого умывальника. Шанхайский барс полиняет до неприличия! Поедем на таксо!`,
          action: 'Открывает шелковый зонтик с воланами, брезгливо приподнимая подол платья над лужей',
          dressingAdvice: 'Надеть ботики на пуговицах и прикрыть мексиканского тушкана газетой «Гудок».',
          videoType: 'umbrella_rain',
        };
      } else if (condition === 'snow') {
        generatedData = {
          word: 'У вас вся спина белая!',
          dialogue: `У вас вся спина белая! В ${cityName} мороз трещит пуще стульев мастера Гамбса! Вандербильдиха в своей Флориде такого песца в жизни не видала!`,
          action: 'Зябко кутается в воротник из кролика, выкрашенного под барса, стучит зубами и хлопает муфтой',
          dressingAdvice: 'Достать из сундука мексиканского тушкана и не высовывать нос без теплого капора.',
          videoType: 'shivering_furs',
        };
      } else if (condition === 'clear') {
        generatedData = {
          word: 'Кр-р-расота!',
          dialogue: `Кр-р-расота! В ${cityName} солнце слепит прямо в чайное ситечко! Убейся, Вандербильдиха, такой шик доступен только в СССР!`,
          action: 'Гордо крутит на пальце медное ситечко, посылая ослепительные солнечные зайчики',
          dressingAdvice: 'Шелковое крепдешиновое платье, чулки в сеточку и пудры на два пальца!',
          videoType: 'sun_tea_strainer',
        };
      } else if (condition === 'storm') {
        generatedData = {
          word: 'Жуть!',
          dialogue: `Жуть! Небо над ${cityName} трещит по швам! Эрнестушка, неси валидол, молния целится прямо в мой парадный комод!`,
          action: 'Вскрикивает и прячет лицо в страусовые перья, испуганно прижимаясь к зеркалу',
          dressingAdvice: 'Сидеть дома под пледом, пить чай из ситечка и ни в коем случае не спорить с фининспектором.',
          videoType: 'taxi_storm',
        };
      } else {
        generatedData = {
          word: 'Знаменито!',
          dialogue: `Знаменито! Для города ${cityName} погода самый раз, парниша. Не учите меня жить, лучше подайте пудреницу!`,
          action: 'Поправляет прическу перед сумочкой и томно зевает',
          dressingAdvice: 'Костюм из шотландского трикотажа и уверенный взгляд светской львицы.',
          videoType: 'chic_pose',
        };
      }
    }

    res.json(generatedData);
  } catch (error) {
    console.error('Generate joke error:', error);
    res.status(500).json({ error: 'Ошибка генерации шутки' });
  }
});

// 6. Gemini Video Studio: Create real video clips via Gemini / Veo
app.post('/api/gemini/generate-video', async (req: Request, res: Response) => {
  try {
    const { prompt, weatherCondition, word, mode } = req.body;
    const cond = weatherCondition || 'rain';
    const characterWord = word || (cond === 'rain' ? 'Мрак!' : 'Красота!');

    // 1. If user explicitly requested Veo mode:
    if (mode === 'veo') {
      try {
        const enrichedPrompt = `Cinematic 1920s vintage silent movie scene of Ellochka from 12 Chairs. A glamorous flapper woman in diamond headband and fur boa on a European cobblestone street. ${prompt || 'Holding black umbrella under rain'}. Vintage silent film aesthetic, 35mm film grain, 1920s sepia and vintage monochrome lighting, cinematic 16:9.`;
        const operation = await ai.models.generateVideos({
          model: 'veo-3.1-lite-generate-preview',
          prompt: enrichedPrompt,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9',
          },
        });
        return res.json({ operationName: operation.name, mode: 'veo' });
      } catch (veoErr: any) {
        console.warn('Veo generation failed, switching to Gemini Instant Director:', veoErr);
      }
    }

    // 2. Gemini Instant Director mode (Uses gemini-3.8-flash for screenplay, then ffmpeg renders real MP4)
    let screenplay = {
      title: 'Сцена немого кино',
      word: characterWord,
      quote: 'Не учите меня жить!',
      intertitle: 'Эллочка на старинной брусчатке',
      badge: 'СИНЕМА 1927',
      bgColor: '0x15121b',
      audioType: 'rain',
    };

    if (process.env.GEMINI_API_KEY) {
      try {
        const promptText = `Напиши короткий сценарий видеоклипа немого кино 1920-х годов для персонажа Эллочки-людоедки из «12 стульев».
Погода: ${cond}. Пожелания зрителя: ${prompt || 'характерная сцена под погоду'}. Слово Эллочки: ${characterWord}.
Верни JSON со следующими полями:
- title: Название видео (например: «Мрак под дождем», «Солнечный шик»)
- word: Слово-восклицание из 30 слов Эллочки (например: «Мрак!», «Кр-р-расота!», «Жуть!», «Поедем на таксо!»)
- quote: Короткая яркая литературная реплика от первого лица (до 10-12 слов)
- intertitle: Описание действия на интертитре немого кино
- badge: Описание погоды для кинотитров
- bgColor: Шестнадцатеричный цвет фона (например 0x111622 для дождя, 0x261e0e для солнца, 0x1a0f24 для грозы, 0x121b28 для снега)
- audioType: один из вариантов: 'rain', 'sun', 'storm', 'snow', 'taxi'`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                word: { type: Type.STRING },
                quote: { type: Type.STRING },
                intertitle: { type: Type.STRING },
                badge: { type: Type.STRING },
                bgColor: { type: Type.STRING },
                audioType: { type: Type.STRING },
              },
              required: ['title', 'word', 'quote', 'intertitle', 'badge', 'bgColor', 'audioType'],
            },
          },
        });

        if (geminiRes.text) {
          screenplay = JSON.parse(geminiRes.text.trim());
        }
      } catch (err) {
        console.warn('Gemini screenplay error:', err);
      }
    }

    // Render the real MP4 video with ffmpeg!
    const videoId = `gemini-video-${Date.now()}`;
    const safeFilename = `${videoId}.mp4`;
    const outputPath = path.join(VIDEOS_DIR, safeFilename);

    const fontBold = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
    const fontSerif = '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf';

    const duration = 10;
    const bgCol = screenplay.bgColor || '0x15121b';
    let audioSrc = `anoisesrc=d=${duration}:c=pink:r=44100:a=0.1`;
    if (screenplay.audioType === 'sun') {
      audioSrc = `aevalsrc=sin(2*PI*523.25*t)*0.1+sin(2*PI*659.25*t)*0.08:d=${duration}:s=44100`;
    } else if (screenplay.audioType === 'storm') {
      audioSrc = `anoisesrc=d=${duration}:c=brown:r=44100:a=0.2`;
    } else if (screenplay.audioType === 'snow') {
      audioSrc = `anoisesrc=d=${duration}:c=pink:r=44100:a=0.08`;
    } else if (screenplay.audioType === 'taxi') {
      audioSrc = `aevalsrc=sin(2*PI*440*t)*0.1:d=${duration}:s=44100`;
    }

    const cleanWord = (screenplay.word || 'Мрак!').replace(/['"]/g, '');
    const cleanQuote = (screenplay.quote || 'Шанхайский барс!').replace(/['"]/g, '');
    const cleanIntertitle = (screenplay.intertitle || 'Сцена на брусчатке').replace(/['"]/g, '');
    const cleanBadge = (screenplay.badge || 'СИНЕМА ГОСКИНО').replace(/['"]/g, '');

    const vf = `drawbox=x=0:y=0:w=1280:h=720:color=${bgCol}:t=fill,drawbox=x=30:y=30:w=1220:h=660:color=0xd4af37@0.8:t=4,drawbox=x=40:y=40:w=1200:h=640:color=0xd4af37@0.3:t=1,drawbox=x=24:y=24:w=16:h=16:color=0xfce881:t=fill,drawbox=x=1240:y=24:w=16:h=16:color=0xfce881:t=fill,drawbox=x=24:y=680:w=16:h=16:color=0xfce881:t=fill,drawbox=x=1240:y=680:w=16:h=16:color=0xfce881:t=fill,drawtext=fontfile='${fontBold}':text='ГОСКИНО  ★  GEMINI AI СИНЕМА 1927  ★  «12 СТУЛЬЕВЪ»':fontcolor=0xd4af37:fontsize=22:x=(w-text_w)/2:y=65,drawtext=fontfile='${fontSerif}':text='${cleanBadge}':fontcolor=0xe8dac7:fontsize=20:x=(w-text_w)/2:y=105,drawbox=x=200:y=140:w=880:h=2:color=0xd4af37@0.6:t=fill,drawbox=x=160:y=170:w=960:h=380:color=0x0a070e@0.9:t=fill,drawbox=x=170:y=180:w=940:h=360:color=0xd4af37@0.4:t=2,drawtext=fontfile='${fontBold}':text='« ${cleanWord} »':fontcolor=0xfce881:fontsize=72:x=(w-text_w)/2:y=230,drawtext=fontfile='${fontSerif}':text='«${cleanQuote}»':fontcolor=0xffffff:fontsize=26:x=(w-text_w)/2:y=340,drawtext=fontfile='${fontSerif}':text='${cleanIntertitle}':fontcolor=0xd4af37:fontsize=22:x=(w-text_w)/2:y=420,drawbox=x=200:y=580:w=880:h=2:color=0xd4af37@0.6:t=fill,drawtext=fontfile='${fontSerif}':text='Создано через Gemini AI • Режиссура 1920-х':fontcolor=0xbaa896:fontsize=18:x=(w-text_w)/2:y=610,noise=alls=12:allf=t+u,curves=preset=vintage`;

    const cmd = `ffmpeg -y -f lavfi -i "color=c=${bgCol}:s=1280x720:d=${duration}:r=24" -f lavfi -i "${audioSrc}" -filter_complex "[0:v]${vf}[v]" -map "[v]" -map 1:a -c:v libx264 -pix_fmt yuv420p -preset ultrafast -c:a aac -b:a 96k "${outputPath}"`;

    await execPromise(cmd);

    const videoUrl = `/api/videos/stream/${safeFilename}`;

    const newClip = {
      id: videoId,
      title: screenplay.title || 'Видеоклип Gemini',
      word: cleanWord,
      phrase: cleanQuote,
      condition: cond,
      conditionLabel: cleanBadge,
      characterAction: cleanIntertitle,
      description: `Создано нейросетью Gemini: ${cleanQuote}`,
      videoUrl: videoUrl,
      isCustom: true,
      uploadedAt: new Date().toISOString(),
      styleTags: ['Gemini AI', '1920s', 'Синема'],
    };

    const currentLib = readVideoLibraryStore();
    currentLib.unshift(newClip);
    writeVideoLibraryStore(currentLib);

    res.json({
      success: true,
      mode: 'instant',
      video: newClip,
    });
  } catch (error: any) {
    console.error('Generate video error:', error);
    res.status(500).json({ error: error.message || 'Ошибка создания видео через Gemini' });
  }
});

// 7. Poll Veo video status
app.post('/api/gemini/video-status', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    res.json({ done: updated.done, error: updated.error });
  } catch (err: any) {
    console.error('Video status error:', err);
    res.status(500).json({ error: err.message || 'Ошибка проверки статуса видео' });
  }
});

// 8. Download completed Veo video
app.post('/api/gemini/video-download', async (req: Request, res: Response) => {
  try {
    const { operationName, title, word, phrase, condition } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      throw new Error('URI видео не найден в ответе операции');
    }
    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' },
    });
    if (!videoRes.ok) {
      throw new Error(`Ошибка загрузки видеофайла: ${videoRes.statusText}`);
    }
    const buffer = Buffer.from(await videoRes.arrayBuffer());
    const videoId = `veo-${Date.now()}`;
    const safeFilename = `${videoId}.mp4`;
    const filePath = path.join(VIDEOS_DIR, safeFilename);
    fs.writeFileSync(filePath, buffer);

    const videoUrl = `/api/videos/stream/${safeFilename}`;
    const newClip = {
      id: videoId,
      title: title || 'Кинофильм Google Veo',
      word: word || 'Красота!',
      phrase: phrase || '',
      condition: condition || 'clear',
      conditionLabel: condition || 'Погода',
      characterAction: 'Сгенерировано Google Veo 3.1',
      description: phrase || 'Видеоролик нейросети Google Veo',
      videoUrl: videoUrl,
      isCustom: true,
      uploadedAt: new Date().toISOString(),
      styleTags: ['Google Veo', 'Gemini AI', '1920s'],
    };

    const currentLib = readVideoLibraryStore();
    currentLib.unshift(newClip);
    writeVideoLibraryStore(currentLib);

    res.json({ success: true, video: newClip });
  } catch (err: any) {
    console.error('Video download error:', err);
    res.status(500).json({ error: err.message || 'Ошибка сохранения видео' });
  }
});

// Vite middleware mounting in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
