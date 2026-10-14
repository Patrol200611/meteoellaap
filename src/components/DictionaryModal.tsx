import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Sparkles, 
  Volume2, 
  Video, 
  Trash2, 
  Check, 
  BookOpen, 
  Film, 
  Wand2, 
  RefreshCw,
  Info
} from 'lucide-react';
import { EllochkaWordEntry, WeatherConditionType } from '../types/weather';

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: EllochkaWordEntry[];
  currentEntryId: string;
  onSelectEntry: (entry: EllochkaWordEntry) => void;
  onAddEntry: (entry: EllochkaWordEntry) => void;
  onDeleteEntry: (id: string) => void;
  currentCityName: string;
  currentTemp: number;
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({
  isOpen,
  onClose,
  entries,
  currentEntryId,
  onSelectEntry,
  onAddEntry,
  onDeleteEntry,
  currentCityName,
  currentTemp,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'add' | 'ai'>('browse');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form state for adding custom entry / video
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newCondition, setNewCondition] = useState<WeatherConditionType>('rain');
  const [newAction, setNewAction] = useState('');
  const [newDialogue, setNewDialogue] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoType, setNewVideoType] = useState<EllochkaWordEntry['videoType']>('umbrella_rain');

  // AI Generator state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState<any | null>(null);
  const [aiCondition, setAiCondition] = useState<WeatherConditionType>('rain');

  if (!isOpen) return null;

  // Filtered entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = 
      entry.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.dialogue.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCondition = 
      filterCondition === 'all' || 
      entry.condition === filterCondition || 
      entry.condition === 'any';

    return matchesSearch && matchesCondition;
  });

  const speak = (phrase: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(phrase);
      u.lang = 'ru-RU';
      u.pitch = 1.25;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('Speech error:', e);
    }
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    const conditionLabels: Record<string, string> = {
      rain: 'Дождь и ливень',
      clear: 'Ясно и тепло',
      snow: 'Снег и метель',
      storm: 'Гроза и буря',
      clouds: 'Пасмурно',
      wind: 'Ветрено',
      fog: 'Туман',
      heat: 'Знойная жара',
      any: 'Любая погода',
    };

    const newEntry: EllochkaWordEntry = {
      id: `custom-${Date.now()}`,
      word: newWord.trim(),
      meaning: newMeaning.trim() || 'Пользовательская шутка Эллочки под погоду',
      condition: newCondition,
      conditionLabel: conditionLabels[newCondition] || 'Погода',
      action: newAction.trim() || 'Принимает позу светской дамы и смотрит на небо',
      dialogue: newDialogue.trim() || `«${newWord.trim()}», — восклицает Эллочка Щукина.`,
      videoType: newVideoType,
      videoUrl: newVideoUrl.trim() || undefined,
      isCustom: true,
      author: 'Вы (пользователь)',
      createdAt: new Date().toISOString(),
    };

    onAddEntry(newEntry);
    onSelectEntry(newEntry);

    // Reset form
    setNewWord('');
    setNewMeaning('');
    setNewAction('');
    setNewDialogue('');
    setNewVideoUrl('');
    setActiveTab('browse');
  };

  const handleGenerateAiJoke = async () => {
    setAiGenerating(true);
    setAiGeneratedResult(null);

    const conditionMapRu: Record<string, string> = {
      rain: 'Дождь и слякоть',
      clear: 'Ясное палящее солнце',
      snow: 'Мороз и снегопад',
      storm: 'Гроза со шквалом',
      clouds: 'Серая унылая облачность',
      wind: 'Ураганный ветер',
      fog: 'Густой молочный туман',
      heat: 'Невыносимая жара выше 30 градусов',
      any: 'Странная переменчивая погода',
    };

    try {
      const res = await fetch('/api/gemini/generate-joke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: aiCondition,
          cityName: currentCityName,
          temperature: currentTemp,
          conditionRu: conditionMapRu[aiCondition] || 'Непогода',
        }),
      });

      if (!res.ok) throw new Error('AI generation failed');
      const data = await res.json();
      setAiGeneratedResult(data);
    } catch (err) {
      console.error('AI error:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAiResult = () => {
    if (!aiGeneratedResult) return;

    const conditionLabels: Record<string, string> = {
      rain: 'Дождь и ливень',
      clear: 'Ясно и тепло',
      snow: 'Снег и метель',
      storm: 'Гроза и буря',
      clouds: 'Пасмурно',
      wind: 'Ветрено',
      fog: 'Туман',
      heat: 'Знойная жара',
      any: 'Любая погода',
    };

    const newEntry: EllochkaWordEntry = {
      id: `ai-${Date.now()}`,
      word: aiGeneratedResult.word || 'Мрак!',
      meaning: `Совет Эллочки: ${aiGeneratedResult.dressingAdvice || 'Одеться роскошно назло Вандербильдихе'}`,
      condition: aiCondition,
      conditionLabel: conditionLabels[aiCondition] || 'Погода',
      action: aiGeneratedResult.action || 'Машет веером и щурится на небо',
      dialogue: aiGeneratedResult.dialogue || 'Поедем на таксо!',
      videoType: (aiGeneratedResult.videoType as any) || 'chic_pose',
      isCustom: true,
      author: 'Генератор Эллочки (ИИ)',
      createdAt: new Date().toISOString(),
    };

    onAddEntry(newEntry);
    onSelectEntry(newEntry);
    setActiveTab('browse');
    setAiGeneratedResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#17131d] border-2 border-[#d4af37] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#d4af37]/30 flex items-center justify-between bg-gradient-to-r from-[#211a2c] via-[#1a1424] to-[#211a2c]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#d4af37]" />
            <div>
              <h2 className="font-deco text-lg sm:text-xl font-bold gold-gradient-text uppercase">
                Словарная база запаса Эллочки
              </h2>
              <p className="text-xs text-[#c2b4a5] font-vintage">
                30 канонических слов из «12 стульев» + ваши авторские видеореакции и шутки
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-black/70 text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#d4af37]/20 px-4 bg-[#120f18] text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('browse')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'browse'
                ? 'border-[#d4af37] text-[#fce881] font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Библиотека ({entries.length})
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'border-[#d4af37] text-[#fce881] font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Plus className="w-4 h-4 text-[#d4af37]" />
            Добавить своё видео / шутку
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-[#d4af37] text-[#fce881] font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Wand2 className="w-4 h-4 text-[#d4af37]" />
            ИИ-генератор шуток Эллочки
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          
          {/* TAB 1: BROWSE DICTIONARY */}
          {activeTab === 'browse' && (
            <div className="space-y-4">
              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#d4af37] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по фразе или значению..."
                    className="w-full bg-[#120f18] border border-[#544431] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                {/* Filter by weather */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 text-xs">
                  <span className="text-[11px] text-stone-400 font-vintage shrink-0">Погода:</span>
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'rain', label: '🌧️ Дождь' },
                    { id: 'clear', label: '☀️ Солнце' },
                    { id: 'snow', label: '❄️ Снег' },
                    { id: 'storm', label: '⚡ Гроза' },
                    { id: 'heat', label: '🔥 Жара' },
                    { id: 'wind', label: '💨 Ветер' },
                    { id: 'clouds', label: '☁️ Тучи' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setFilterCondition(filter.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all border ${
                        filterCondition === filter.id
                          ? 'bg-[#d4af37] text-black font-semibold border-[#d4af37]'
                          : 'bg-[#120f18] text-stone-300 border-white/5 hover:border-white/20'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Dictionary Entries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredEntries.map((entry) => {
                  const isCurrent = entry.id === currentEntryId;
                  return (
                    <div
                      key={entry.id}
                      className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#291f36] border-[#d4af37] shadow-lg ring-1 ring-[#d4af37]'
                          : 'bg-[#120f18] border-white/10 hover:border-[#d4af37]/50'
                      }`}
                    >
                      <div>
                        {/* Word Title + Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-deco text-base sm:text-lg font-bold text-[#fce881]">
                              «{entry.word}»
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#d4af37] text-black font-bold">
                                На экране
                              </span>
                            )}
                            {entry.videoUrl && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-900/60 text-purple-200 border border-purple-500/30 flex items-center gap-1">
                                <Video className="w-2.5 h-2.5" /> Видео
                              </span>
                            )}
                            {entry.isCustom && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-900/60 text-blue-200 border border-blue-500/30">
                                Своё
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => speak(entry.word)}
                            className="p-1 rounded-md text-stone-400 hover:text-[#fce881] transition-colors"
                            title="Произнести"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Meaning from 12 chairs */}
                        <p className="text-xs text-stone-300 font-vintage mt-1.5 line-clamp-2">
                          {entry.meaning}
                        </p>

                        {/* Action description */}
                        <div className="mt-2 text-[11px] text-[#baa896] bg-black/40 px-2 py-1 rounded border border-white/5">
                          🎭 <span className="font-semibold text-stone-300">Действие:</span> {entry.action}
                        </div>

                        {/* Dialogue Quote */}
                        <div className="mt-1.5 text-xs text-[#eedec9] italic font-vintage">
                          «{entry.dialogue}»
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[10px] text-stone-500">
                          {entry.conditionLabel}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {entry.isCustom && (
                            <button
                              onClick={() => onDeleteEntry(entry.id)}
                              className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                              title="Удалить пользовательскую запись"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onSelectEntry(entry);
                              onClose();
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                              isCurrent
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#d4af37]/20 hover:bg-[#d4af37] text-[#fce881] hover:text-black border border-[#d4af37]/50'
                            }`}
                          >
                            {isCurrent ? <Check className="w-3.5 h-3.5" /> : null}
                            {isCurrent ? 'Показывается' : 'Вывести на экран'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ADD CUSTOM ENTRY OR VIDEO */}
          {activeTab === 'add' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-[#120f18] border border-[#d4af37]/30 rounded-xl p-4 text-xs text-stone-300 flex items-start gap-3">
                <Info className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#fce881] text-sm">Добавьте собственное видео или фразу Эллочки</div>
                  Вы можете добавить новое восклицание, прикрепить прямую ссылку на видео (MP4 / WebM / GIF) или выбрать готовый стиль театральной сценки! Все ваши добавления сохраняются и синхронизируются в облаке между вашими устройствами.
                </div>
              </div>

              <form onSubmit={handleAddNew} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Слово или восклицание Эллочки <span className="text-[#d4af37]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Например: Блеск!, Мрак!, Поедем на таксо!, Шикарно!"
                    className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3.5 py-2 text-sm text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Погодное условие <span className="text-[#d4af37]">*</span>
                    </label>
                    <select
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value as WeatherConditionType)}
                      className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="rain">🌧️ Дождь / Ливень</option>
                      <option value="clear">☀️ Солнце / Ясно</option>
                      <option value="snow">❄️ Снег / Мороз</option>
                      <option value="storm">⚡ Гроза / Буря</option>
                      <option value="heat">🔥 Знойная жара</option>
                      <option value="wind">💨 Сильный ветер</option>
                      <option value="clouds">☁️ Пасмурно / Облака</option>
                      <option value="fog">🌫️ Туман</option>
                      <option value="any">✨ Универсальное (любая погода)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Сценическая анимация Эллочки
                    </label>
                    <select
                      value={newVideoType}
                      onChange={(e) => setNewVideoType(e.target.value as any)}
                      className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="umbrella_rain">Зонтик от дождя (шелковый зонт)</option>
                      <option value="sun_tea_strainer">Чайное ситечко на солнце</option>
                      <option value="shivering_furs">Шанхайский барс / кролик в снегу</option>
                      <option value="taxi_storm">Ловит таксо в грозу</option>
                      <option value="fan_flutter">Обмахивается веером от зноя</option>
                      <option value="wind_boa">Ветер развевает перья и боа</option>
                      <option value="chic_pose">Поза светской дивы перед зеркалом</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Ссылка на видеофайл или анимацию (необязательно, MP4 / WebM / GIF)
                  </label>
                  <input
                    type="url"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="https://example.com/ellochka-umbrella.mp4"
                    className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3.5 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Если оставить пустым, будет проигрываться авторская векторная ретро-сценка синематографа.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Действие персонажа на экране
                  </label>
                  <input
                    type="text"
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    placeholder="Например: Раскрывает зонтик, морщит носик на холодный дождь"
                    className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3.5 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Реплика / Шутка Эллочки
                  </label>
                  <textarea
                    rows={2}
                    value={newDialogue}
                    onChange={(e) => setNewDialogue(e.target.value)}
                    placeholder="Например: Мрак! Мой шанхайский барс полиняет до нитки! Поедем на таксо!"
                    className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3.5 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-stone-400 hover:text-white"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#fce881] hover:to-[#d4af37] text-black font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Сохранить в словарь
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: AI JOKE GENERATOR (GEMINI) */}
          {activeTab === 'ai' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-[#120f18] border border-[#d4af37]/30 rounded-xl p-4 text-xs text-stone-300 flex items-start gap-3">
                <Wand2 className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#fce881] text-sm">ИИ-генератор шуток Эллочки (Gemini)</div>
                  Нейросеть генерирует шутки и реплики в строгом соответствии с 30-словным лексиконом Эллочки, её вечной дуэлью с дочерью миллиардера Вандербильда и конкретной погодой в выбранном городе!
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Погода для шутки
                  </label>
                  <select
                    value={aiCondition}
                    onChange={(e) => setAiCondition(e.target.value as WeatherConditionType)}
                    className="w-full bg-[#120f18] border border-[#544431] rounded-xl px-3 py-2 text-xs text-[#f5ebd7] focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="rain">🌧️ Дождь и слякоть</option>
                    <option value="clear">☀️ Ослепительное солнце</option>
                    <option value="snow">❄️ Мороз и снегопад</option>
                    <option value="storm">⚡ Гроза и молнии</option>
                    <option value="heat">🔥 Палящая жара</option>
                    <option value="wind">💨 Шквальный ветер</option>
                    <option value="clouds">☁️ Серая мгла</option>
                    <option value="fog">🌫️ Загадочный туман</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleGenerateAiJoke}
                    disabled={aiGenerating}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#fce881] hover:to-[#d4af37] text-black font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {aiGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Эллочка думает...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Сгенерировать шутку
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Result Card */}
              {aiGeneratedResult && (
                <div className="mt-4 p-4 rounded-xl border border-[#d4af37] bg-[#22182d] shadow-xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-deco text-xl font-black gold-gradient-text">
                      «{aiGeneratedResult.word}»
                    </span>
                    <button
                      onClick={() => speak(aiGeneratedResult.word + '. ' + aiGeneratedResult.dialogue)}
                      className="p-1 rounded text-stone-400 hover:text-[#fce881]"
                      title="Произнести"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm text-stone-100 font-vintage italic mt-1">
                    «{aiGeneratedResult.dialogue}»
                  </p>

                  <div className="mt-3 text-xs text-stone-300 bg-black/40 p-2.5 rounded-lg border border-white/5 space-y-1">
                    <div>🎭 <span className="font-semibold text-[#fce881]">Действие:</span> {aiGeneratedResult.action}</div>
                    <div>👗 <span className="font-semibold text-[#fce881]">Совет по гардеробу:</span> {aiGeneratedResult.dressingAdvice}</div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={handleSaveAiResult}
                      className="px-4 py-2 bg-[#d4af37] hover:bg-[#fce881] text-black font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Добавить эту шутку в словарь
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-[#d4af37]/30 bg-[#120f18] flex items-center justify-between text-xs text-stone-400">
          <span className="font-vintage">
            Всего в базе: <strong className="text-[#fce881]">{entries.length}</strong> фраз
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
