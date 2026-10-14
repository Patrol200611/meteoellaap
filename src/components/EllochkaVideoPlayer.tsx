import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  Film, 
  Maximize2,
  Minimize2,
  RotateCcw,
  CloudRain,
  Sun,
  Snowflake,
  Zap,
  Wind,
  Layers,
  Eye,
  Sliders
} from 'lucide-react';
import { EllochkaWordEntry, VideoClipEntry, WeatherConditionType } from '../types/weather';

interface EllochkaVideoPlayerProps {
  currentEntry: EllochkaWordEntry;
  activeVideoClip?: VideoClipEntry | null;
  weatherCondition: WeatherConditionType;
  temperature: number;
  cityName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenDictionary?: () => void;
  onOpenVideoLibrary?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const EllochkaVideoPlayer: React.FC<EllochkaVideoPlayerProps> = ({
  currentEntry,
  activeVideoClip,
  weatherCondition,
  temperature,
  cityName,
  isExpanded,
  onToggleExpand,
  onOpenDictionary,
  onOpenVideoLibrary,
  soundEnabled: externalSoundEnabled,
  onToggleSound: externalToggleSound,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [internalSoundEnabled, setInternalSoundEnabled] = useState<boolean>(true);
  
  // Use external sound state if provided by App, otherwise internal
  const soundEnabled = externalSoundEnabled !== undefined ? externalSoundEnabled : internalSoundEnabled;
  const toggleSound = () => {
    if (externalToggleSound) {
      externalToggleSound();
    } else {
      setInternalSoundEnabled(prev => !prev);
    }
  };

  const [activeActionOverride, setActiveActionOverride] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(10);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [filmGrainActive, setFilmGrainActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Guarantee a real MP4 video URL based on condition
  const getDefaultVideoForCondition = (cond: WeatherConditionType): string => {
    switch (cond) {
      case 'rain':
      case 'drizzle':
        return '/videos/ellochka_rain_mrak.mp4';
      case 'clear':
        return '/videos/ellochka_sun_krasota.mp4';
      case 'storm':
        return '/videos/ellochka_storm_zhut.mp4';
      case 'snow':
        return '/videos/ellochka_snow_metel.mp4';
      case 'wind':
        return '/videos/ellochka_shik.mp4';
      default:
        return '/videos/ellochka_sun_krasota.mp4';
    }
  };

  const activeVideoUrl = activeVideoClip?.videoUrl || currentEntry.videoUrl || getDefaultVideoForCondition(weatherCondition);

  // Key scenes for instant jumping
  const SCENES = [
    { label: '🌧️ Дождь («Мрак»)', video: '/videos/ellochka_rain_mrak.mp4', word: 'Мрак!', phrase: 'Мрак. Капли заливают шанхайского барса...' },
    { label: '☀️ Солнце («Красота»)', video: '/videos/ellochka_sun_krasota.mp4', word: 'Кр-р-расота!', phrase: 'Красота! Зонтик закрыт, солнце сияет!' },
    { label: '🚖 Таксо («Поедем на таксо»)', video: '/videos/ellochka_taxi.mp4', word: 'Поедем на таксо!', phrase: 'Поедем на таксо! В таких туфельках по лужам не ходят!' },
    { label: '⚡ Гроза («Жуть»)', video: '/videos/ellochka_storm_zhut.mp4', word: 'Жуть!', phrase: 'Жуть! Небо чернеет, гром гремит!' },
    { label: '❄️ Снег («Спина белая»)', video: '/videos/ellochka_snow_metel.mp4', word: 'У вас вся спина белая!', phrase: 'Хи-хи, снегу навалило, спасает мексиканский тушкан!' },
    { label: '✨ Шик и Блеск', video: '/videos/ellochka_shik.mp4', word: 'Шик!', phrase: 'Шик! Такой воздух бывает только в лучших столицах!' },
  ];

  // Update video element when sound state changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !soundEnabled;
      if (soundEnabled) {
        videoRef.current.volume = 1.0;
      }
    }
  }, [soundEnabled]);

  // Update video when URL or condition changes
  useEffect(() => {
    setActiveActionOverride(null);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    if (soundEnabled && currentEntry.word) {
      speakPhrase(currentEntry.word, currentEntry.dialogue);
    }
  }, [activeVideoUrl, currentEntry.id, weatherCondition]);

  // Speech synthesis for Russian voice
  const speakPhrase = (phrase: string, fullText?: string) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const textToSpeak = phrase + (fullText ? `. ${fullText}` : '');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'ru-RU';
      utterance.rate = 1.05;
      utterance.pitch = 1.25;

