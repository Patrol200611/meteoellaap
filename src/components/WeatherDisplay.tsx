import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Wind, 
  Droplets, 
  Gauge, 
  Sun, 
  CloudRain, 
  Cloud, 
  Snowflake, 
  Zap, 
  Compass,
  Calendar,
  Clock,
  RefreshCw
} from 'lucide-react';
import { CityData, WeatherData, WeatherConditionType } from '../types/weather';
import { POPULAR_CITIES } from '../data/ellochkaDictionary';

interface WeatherDisplayProps {
  weather: WeatherData | null;
  loading: boolean;
  onSelectCity: (city: CityData) => void;
  onRefresh: () => void;
}

export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({
  weather,
  loading,
  onSelectCity,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityData[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Search cities via geocoding
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/cities/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!res.ok) throw new Error('Search failed');
      const data: CityData[] = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        setSearchError('Город не найден. Попробуйте написать по-русски или латиницей.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Не удалось выполнить поиск. Проверьте соединение.');
    } finally {
      setSearching(false);
    }
  };

  const getWeatherIcon = (cond: WeatherConditionType, sizeClass = 'w-6 h-6') => {
    switch (cond) {
      case 'clear':
        return <Sun className={`${sizeClass} text-amber-400`} />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className={`${sizeClass} text-blue-400`} />;
      case 'snow':
        return <Snowflake className={`${sizeClass} text-cyan-300`} />;
      case 'storm':
        return <Zap className={`${sizeClass} text-purple-400`} />;
      case 'clouds':
        return <Cloud className={`${sizeClass} text-stone-300`} />;
      case 'wind':
        return <Wind className={`${sizeClass} text-emerald-400`} />;
      default:
        return <Sun className={`${sizeClass} text-amber-400`} />;
    }
  };

  const formatHour = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatDayName = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* City Search Bar & Quick Tags */}
      <div className="bg-[#1a1622] border border-[#d4af37]/40 rounded-2xl p-3 sm:p-4 shadow-xl">
        <form onSubmit={handleSearch} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#d4af37] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите любой город мира (например: Париж, Сочи, Рим)..."
              className="w-full bg-[#120f18] border border-[#544431] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#f5ebd7] placeholder-stone-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#fce881] hover:to-[#d4af37] text-black font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Узнать погоду'}
          </button>
        </form>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-3 p-2 bg-[#120f18] border border-[#d4af37]/40 rounded-xl divide-y divide-white/5 max-h-48 overflow-y-auto">
            {searchResults.map((city) => (
              <button
                key={city.id}
                onClick={() => {
                  onSelectCity(city);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
                className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-[#2e2439] rounded-lg transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#d4af37] group-hover:scale-110 transition-transform" />
                  <span className="text-[#fce881] font-medium">{city.name}</span>
                  {city.admin1 && <span className="text-stone-400 text-xs">({city.admin1})</span>}
                </div>
                <span className="text-stone-400 text-xs">{city.country}</span>
              </button>
            ))}
          </div>
        )}

        {searchError && (
          <p className="mt-2 text-xs text-rose-300 font-vintage">{searchError}</p>
        )}

        {/* Popular / Literary Cities Bar */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-stone-400 font-vintage text-[11px] whitespace-nowrap mr-1">Быстрый выбор:</span>
          {POPULAR_CITIES.map((c) => {
            const isSelected = weather?.city?.name?.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]);
            return (
              <button
                key={c.id}
                onClick={() => onSelectCity(c)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] transition-all border ${
                  isSelected
                    ? 'bg-[#d4af37] text-black font-bold border-[#d4af37] shadow-sm'
                    : 'bg-[#120f18] text-[#e8dac7] border-[#423528] hover:border-[#d4af37]/60 hover:text-white'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Weather Overview Card */}
      {weather && (
        <div className="bg-[#1a1622] border border-[#d4af37]/40 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
          {/* Top Bar with City & Refresh */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#d4af37]" />
                <h1 className="font-deco text-xl sm:text-2xl font-bold gold-gradient-text tracking-wide">
                  {weather.city.name}
                </h1>
                <span className="text-xs text-stone-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                  {weather.city.country}
                </span>
              </div>
              <p className="text-xs text-stone-400 font-vintage mt-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl bg-[#120f18] border border-[#544431] hover:border-[#d4af37] text-stone-300 hover:text-white transition-all"
              title="Обновить прогноз"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#d4af37]' : ''}`} />
            </button>
          </div>

          {/* Current Temperature & Condition Hero */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-y border-[#d4af37]/20 py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#120f18] rounded-2xl border border-[#d4af37]/30 shadow-inner">
                {getWeatherIcon(weather.current.condition, 'w-12 h-12')}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-deco text-4xl sm:text-5xl font-black text-[#fdfaf3] tracking-tight">
                    {weather.current.temperature > 0 ? `+${weather.current.temperature}` : weather.current.temperature}°C
                  </span>
                  <span className="text-sm sm:text-base text-stone-400 font-vintage">
                    Ощущается как {weather.current.feelsLike > 0 ? `+${weather.current.feelsLike}` : weather.current.feelsLike}°
                  </span>
                </div>
                <p className="text-base text-[#fce881] font-semibold mt-0.5">
                  {weather.current.conditionRu}
                </p>
              </div>
            </div>

            {/* Weather Stats Pillars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#120f18] border border-white/5 rounded-xl p-2 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-stone-400">Влажность</div>
                  <div className="font-semibold text-white">{weather.current.humidity}%</div>
                </div>
              </div>

              <div className="bg-[#120f18] border border-white/5 rounded-xl p-2 flex items-center gap-2">
                <Wind className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-stone-400">Ветер</div>
                  <div className="font-semibold text-white">{weather.current.windSpeed} м/с</div>
                </div>
              </div>

              <div className="bg-[#120f18] border border-white/5 rounded-xl p-2 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-stone-400">Давление</div>
                  <div className="font-semibold text-white">{weather.current.pressure} мм рт. ст.</div>
                </div>
              </div>

              <div className="bg-[#120f18] border border-white/5 rounded-xl p-2 flex items-center gap-2">
                <Sun className="w-4 h-4 text-orange-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-stone-400">Осадки</div>
                  <div className="font-semibold text-white">{weather.current.precipitation} мм</div>
                </div>
              </div>
            </div>
          </div>

          {/* 24-Hour Hourly Forecast Track */}
          <div className="mt-4">
            <h3 className="text-xs font-vintage uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
              Почасовой прогноз на 24 часа
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {weather.hourly.map((hour, index) => (
                <div
                  key={index}
                  className="min-w-[62px] bg-[#120f18] border border-white/5 hover:border-[#d4af37]/40 rounded-xl p-2 text-center flex flex-col items-center justify-between transition-all"
                >
                  <span className="text-[10px] text-stone-400 font-mono">
                    {formatHour(hour.time)}
                  </span>
                  <div className="my-1.5">
                    {getWeatherIcon(hour.condition, 'w-5 h-5')}
                  </div>
                  <span className="text-xs font-bold text-[#fce881]">
                    {hour.temp > 0 ? `+${hour.temp}` : hour.temp}°
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 7-Day Forecast */}
          <div className="mt-4 pt-3 border-t border-[#d4af37]/20">
            <h3 className="text-xs font-vintage uppercase tracking-wider text-stone-400 mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
              Прогноз на неделю
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {weather.daily.map((day, idx) => (
                <div
                  key={idx}
                  className="bg-[#120f18] border border-white/5 hover:border-[#d4af37]/50 rounded-xl p-2.5 flex flex-col items-center text-center transition-all group"
                >
                  <span className="text-xs font-medium text-stone-300 group-hover:text-[#fce881]">
                    {formatDayName(day.date)}
                  </span>
                  <div className="my-2">
                    {getWeatherIcon(day.condition, 'w-6 h-6')}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-white">
                      {day.tempMax > 0 ? `+${day.tempMax}` : day.tempMax}°
                    </span>
                    <span className="text-stone-500">
                      {day.tempMin > 0 ? `+${day.tempMin}` : day.tempMin}°
                    </span>
                  </div>
                  {day.precipitationProbability > 0 && (
                    <span className="mt-1 text-[10px] text-blue-400">
                      💧 {day.precipitationProbability}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
