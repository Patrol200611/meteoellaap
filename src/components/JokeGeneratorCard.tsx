import React, { useState } from 'react';
import { Sparkles, Wand2, Volume2, Plus, Check, RefreshCw } from 'lucide-react';
import { WeatherConditionType, EllochkaWordEntry } from '../types/weather';

interface JokeGeneratorCardProps {
  currentCondition: WeatherConditionType;
  cityName: string;
  temperature: number;
  conditionRu: string;
  onAddAndSelectJoke: (entry: EllochkaWordEntry) => void;
}

export const JokeGeneratorCard: React.FC<JokeGeneratorCardProps> = ({
  currentCondition,
  cityName,
  temperature,
  conditionRu,
  onAddAndSelectJoke,
}) => {
  const [loading, setLoading] = useState(false);
  const [jokeResult, setJokeResult] = useState<{
    word: string;
    dialogue: string;
    action: string;
    dressingAdvice: string;
    videoType: string;
  } | null>(null);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch('/api/gemini/generate-joke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: currentCondition,
          cityName,
          temperature,
          conditionRu,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setJokeResult(data);
    } catch (err) {
      console.error('Joke generator error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDictionary = () => {
    if (!jokeResult) return;

    const newEntry: EllochkaWordEntry = {
      id: `ai-${Date.now()}`,
      word: jokeResult.word,
      meaning: `Совет Эллочки: ${jokeResult.dressingAdvice}`,
      condition: currentCondition,
      conditionLabel: conditionRu,
      action: jokeResult.action,
      dialogue: jokeResult.dialogue,
      videoType: (jokeResult.videoType as any) || 'chic_pose',
      isCustom: true,
      author: 'Эллочка & ИИ (Gemini)',
      createdAt: new Date().toISOString(),
    };

    onAddAndSelectJoke(newEntry);
    setSaved(true);
  };

  const speak = () => {
    if (!jokeResult || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`${jokeResult.word}. ${jokeResult.dialogue}`);
      u.lang = 'ru-RU';
      u.pitch = 1.25;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('Speech error:', e);
    }
  };

  return (
    <div className="bg-[#1a1622] border border-[#d4af37]/40 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#d4af37]/20 text-[#fce881]">
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
          </div>
          <div>
            <h3 className="font-deco text-sm sm:text-base font-bold gold-gradient-text uppercase">
              Генератор шуток Эллочки под погоду
            </h3>
            <p className="text-[11px] text-stone-400 font-vintage">
              Сарказм в адрес Вандербильдихи под климат города {cityName}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-3.5 py-1.5 bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#fce881] hover:to-[#d4af37] text-black font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Сочиняет...
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5" />
              Придумать шутку
            </>
          )}
        </button>
      </div>

      {jokeResult ? (
        <div className="bg-[#120f18] border border-[#d4af37]/40 rounded-xl p-3.5 space-y-2.5 animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-deco text-lg sm:text-xl font-black text-[#fce881]">
                «{jokeResult.word}»
              </span>
              <p className="text-xs sm:text-sm text-stone-200 font-vintage italic mt-1">
                «{jokeResult.dialogue}»
              </p>
            </div>
            <button
              onClick={speak}
              className="p-1.5 rounded-lg bg-black/40 text-stone-400 hover:text-[#fce881] transition-colors"
              title="Озвучить шутку"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[11px] text-stone-300 bg-black/30 p-2 rounded-lg border border-white/5 space-y-1">
            <div>🎭 <strong className="text-[#fce881]">Действие на экране:</strong> {jokeResult.action}</div>
            <div>👗 <strong className="text-[#fce881]">Гардеробный шик:</strong> {jokeResult.dressingAdvice}</div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSaveToDictionary}
              disabled={saved}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#d4af37]/30 hover:bg-[#d4af37] text-[#fce881] hover:text-black border border-[#d4af37]/60'
              }`}
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {saved ? 'Добавлено на экран и в словарь!' : 'Вывести на экран и сохранить'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 bg-[#120f18]/60 border border-dashed border-white/10 rounded-xl">
          <p className="text-xs text-stone-400 font-vintage">
            Нажмите кнопку <strong className="text-[#fce881]">«Придумать шутку»</strong>, чтобы Эллочка оценила текущую погоду в г. {cityName} ({conditionRu}, {temperature > 0 ? `+${temperature}` : temperature}°C) в своем неподражаемом стиле!
          </p>
        </div>
      )}
    </div>
  );
};
