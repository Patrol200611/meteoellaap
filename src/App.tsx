import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, 
  BookOpen, 
  Sparkles, 
  Share2, 
  Info, 
  MapPin, 
  HelpCircle,
  Film,
  RefreshCw,
  Layers,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { CityData, WeatherData, EllochkaWordEntry, VideoClipEntry, WeatherConditionType } from './types/weather';
import { INITIAL_ELLOCHKA_DICTIONARY, POPULAR_CITIES } from './data/ellochkaDictionary';
import { INITIAL_VIDEO_LIBRARY } from './data/videoLibrary';
import { EllochkaVideoPlayer } from './components/EllochkaVideoPlayer';
import { WeatherDisplay } from './components/WeatherDisplay';
import { DictionaryModal } from './components/DictionaryModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { VideoLibraryModal } from './components/VideoLibraryModal';
import { JokeGeneratorCard } from './components/JokeGeneratorCard';

export default function App() {
  // Cities & Weather state
  const [selectedCity, setSelectedCity] = useState<CityData>(POPULAR_CITIES[0]); // Moscow by default
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Vocabulary state
  const [dictionary, setDictionary] = useState<EllochkaWordEntry[]>(() => {
    try {
      const saved = localStorage.getItem('ellochka_custom_entries');
      if (saved) {
        const parsed: EllochkaWordEntry[] = JSON.parse(saved);
        return [...INITIAL_ELLOCHKA_DICTIONARY, ...parsed];
      }
    } catch (e) {
      console.warn('Failed to load local dictionary', e);
    }
    return INITIAL_ELLOCHKA_DICTIONARY;
  });

  // Video Library state
  const [videoLibrary, setVideoLibrary] = useState<VideoClipEntry[]>(() => {
    try {
      const saved = localStorage.getItem('ellochka_custom_videos');
      if (saved) {
        const parsed: VideoClipEntry[] = JSON.parse(saved);
        return [...INITIAL_VIDEO_LIBRARY, ...parsed];
      }
    } catch (e) {
      console.warn('Failed to load local video library', e);
    }
    return INITIAL_VIDEO_LIBRARY;
  });

  // Current active word & active video clip
  const [currentEntry, setCurrentEntry] = useState<EllochkaWordEntry>(INITIAL_ELLOCHKA_DICTIONARY[0]);
  const [activeVideoClip, setActiveVideoClip] = useState<VideoClipEntry | null>(INITIAL_VIDEO_LIBRARY[0]);

  // Expand video mode ("надо расширить видео") - enabled by default for cinematic impact
  const [isVideoExpanded, setIsVideoExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ellochka_video_expanded');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Sound state (persisted)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ellochka_sound_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('ellochka_sound_enabled', JSON.stringify(next));
  };

  // Cloud Sync state
  const [syncCode, setSyncCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('sync');
      if (urlCode) return urlCode.toUpperCase();
      const savedCode = localStorage.getItem('ellochka_sync_code');
      if (savedCode) return savedCode;
    } catch {}
    return 'ELLO-1927';
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Modals state
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [isVideoLibraryOpen, setIsVideoLibraryOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Pick suitable video clip based on weather condition
  const getVideoForCondition = useCallback((condition: WeatherConditionType): VideoClipEntry => {
    const matching = videoLibrary.filter(v => v.condition === condition);
    if (matching.length > 0) return matching[0];
    if (condition === 'rain' || condition === 'drizzle') {
      return videoLibrary.find(v => v.id.includes('rain')) || videoLibrary[0];
    }
    if (condition === 'clear') {
      return videoLibrary.find(v => v.id.includes('sun')) || videoLibrary[1];
    }
    if (condition === 'snow') {
      return videoLibrary.find(v => v.id.includes('snow')) || videoLibrary[6];
    }
    if (condition === 'storm') {
      return videoLibrary.find(v => v.id.includes('storm')) || videoLibrary[3];
    }
    return videoLibrary[0];
  }, [videoLibrary]);

  // Pick suitable Ellochka reaction based on weather condition
  const getReactionForCondition = useCallback((condition: WeatherConditionType, temp: number): EllochkaWordEntry => {
    const matches = dictionary.filter(e => e.condition === condition);
    if (matches.length > 0) {
      return matches[Math.floor(Math.random() * matches.length)];
    }

    if (condition === 'rain' || condition === 'drizzle') {
      return dictionary.find(e => e.word.includes('Мрак')) || dictionary[0];
    }
    if (condition === 'clear') {
      return dictionary.find(e => e.word.includes('Кр-р-расота')) || dictionary[1];
    }
    if (condition === 'snow') {
      return dictionary.find(e => e.word.includes('спина белая')) || dictionary[4];
    }
    if (condition === 'storm') {
      return dictionary.find(e => e.word.includes('Жуть')) || dictionary[2];
    }
    if (condition === 'wind') {
      return dictionary.find(e => e.word.includes('Колоссально')) || dictionary[9];
    }
    if (condition === 'heat' || temp >= 28) {
      return dictionary.find(e => e.word.includes('Хо-хо')) || dictionary[7];
    }
    return dictionary[0];
  }, [dictionary]);

  // Fetch weather for a given city
  const fetchWeather = useCallback(async (city: CityData) => {
    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const res = await fetch(
        `/api/weather?lat=${city.latitude}&lon=${city.longitude}&name=${encodeURIComponent(city.name)}&country=${encodeURIComponent(city.country)}`
      );
      if (!res.ok) throw new Error('Failed to load weather');
      const data: WeatherData = await res.json();
      setWeatherData(data);

      // Automatically update Ellochka's reaction and video to match current weather!
      const matchingReaction = getReactionForCondition(data.current.condition, data.current.temperature);
      const matchingVideo = getVideoForCondition(data.current.condition);

      setCurrentEntry(matchingReaction);
      setActiveVideoClip(matchingVideo);
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      setWeatherError('Не удалось загрузить прогноз погоды. Попробуйте обновить.');
    } finally {
      setLoadingWeather(false);
    }
  }, [getReactionForCondition, getVideoForCondition]);

  // Initial load
  useEffect(() => {
    fetchWeather(selectedCity);
  }, []);

  // Fetch server video library if available
  useEffect(() => {
    fetch('/api/videos/library')
      .then(res => res.json())
      .then((serverVideos: VideoClipEntry[]) => {
        if (Array.isArray(serverVideos) && serverVideos.length > 0) {
          setVideoLibrary(prev => {
            const combined = [...INITIAL_VIDEO_LIBRARY];
            serverVideos.forEach(sv => {
              if (!combined.some(c => c.id === sv.id)) {
                combined.unshift(sv);
              }
            });
            return combined;
          });
        }
      })
      .catch(err => console.warn('Could not load server video library:', err));
  }, []);

  // Handle URL sync parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSync = params.get('sync');
    if (urlSync) {
      const normalized = urlSync.toUpperCase();
      setSyncCode(normalized);
      fetch(`/api/sync/load/${encodeURIComponent(normalized)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            if (data.customEntries) {
              setDictionary([...INITIAL_ELLOCHKA_DICTIONARY, ...data.customEntries]);
            }
            if (data.customVideos) {
              setVideoLibrary([...INITIAL_VIDEO_LIBRARY, ...data.customVideos]);
            }
            setLastSyncedAt(data.updatedAt || new Date().toISOString());
          }
        })
        .catch(err => console.warn('Auto sync pull failed:', err));
    }
  }, []);

  // Handle adding new word or joke to dictionary
  const handleAddEntry = (entry: EllochkaWordEntry) => {
    const updated = [entry, ...dictionary];
    setDictionary(updated);

    const customEntries = updated.filter(e => e.isCustom);
    localStorage.setItem('ellochka_custom_entries', JSON.stringify(customEntries));

    // Auto-save to cloud
    if (syncCode) {
      fetch('/api/sync/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncCode,
          customEntries,
          customVideos: videoLibrary.filter(v => v.isCustom),
          favoriteCities: POPULAR_CITIES,
        }),
      })
        .then(res => res.json())
        .then(d => {
          if (d.success) setLastSyncedAt(d.updatedAt);
        })
        .catch(err => console.warn('Auto-save to cloud failed:', err));
    }
  };

  // Delete custom word entry
  const handleDeleteEntry = (id: string) => {
    const updated = dictionary.filter(e => e.id !== id);
    setDictionary(updated);
    const customEntries = updated.filter(e => e.isCustom);
    localStorage.setItem('ellochka_custom_entries', JSON.stringify(customEntries));
  };

  // Add custom video to library
  const handleAddVideo = (newVideo: VideoClipEntry) => {
    const updated = [newVideo, ...videoLibrary];
    setVideoLibrary(updated);
    const customVideos = updated.filter(v => v.isCustom);
    localStorage.setItem('ellochka_custom_videos', JSON.stringify(customVideos));

    // Auto-save to cloud
    if (syncCode) {
      fetch('/api/sync/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncCode,
          customEntries: dictionary.filter(e => e.isCustom),
          customVideos,
          favoriteCities: POPULAR_CITIES,
        }),
      })
        .then(res => res.json())
        .then(d => {
          if (d.success) setLastSyncedAt(d.updatedAt);
        })
        .catch(err => console.warn('Auto-save to cloud failed:', err));
    }
  };

  // Delete video from library
  const handleDeleteVideo = (id: string) => {
    const updated = videoLibrary.filter(v => v.id !== id);
    setVideoLibrary(updated);
    const customVideos = updated.filter(v => v.isCustom);
    localStorage.setItem('ellochka_custom_videos', JSON.stringify(customVideos));

    fetch(`/api/videos/library/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  };

  // Link video to weather condition
  const handleLinkVideoToWeather = (condition: WeatherConditionType, video: VideoClipEntry) => {
    setActiveVideoClip(video);
    // Find matching word
    const matchingWord = dictionary.find(w => w.condition === condition) || dictionary[0];
    setCurrentEntry({
      ...matchingWord,
      videoUrl: video.videoUrl,
    });
  };

  // Toggle video expand mode
  const handleToggleExpand = () => {
    const next = !isVideoExpanded;
    setIsVideoExpanded(next);
    localStorage.setItem('ellochka_video_expanded', JSON.stringify(next));
  };

  // Handle data loaded from cloud sync modal
  const handleSyncDataLoaded = (data: { customEntries: EllochkaWordEntry[]; favoriteCities: CityData[] }) => {
    setDictionary([...INITIAL_ELLOCHKA_DICTIONARY, ...data.customEntries]);
    localStorage.setItem('ellochka_custom_entries', JSON.stringify(data.customEntries));
    setLastSyncedAt(new Date().toISOString());
  };

  return (
    <div className="min-h-screen bg-[#100d14] text-[#f5ebd7] flex flex-col font-sans-clean selection:bg-[#d4af37] selection:text-black">
      
      {/* VINTAGE ART DECO TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#16121c]/90 backdrop-blur-md border-b-2 border-[#d4af37]/60 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          
          {/* Logo & Literary Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fce881] via-[#d4af37] to-[#8c6219] flex items-center justify-center text-black font-black text-lg shadow-md border border-[#fce881]">
              12
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-deco text-base sm:text-xl font-black tracking-wider gold-gradient-text uppercase drop-shadow-sm">
                  Прогноз погоды от Эллочки
                </h1>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#fce881] font-semibold">
                  30 слов
                </span>
              </div>
              <p className="text-[11px] text-[#bdae9c] font-vintage hidden sm:block">
                «Двенадцать стульев» • Синематограф 1927 г. • Видеотека реакций
              </p>
            </div>
          </div>

          {/* Navigation & Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sound ON/OFF Button */}
            <button
              onClick={handleToggleSound}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shadow-md cursor-pointer ${
                soundEnabled
                  ? 'bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-black border-[#fce881] ring-2 ring-[#d4af37]/40'
                  : 'bg-[#2b1723] border-red-500/60 text-red-200 hover:bg-[#3d1e34]'
              }`}
              title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-black animate-pulse" />
                  <span className="hidden sm:inline">Звук: ВКЛ</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-red-400" />
                  <span className="hidden sm:inline text-red-300">Звук: ВЫКЛ</span>
                </>
              )}
            </button>

            {/* Expand / Theater Mode Header Toggle */}
            <button
              onClick={handleToggleExpand}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-sm ${
                isVideoExpanded
                  ? 'bg-[#d4af37] text-black border-[#d4af37]'
                  : 'bg-[#231b2e] hover:bg-[#342744] border-[#d4af37]/40 text-[#fce881]'
              }`}
              title={isVideoExpanded ? 'Компактный режим' : 'Расширить видео на весь экран'}
            >
              {isVideoExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isVideoExpanded ? 'Театр (Вкл)' : 'Расширить видео'}</span>
            </button>

            {/* Video Library Button */}
            <button
              onClick={() => setIsVideoLibraryOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#2e203b] hover:bg-[#432e56] border border-[#d4af37]/60 text-[#fce881] font-semibold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Film className="w-4 h-4 text-[#d4af37]" />
              <span>Видеотека ({videoLibrary.length})</span>
            </button>

            {/* Cloud Sync Status Badge */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#231b2e] hover:bg-[#342744] border border-[#d4af37]/50 text-xs text-[#fce881] transition-all flex items-center gap-1.5 shadow-sm group"
              title="Открыть облачную синхронизацию"
            >
              <Cloud className="w-4 h-4 text-[#d4af37] group-hover:scale-110 transition-transform" />
              <span className="hidden lg:inline font-mono font-bold">{syncCode}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline text-[11px] text-stone-300">Облако</span>
            </button>

            {/* Dictionary Library Button */}
            <button
              onClick={() => setIsDictionaryOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#fce881] hover:to-[#d4af37] text-black font-semibold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Словарь</span>
            </button>

            {/* Info About Modal */}
            <button
              onClick={() => setIsAboutOpen(true)}
              className="p-2 rounded-xl bg-[#231b2e] hover:bg-[#342744] border border-white/10 text-stone-300 hover:text-white transition-colors"
              title="О проекте"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* MAIN VIEWPORT LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-6">
        
        {/* IF VIDEO IS EXPANDED (THEATER WIDESCREEN MODE): FULL-WIDTH HERO VIDEO */}
        {isVideoExpanded ? (
          <div className="space-y-6">
            {/* Expanded Cinema Screen */}
            <div className="w-full">
              <EllochkaVideoPlayer
                currentEntry={currentEntry}
                activeVideoClip={activeVideoClip}
                weatherCondition={weatherData?.current?.condition || 'rain'}
                temperature={weatherData?.current?.temperature ?? 15}
                cityName={weatherData?.city?.name || selectedCity.name}
                isExpanded={true}
                onToggleExpand={handleToggleExpand}
                onOpenDictionary={() => setIsDictionaryOpen(true)}
                onOpenVideoLibrary={() => setIsVideoLibraryOpen(true)}
                soundEnabled={soundEnabled}
                onToggleSound={handleToggleSound}
              />
            </div>

            {/* Weather Dashboard and Joke Generator Below the Expanded Video */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 space-y-5">
                <WeatherDisplay
                  weather={weatherData}
                  loading={loadingWeather}
                  onSelectCity={(city) => {
                    setSelectedCity(city);
                    fetchWeather(city);
                  }}
                  onRefresh={() => fetchWeather(selectedCity)}
                />
              </div>

              <div className="lg:col-span-4 space-y-5">
                {/* Interactive Joke Generator for Current Weather */}
                {weatherData && (
                  <JokeGeneratorCard
                    currentCondition={weatherData.current.condition}
                    cityName={weatherData.city.name}
                    temperature={weatherData.current.temperature}
                    conditionRu={weatherData.current.conditionRu}
                    onAddAndSelectJoke={(newJoke) => {
                      handleAddEntry(newJoke);
                      setCurrentEntry(newJoke);
                    }}
                  />
                )}

                {/* Quick Video Library Preview Strip */}
                <div className="bg-[#1a1622] border border-[#d4af37]/40 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5 mb-3">
                    <h3 className="font-deco text-sm font-bold gold-gradient-text uppercase flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-[#d4af37]" />
                      Коллекция сцен (1920-е)
                    </h3>
                    <button
                      onClick={() => setIsVideoLibraryOpen(true)}
                      className="text-xs text-[#fce881] hover:underline font-vintage"
                    >
                      Все {videoLibrary.length} &rarr;
                    </button>
                  </div>

                  <div className="space-y-2">
                    {videoLibrary.slice(0, 4).map((clip) => {
                      const isSelected = activeVideoClip?.id === clip.id;
                      return (
                        <button
                          key={clip.id}
                          onClick={() => {
                            setActiveVideoClip(clip);
                            const matching = dictionary.find(d => d.condition === clip.condition) || dictionary[0];
                            setCurrentEntry({
                              ...matching,
                              word: clip.word,
                              dialogue: clip.phrase || matching.dialogue,
                            });
                          }}
                          className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between group ${
                            isSelected
                              ? 'bg-[#2f213f] border-[#d4af37] text-white shadow-md'
                              : 'bg-[#120f18] border-white/5 hover:border-[#d4af37]/40 text-stone-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-base">{clip.condition === 'rain' ? '🌧️' : clip.condition === 'clear' ? '☀️' : '⚡'}</span>
                            <div className="truncate">
                              <div className="text-xs font-semibold truncate group-hover:text-[#fce881]">
                                {clip.title}
                              </div>
                              <div className="text-[10px] text-stone-400 font-vintage truncate">
                                «{clip.word}»
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#d4af37] font-mono shrink-0 ml-2">
                            00:{String(clip.startTime || 0).padStart(2, '0')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD SIDE-BY-SIDE VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* LEFT COLUMN: CINEMA VIDEO SCREEN */}
            <div className="lg:col-span-5 w-full sticky lg:top-20 z-10">
              <EllochkaVideoPlayer
                currentEntry={currentEntry}
                activeVideoClip={activeVideoClip}
                weatherCondition={weatherData?.current?.condition || 'rain'}
                temperature={weatherData?.current?.temperature ?? 15}
                cityName={weatherData?.city?.name || selectedCity.name}
                isExpanded={false}
                onToggleExpand={handleToggleExpand}
                onOpenDictionary={() => setIsDictionaryOpen(true)}
                onOpenVideoLibrary={() => setIsVideoLibraryOpen(true)}
                soundEnabled={soundEnabled}
                onToggleSound={handleToggleSound}
              />
            </div>

            {/* RIGHT COLUMN: WEATHER DASHBOARD & FORECASTS */}
            <div className="lg:col-span-7 w-full space-y-5">
              <WeatherDisplay
                weather={weatherData}
                loading={loadingWeather}
                onSelectCity={(city) => {
                  setSelectedCity(city);
                  fetchWeather(city);
                }}
                onRefresh={() => fetchWeather(selectedCity)}
              />

              {weatherData && (
                <JokeGeneratorCard
                  currentCondition={weatherData.current.condition}
                  cityName={weatherData.city.name}
                  temperature={weatherData.current.temperature}
                  conditionRu={weatherData.current.conditionRu}
                  onAddAndSelectJoke={(newJoke) => {
                    handleAddEntry(newJoke);
                    setCurrentEntry(newJoke);
                  }}
                />
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-[#d4af37]/30 bg-[#14101a] py-6 px-4 text-center text-xs text-[#a39382] font-vintage">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            «Словарь Шекспира — 12 000 слов, людоеда Мумбо-Юмбо — 300, а Эллочка Щукина легко обходилась тридцатью».
          </div>
          <div className="flex items-center gap-4 text-stone-400">
            <button onClick={() => setIsVideoLibraryOpen(true)} className="hover:text-[#fce881] transition-colors">
              Видеотека 1920-х
            </button>
            <button onClick={() => setIsDictionaryOpen(true)} className="hover:text-[#fce881] transition-colors">
              База 30 слов
            </button>
            <button onClick={() => setIsSyncModalOpen(true)} className="hover:text-[#fce881] transition-colors">
              Облачная синхронизация
            </button>
            <button onClick={() => setIsAboutOpen(true)} className="hover:text-[#fce881] transition-colors">
              О синема
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL 1: VIDEO LIBRARY (1920s STYLED VIDEO CLIPS & UPLOADS) */}
      <VideoLibraryModal
        isOpen={isVideoLibraryOpen}
        onClose={() => setIsVideoLibraryOpen(false)}
        videoLibrary={videoLibrary}
        currentVideoId={activeVideoClip?.id}
        onSelectVideo={(video) => {
          setActiveVideoClip(video);
          const matching = dictionary.find(d => d.condition === video.condition) || dictionary[0];
          setCurrentEntry({
            ...matching,
            word: video.word,
            dialogue: video.phrase || matching.dialogue,
            videoUrl: video.videoUrl,
          });
        }}
        onAddVideo={handleAddVideo}
        onDeleteVideo={handleDeleteVideo}
        onLinkToWeather={handleLinkVideoToWeather}
      />

      {/* MODAL 2: VOCABULARY & PHRASE BASE */}
      <DictionaryModal
        isOpen={isDictionaryOpen}
        onClose={() => setIsDictionaryOpen(false)}
        entries={dictionary}
        currentEntryId={currentEntry.id}
        onSelectEntry={(entry) => setCurrentEntry(entry)}
        onAddEntry={handleAddEntry}
        onDeleteEntry={handleDeleteEntry}
        currentCityName={weatherData?.city?.name || selectedCity.name}
        currentTemp={weatherData?.current?.temperature ?? 15}
      />

      {/* MODAL 3: CLOUD SYNCHRONIZATION */}
      <CloudSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncCode={syncCode}
        onChangeSyncCode={(newCode) => {
          setSyncCode(newCode);
          localStorage.setItem('ellochka_sync_code', newCode);
        }}
        customEntries={dictionary.filter(e => e.isCustom)}
        favoriteCities={POPULAR_CITIES}
        onSyncDataLoaded={handleSyncDataLoaded}
        lastSyncedAt={lastSyncedAt}
      />

      {/* MODAL 4: ABOUT & LITERARY HISTORY */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#17131d] border-2 border-[#d4af37] rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-3 mb-4">
              <h3 className="font-deco text-lg font-bold gold-gradient-text uppercase">
                Об Эллочке и синематографе
              </h3>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-stone-300 font-vintage leading-relaxed">
              <p>
                В романе <strong>«Двенадцать стульев»</strong> (1928 г.) Ильи Ильфа и Евгения Петрова персонаж <strong>Эллочка Щукина</strong> ведет ожесточенный бой с дочерью американского миллиардера Вандербильда.
              </p>
              <p>
                Её знаменитый словарный запас насчитывал ровно <strong>30 слов</strong> («Мрак!», «Жуть!», «Кр-р-расота!», «Знаменито!», «Хо-хо!», «Ого!», «Шик!», «Блеск!», «Не учите меня жить!», «Поедем на таксо!», «У вас вся спина белая!» и др.).
              </p>
              <p className="bg-[#120f18] p-3 rounded-xl border border-[#d4af37]/30 text-xs text-[#fce881]">
                🌧️ <strong>Видеореакции:</strong> В приложении встроен расширенный кинематографический плеер и библиотека видеоклипов 1920-х годов: дождь со складыванием шелкового зонтика («Мрак»), солнце («Красота»), прогулки в мехах шанхайского барса и полет на таксо!
              </p>
              <p>
                ☁️ <strong>Облачная синхронизация:</strong> Вы можете загружать собственные видеоклипы, синхронизировать библиотеку между компьютерами и смартфонами по персональному коду.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsAboutOpen(false)}
                className="px-4 py-2 bg-[#d4af37] text-black font-semibold text-xs rounded-xl hover:bg-[#fce881] transition-colors"
              >
                Понятно, хо-хо!
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
