import React, { useState, useRef } from 'react';
import { 
  X, 
  Film, 
  Plus, 
  Upload, 
  Play, 
  Pause, 
  Check, 
  Trash2, 
  Sparkles, 
  Video, 
  Camera, 
  Clock, 
  RefreshCw,
  ExternalLink,
  Layers,
  CloudRain,
  Sun,
  Snowflake,
  Zap,
  Wind
} from 'lucide-react';
import { VideoClipEntry, WeatherConditionType } from '../types/weather';

interface VideoLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoLibrary: VideoClipEntry[];
  currentVideoId?: string;
  onSelectVideo: (video: VideoClipEntry) => void;
  onAddVideo: (video: VideoClipEntry) => void;
  onDeleteVideo: (id: string) => void;
  onLinkToWeather: (condition: WeatherConditionType, video: VideoClipEntry) => void;
}

export const VideoLibraryModal: React.FC<VideoLibraryModalProps> = ({
  isOpen,
  onClose,
  videoLibrary,
  currentVideoId,
  onSelectVideo,
  onAddVideo,
  onDeleteVideo,
  onLinkToWeather,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'record'>('library');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Upload Form state
  const [title, setTitle] = useState('');
  const [word, setWord] = useState('Мрак!');
  const [phrase, setPhrase] = useState('');
  const [condition, setCondition] = useState<WeatherConditionType>('rain');
  const [characterAction, setCharacterAction] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Webcam record state
  const [recording, setRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  if (!isOpen) return null;

  const filteredVideos = videoLibrary.filter(v => {
    if (filterCondition === 'all') return true;
    if (filterCondition === 'custom') return v.isCustom;
    return v.condition === filterCondition;
  });

  // Handle local file selection and convert to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 45 * 1024 * 1024) {
      setUploadError('Файл слишком велик (максимум 45 МБ)');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit new video
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setUploading(true);
    setUploadError(null);

    try {
      if (fileBase64) {
        // Upload file to server
        const res = await fetch('/api/videos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            word: word.trim(),
            phrase: phrase.trim(),
            condition: condition,
            conditionLabel: condition,
            characterAction: characterAction.trim() || 'Видеоролик Эллочки',
            base64Data: fileBase64,
            filename: selectedFile?.name || 'video.mp4',
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
        onAddVideo(data.video);
        onSelectVideo(data.video);
      } else if (videoUrl.trim()) {
        // Add by URL link
        const newClip: VideoClipEntry = {
          id: `clip-${Date.now()}`,
          title: title.trim(),
          word: word.trim(),
          phrase: phrase.trim(),
          condition: condition,
          conditionLabel: condition,
          description: phrase.trim() || title.trim() || 'Пользовательское видео Эллочки',
          characterAction: characterAction.trim() || 'Видеоролик Эллочки',
          videoUrl: videoUrl.trim(),
          isCustom: true,
          uploadedAt: new Date().toISOString(),
          styleTags: ['1920s', 'Пользовательское'],
        };
        onAddVideo(newClip);
        onSelectVideo(newClip);
      } else {
        throw new Error('Выберите файл или укажите ссылку на видео');
      }

      // Reset
      setTitle('');
      setPhrase('');
      setCharacterAction('');
      setVideoUrl('');
      setSelectedFile(null);
      setFileBase64(null);
      setActiveTab('library');
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Ошибка загрузки видео');
    } finally {
      setUploading(false);
    }
  };

  // Webcam 1920s recording
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setUploadError('Не удалось получить доступ к веб-камере');
    }
  };

  const startRecording = () => {
    if (!mediaStream) return;
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
    
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);

      const reader = new FileReader();
      reader.onload = (e) => {
        setFileBase64(e.target?.result as string);
      };
      reader.readAsDataURL(blob);
    };

    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#16121d] border-2 border-[#d4af37] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#d4af37]/30 flex items-center justify-between bg-gradient-to-r from-[#211a2d] via-[#1a1424] to-[#211a2d]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#d4af37]/20 border border-[#d4af37] rounded-xl text-[#fce881]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-deco text-base sm:text-xl font-bold gold-gradient-text uppercase tracking-wide">
                Библиотека видеореакций Эллочки (1920-е)
              </h2>
              <p className="text-xs text-[#c2b4a5] font-vintage">
                Кинематографические сцены с зонтиком, дождем («Мрак») и солнцем («Красота») + загрузка своих клипов
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (mediaStream) {
                mediaStream.getTracks().forEach(t => t.stop());
              }
              onClose();
            }}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-black/70 text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#d4af37]/20 px-4 bg-[#120f18] text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('library')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'library'
                ? 'border-[#d4af37] text-[#fce881] font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Все видео ({videoLibrary.length})
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-[#d4af37] text-[#fce881] font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Plus className="w-4 h-4 text-[#d4af37]" />
            Загрузить видео / Добавить ссылку
          </button>

          <button
            onClick={() => {
              setActiveTab('record');
              startCamera();
            }}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'record'
                ? 'border-[#d4af37] text-[#fce881] font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Camera className="w-4 h-4 text-[#d4af37]" />
            Снять видео в стиле 1920-х (веб-камера)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          
          {/* TAB 1: BROWSE VIDEO LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              
              {/* Category Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] text-stone-400 font-vintage shrink-0 mr-1">Погода:</span>
                {[
                  { id: 'all', label: '🎬 Все видео' },
                  { id: 'rain', label: '🌧️ Дождь («Мрак»)' },
                  { id: 'clear', label: '☀️ Солнце («Красота»)' },
                  { id: 'storm', label: '⚡ Гроза («Жуть»)' },
                  { id: 'snow', label: '❄️ Снег' },
                  { id: 'wind', label: '💨 Ветер' },
                  { id: 'heat', label: '🔥 Жара' },
                  { id: 'custom', label: '⭐ Мои видео' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setFilterCondition(filter.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all border ${
                      filterCondition === filter.id
                        ? 'bg-[#d4af37] text-black font-bold border-[#d4af37] shadow-sm'
                        : 'bg-[#120f18] text-stone-300 border-white/5 hover:border-[#d4af37]/40'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Grid of Video Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((video) => {
                  const isCurrent = video.id === currentVideoId;
                  const isRain = video.condition === 'rain';
                  const isClear = video.condition === 'clear';

                  return (
                    <div
                      key={video.id}
                      className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative group ${
                        isCurrent
                          ? 'bg-[#291f37] border-[#d4af37] shadow-xl ring-2 ring-[#d4af37]'
                          : 'bg-[#120f18] border-white/10 hover:border-[#d4af37]/60'
                      }`}
                    >
                      {/* Video Visual Screen / Preview Box */}
                      <div className="relative aspect-video w-full bg-[#0a080f] overflow-hidden border-b border-white/5 flex items-center justify-center">
                        
                        {/* Film vignette effect */}
                        <div className="absolute inset-0 film-vignette pointer-events-none z-10" />

                        {video.videoUrl ? (
                          <video
                            src={video.videoUrl}
                            muted
                            loop
                            autoPlay={previewingId === video.id}
                            playsInline
                            className="w-full h-full object-cover filter sepia-[0.3] contrast-110"
                          />
                        ) : (
                          /* Stylized scene placeholder with animated aesthetics */
                          <div className={`w-full h-full flex flex-col items-center justify-center p-4 relative ${
                            isRain 
                              ? 'bg-gradient-to-b from-[#191e2b] via-[#121620] to-[#0a0d14]' 
                              : isClear
                              ? 'bg-gradient-to-b from-[#2e2618] via-[#1c1810] to-[#0e0c08]'
                              : 'bg-gradient-to-b from-[#26182e] via-[#16101c] to-[#0d0912]'
                          }`}>
                            {/* Decorative background rays or rain */}
                            {isRain ? (
                              <div className="flex flex-col items-center gap-1.5 text-center">
                                <div className="w-12 h-12 rounded-full bg-blue-950/80 border border-blue-400/50 flex items-center justify-center text-blue-300 shadow-md">
                                  <CloudRain className="w-6 h-6 animate-bounce" />
                                </div>
                                <span className="font-deco text-sm font-bold text-blue-200">
                                  Черный шелковый зонтик
                                </span>
                                <span className="text-[10px] text-stone-400 font-vintage">
                                  Сцена: Дождь на брусчатке • «Мрак»
                                </span>
                              </div>
                            ) : isClear ? (
                              <div className="flex flex-col items-center gap-1.5 text-center">
                                <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-md">
                                  <Sun className="w-6 h-6 animate-spin" style={{ animationDuration: '12s' }} />
                                </div>
                                <span className="font-deco text-sm font-bold text-amber-200">
                                  Солнечный день 1920-х
                                </span>
                                <span className="text-[10px] text-stone-400 font-vintage">
                                  Сцена: Закрытый зонтик • «Красота»
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5 text-center">
                                <div className="w-12 h-12 rounded-full bg-purple-950/80 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-md">
                                  <Film className="w-6 h-6" />
                                </div>
                                <span className="font-deco text-sm font-bold text-purple-200">
                                  «{video.word}»
                                </span>
                                <span className="text-[10px] text-stone-400 font-vintage">
                                  {video.conditionLabel}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Top Badges on preview */}
                        <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/75 border border-white/10 text-[#fce881] font-mono">
                            {video.startTime !== undefined ? `00:${String(video.startTime).padStart(2, '0')}` : '00:00'}
                          </span>
                          {video.isCustom && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-900/80 text-blue-200 border border-blue-400/40">
                              Авторское
                            </span>
                          )}
                        </div>

                        {/* Play Indicator / Big Action Overlay */}
                        <button
                          onClick={() => {
                            onSelectVideo(video);
                            onClose();
                          }}
                          className="absolute inset-0 bg-black/40 hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center cursor-pointer"
                        >
                          <div className="px-3.5 py-2 rounded-xl bg-[#d4af37] text-black font-bold text-xs flex items-center gap-1.5 shadow-xl transform scale-95 group-hover:scale-100 transition-transform">
                            <Play className="w-4 h-4 fill-black" />
                            Воспроизвести на экране
                          </div>
                        </button>
                      </div>

                      {/* Card Content & Details */}
                      <div className="p-3.5 flex flex-col justify-between flex-1">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-deco text-sm font-bold text-[#fce881] line-clamp-1">
                              {video.title}
                            </h3>
                            <span className="font-bold text-xs text-[#d4af37] shrink-0">
                              «{video.word}»
                            </span>
                          </div>

                          <p className="text-xs text-stone-300 font-vintage mt-1 line-clamp-2">
                            {video.description}
                          </p>

                          <div className="mt-2 text-[11px] text-[#baa896] bg-black/30 p-1.5 rounded border border-white/5 line-clamp-1">
                            🎭 {video.characterAction}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                          <button
                            onClick={() => onLinkToWeather(video.condition, video)}
                            className="text-[11px] text-stone-400 hover:text-[#fce881] transition-colors flex items-center gap-1"
                            title="Автоматически включать при этой погоде"
                          >
                            🔗 Авто-реакция
                          </button>

                          <div className="flex items-center gap-1">
                            {video.isCustom && (
                              <button
                                onClick={() => onDeleteVideo(video.id)}
                                className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                                title="Удалить видео"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                onSelectVideo(video);
                                onClose();
                              }}
                              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#d4af37]/20 hover:bg-[#d4af37] text-[#fce881] hover:text-black border border-[#d4af37]/50'
                              }`}
                            >
                              {isCurrent ? <Check className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                              {isCurrent ? 'На экране' : 'Выбрать'}
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: UPLOAD VIDEO FILE OR LINK */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                
                {/* Upload Zone */}
                <div className="border-2 border-dashed border-[#d4af37]/50 hover:border-[#d4af37] rounded-2xl p-6 text-center bg-[#120f18] transition-all relative">
                  <Upload className="w-8 h-8 text-[#d4af37] mx-auto mb-2" />
                  <div className="font-bold text-sm text-[#fce881]">
                    {selectedFile ? selectedFile.name : 'Перетащите видеофайл сюда или нажмите для выбора'}
                  </div>
                  <p className="text-xs text-stone-400 font-vintage mt-1">
                    Поддерживаются MP4, WebM (до 45 МБ). Видео сохранится на сервере и синхронизируется на всех устройствах.
                  </p>
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                <div className="text-center text-xs text-stone-500 font-vintage">— ИЛИ УКАЖИТЕ ССЫЛКУ —</div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Прямая ссылка на видео (MP4 / WebM / GIF)
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://example.com/ellochka_video.mp4"
                    className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3.5 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Название сцены <span className="text-[#d4af37]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Например: Дождь и зонтик на старой улочке"
                      className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3.5 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Слово-восклицание Эллочки <span className="text-[#d4af37]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={word}
                      onChange={(e) => setWord(e.target.value)}
                      placeholder="Например: Мрак! или Красота!"
                      className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3.5 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Погода для видео
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as WeatherConditionType)}
                      className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="rain">🌧️ Дождь («Мрак»)</option>
                      <option value="clear">☀️ Солнце («Красота»)</option>
                      <option value="snow">❄️ Снег («Спина белая»)</option>
                      <option value="storm">⚡ Гроза («Жуть»)</option>
                      <option value="heat">🔥 Жара («Хо-хо»)</option>
                      <option value="wind">💨 Ветер («Колоссально»)</option>
                      <option value="clouds">☁️ Пасмурно</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Действие персонажа
                    </label>
                    <input
                      type="text"
                      value={characterAction}
                      onChange={(e) => setCharacterAction(e.target.value)}
                      placeholder="Например: Открывает зонтик, морщится на холодный дождь"
                      className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3.5 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-300 bg-rose-950/50 p-2.5 rounded-xl border border-rose-500/40">
                    {uploadError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="px-4 py-2 text-xs text-stone-400 hover:text-white"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#fce881] hover:to-[#d4af37] text-black font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Добавить в видеотеку
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* TAB 3: WEBCAM VINTAGE RECORDER */}
          {activeTab === 'record' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="text-center">
                <h3 className="font-deco text-base font-bold gold-gradient-text">
                  Съемка ролика в стиле синема 1920-х
                </h3>
                <p className="text-xs text-stone-400 font-vintage">
                  Запишите короткую реакцию: прищурьтесь под солнцем («Красота») или вздохните с зонтом («Мрак»)!
                </p>
              </div>

              {/* Video Camera Viewport with Sepia Filter & Vignette */}
              <div className="relative aspect-video w-full max-w-lg mx-auto rounded-2xl overflow-hidden bg-black border-2 border-[#d4af37] shadow-2xl flex items-center justify-center">
                <div className="absolute inset-0 film-vignette pointer-events-none z-10" />
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover filter sepia-[0.45] contrast-125"
                />
                {recording && (
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-rose-600/90 text-white px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" /> ЗАПИСЬ
                  </div>
                )}
              </div>

              {/* Camera Actions */}
              <div className="flex items-center justify-center gap-3">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
                  >
                    <span className="w-3 h-3 rounded-full bg-white" />
                    Начать запись (5-10 сек)
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-5 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
                  >
                    <span className="w-3 h-3 bg-white" />
                    Остановить и сохранить
                  </button>
                )}
              </div>

              {recordedVideoUrl && (
                <div className="bg-[#120f18] p-4 rounded-xl border border-[#d4af37]/40 space-y-3">
                  <div className="text-xs font-bold text-[#fce881]">
                    Запись завершена! Сохранить видео в библиотеку:
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Название (например: Мой зонтик под дождем)"
                    className="w-full bg-[#1a1424] border border-[#544431] rounded-xl px-3 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                  />
                  <button
                    onClick={handleUploadSubmit}
                    disabled={uploading || !title.trim()}
                    className="w-full py-2 bg-[#d4af37] text-black font-semibold text-xs rounded-xl shadow cursor-pointer"
                  >
                    Сохранить в видеотеку Эллочки
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[#d4af37]/30 bg-[#120f18] flex items-center justify-between text-xs text-stone-400">
          <span className="font-vintage">
            Видеоклипов в коллекции: <strong className="text-[#fce881]">{videoLibrary.length}</strong>
          </span>
          <button
            onClick={() => {
              if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