      const voices = window.speechSynthesis.getVoices();
      const ruVoice = voices.find(v => v.lang.includes('ru') && (v.name.includes('Milena') || v.name.includes('Elena') || v.name.includes('Female') || v.name.includes('Google русский')));
      if (ruVoice) utterance.voice = ruVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
    }
  };

  const handleManualSpeech = () => {
    speakPhrase(currentEntry.word, currentEntry.dialogue);
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Switch Scene / Video
  const handleSelectScene = (scene: typeof SCENES[0]) => {
    if (videoRef.current) {
      videoRef.current.src = scene.video;
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    setActiveActionOverride(scene.phrase);
    if (soundEnabled) {
      speakPhrase(scene.word, scene.phrase);
    }
  };

  // Scrubber change
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-[#16121d] border-2 border-[#d4af37] rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isExpanded ? 'p-4 sm:p-6 w-full' : 'p-3 sm:p-5 w-full'
      }`}
    >
      {/* Decorative Art Deco Gilded Corners */}
      <div className="absolute top-2.5 left-2.5 w-7 h-7 border-t-2 border-l-2 border-[#d4af37] pointer-events-none z-30" />
      <div className="absolute top-2.5 right-2.5 w-7 h-7 border-t-2 border-r-2 border-[#d4af37] pointer-events-none z-30" />
      <div className="absolute bottom-2.5 left-2.5 w-7 h-7 border-b-2 border-l-2 border-[#d4af37] pointer-events-none z-30" />
      <div className="absolute bottom-2.5 right-2.5 w-7 h-7 border-b-2 border-r-2 border-[#d4af37] pointer-events-none z-30" />

      {/* TOP BAR OF CINEMA */}
      <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4af37] to-[#aa771c] flex items-center justify-center text-black font-black text-xs shadow-md">
            1927
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-deco text-sm sm:text-base font-bold tracking-wider gold-gradient-text uppercase">
                Синематографъ Эллочки
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-950/80 border border-red-500/50 text-red-200 font-semibold hidden sm:inline">
                ● Кинофильм
              </span>
            </div>
            <p className="text-[11px] text-[#b8a99a] font-vintage">
              «30 слов и поединок с Вандербильдихой» • {cityName} ({temperature > 0 ? `+${temperature}` : temperature}°C)
            </p>
          </div>
        </div>

        {/* CONTROLS BAR: SOUND BUTTON IS PROMINENT */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* PROMINENT SOUND TOGGLE BUTTON (ВКЛ / ВЫКЛ ЗВУКА) */}
          <button
            onClick={toggleSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shadow-md cursor-pointer ${
              soundEnabled
                ? 'bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-black border-[#fce881] ring-2 ring-[#d4af37]/50'
                : 'bg-[#291724] border-red-500/60 text-red-200 hover:bg-[#3d1e34]'
            }`}
            title={soundEnabled ? 'Звук включен (нажмите, чтобы выключить)' : 'Звук выключен (нажмите, чтобы включить)'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-black animate-pulse" />
                <span className="text-xs uppercase tracking-wider">Звук: ВКЛ</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-red-400" />
                <span className="text-xs uppercase tracking-wider text-red-300">Звук: ВЫКЛ</span>
              </>
            )}
          </button>

          {/* Video Library Trigger */}
          <button
            onClick={onOpenVideoLibrary}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#2e203b] hover:bg-[#432e56] border border-[#d4af37]/60 text-[#fce881] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Открыть библиотеку видеоклипов"
          >
            <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="hidden sm:inline">Видеотека</span>
          </button>

          {/* Retro Film Grain Toggle */}
          <button
            onClick={() => setFilmGrainActive(!filmGrainActive)}
            className={`p-2 rounded-xl text-xs font-medium transition-all border ${
              filmGrainActive
                ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#fce881]'
                : 'bg-black/40 border-white/10 text-stone-400'
            }`}
            title="Ретро-эффект немого кино"
          >
            <Film className="w-4 h-4" />
          </button>

          {/* Expand / Collapse Button */}
          <button
            onClick={onToggleExpand}
            className={`p-2 rounded-xl text-xs font-medium transition-all border flex items-center gap-1 ${
              isExpanded
                ? 'bg-[#d4af37] text-black font-bold border-[#d4af37] shadow-lg'
                : 'bg-[#291f36] hover:bg-[#3d2d52] border-[#d4af37]/40 text-[#fce881]'
            }`}
            title={isExpanded ? 'Свернуть в стандартный размер' : 'Расширить видео'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden md:inline text-[11px]">
              {isExpanded ? 'Свернуть' : 'Расширить'}
            </span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-xs font-medium bg-black/40 hover:bg-black/70 border border-white/10 text-stone-400 hover:text-white transition-colors"
            title="Во весь экран"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN VIDEO PLAYER CONTAINER (ALWAYS PLAYS REAL MP4 VIDEO) */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-black border-2 border-[#544431] shadow-2xl transition-all duration-300 group flex items-center justify-center ${
          isExpanded ? 'aspect-[16/9] sm:aspect-[21/9] max-h-[640px]' : 'aspect-[16/10]'
        }`}
      >
        {/* Subtle retro silent movie frame vignette */}
        <div className="absolute inset-0 pointer-events-none film-vignette z-20" />
        {filmGrainActive && (
          <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay z-20 animate-film-flicker bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        )}

        {/* REAL HTML5 VIDEO ELEMENT */}
        <video
          ref={videoRef}
          key={activeVideoUrl}
          src={activeVideoUrl}
          autoPlay
          loop
          muted={!soundEnabled}
          playsInline
          className="w-full h-full object-cover filter contrast-110 brightness-95"
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
              setDuration(videoRef.current.duration || 10);
            }
          }}
          onLoadedData={() => setVideoLoaded(true)}
        />

        {/* FLOATING UNMUTE OVERLAY BUTTON WHEN MUTED */}
        {!soundEnabled && (
          <button
            onClick={toggleSound}
            className="absolute top-4 right-4 z-30 px-3.5 py-2 rounded-full bg-black/80 hover:bg-black border border-red-400/80 text-red-200 text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md transition-all hover:scale-105 cursor-pointer animate-bounce"
          >
            <VolumeX className="w-4 h-4 text-red-400" />
            <span>Звук выключен • Нажмите, чтобы включить 🔊</span>
          </button>
        )}

        {/* Big Center Play/Pause Overlay Indicator on Hover */}
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="w-14 h-14 rounded-full bg-black/70 border-2 border-[#d4af37] flex items-center justify-center text-[#fce881] shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5 fill-[#fce881]" />}
          </div>
        </div>

        {/* Vintage Silent Film Intertitle Subtitle Overlay */}
        <div className="absolute bottom-12 left-4 right-4 z-30 flex flex-col items-center pointer-events-auto">
          <div className="w-full max-w-xl bg-black/85 backdrop-blur-md border border-[#d4af37]/60 rounded-2xl p-2.5 sm:p-3 text-center shadow-2xl relative">
            <button
              onClick={handleManualSpeech}
              className="group inline-flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
              title="Нажмите, чтобы Эллочка произнесла фразу вслух"
            >
              <span className="font-deco text-xl sm:text-2xl font-black tracking-widest gold-gradient-text drop-shadow">
                «{currentEntry.word}»
              </span>
              <Volume2 className="w-5 h-5 text-[#d4af37] group-hover:text-[#fce881] animate-pulse" />
            </button>

            <p className="text-xs sm:text-sm text-[#f5ebd7] font-vintage italic mt-1 line-clamp-2">
              {activeActionOverride || currentEntry.dialogue}
            </p>
          </div>
        </div>

        {/* BOTTOM VIDEO SCRUBBER & PLAYBACK CONTROLS BAR */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-6 flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          
          {/* Progress Slider */}
          <input
            type="range"
            min={0}
            max={duration || 10}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
          />

          <div className="flex items-center justify-between text-xs text-stone-300">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="hover:text-[#fce881] transition-colors flex items-center gap-1 font-semibold"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Пауза' : 'Пуск'}</span>
              </button>

              <button
                onClick={toggleSound}
                className="hover:text-[#fce881] transition-colors flex items-center gap-1 font-semibold text-[11px]"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Звук ВКЛ</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-red-300">Звук ВЫКЛ</span>
                  </>
                )}
              </button>

              <span className="font-mono text-[11px] text-stone-400">
                {`00:${String(Math.floor(currentTime)).padStart(2, '0')} / 00:${String(Math.floor(duration)).padStart(2, '0')}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-400 font-vintage hidden sm:inline">
                Скорость:
              </span>
              {[0.75, 1, 1.25].map((spd) => (
                <button
                  key={spd}
                  onClick={() => {
                    setPlaybackSpeed(spd);
                    if (videoRef.current) videoRef.current.playbackRate = spd;
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-[#d4af37] text-black font-bold'
                      : 'bg-black/50 text-stone-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* QUICK SCENE SELECTOR (CLICK TO SWITCH REAL VIDEOS!) */}
      <div className="mt-3 bg-[#120f18] border border-[#d4af37]/30 rounded-2xl p-2.5 sm:p-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-vintage text-[#c4b5a2] flex items-center gap-1.5 font-bold">
            <Film className="w-3.5 h-3.5 text-[#d4af37]" />
            Сцены немого кино (нажмите для включения настоящего видео):
          </span>
          <button
            onClick={toggleSound}
            className="text-[11px] text-[#fce881] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
            {soundEnabled ? 'Звук активен' : 'Включить звук'}
          </button>
        </div>

        {/* Scene Buttons Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SCENES.map((scene, idx) => {
            const isSelected = activeVideoUrl === scene.video;
            return (
              <button
                key={idx}
                onClick={() => handleSelectScene(scene)}
                className={`p-2 rounded-xl text-xs text-left transition-all border flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#31213f] border-[#d4af37] text-white shadow-lg ring-1 ring-[#d4af37]'
                    : 'bg-[#18131f] text-stone-300 border-white/5 hover:border-[#d4af37]/50 hover:bg-[#231a2c]'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">{scene.label}</div>
                <div className="text-[10px] text-[#d4af37] font-vintage truncate mt-0.5">«{scene.word}»</div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
