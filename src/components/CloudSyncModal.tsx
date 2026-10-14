import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  UploadCloud, 
  DownloadCloud, 
  Copy, 
  Check, 
  Smartphone, 
  Share2, 
  RefreshCw, 
  AlertCircle,
  Download,
  Upload,
  Key
} from 'lucide-react';
import { EllochkaWordEntry, CityData } from '../types/weather';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncCode: string;
  onChangeSyncCode: (newCode: string) => void;
  customEntries: EllochkaWordEntry[];
  favoriteCities: CityData[];
  onSyncDataLoaded: (data: { customEntries: EllochkaWordEntry[]; favoriteCities: CityData[] }) => void;
  lastSyncedAt: string | null;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  syncCode,
  onChangeSyncCode,
  customEntries,
  favoriteCities,
  onSyncDataLoaded,
  lastSyncedAt,
}) => {
  const [inputCode, setInputCode] = useState(syncCode);
  const [saving, setSaving] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Generate shareable URL with sync code in query params
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(inputCode || syncCode)}`
    : '';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inputCode || syncCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveToCloud = async () => {
    const code = (inputCode || syncCode).trim().toUpperCase();
    if (code.length < 3) {
      setStatusMessage({ type: 'error', text: 'Код синхронизации должен быть не менее 3 символов' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/sync/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncCode: code,
          customEntries: customEntries,
          favoriteCities: favoriteCities,
          deviceNote: navigator.userAgent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      onChangeSyncCode(code);
      setStatusMessage({
        type: 'success',
        text: `Словарь и города успешно сохранены в облаке под кодом «${code}»!`,
      });
    } catch (err: any) {
      console.error('Save to cloud error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Ошибка сохранения в облако' });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadFromCloud = async () => {
    const code = (inputCode || syncCode).trim().toUpperCase();
    if (code.length < 3) {
      setStatusMessage({ type: 'error', text: 'Введите правильный код синхронизации' });
      return;
    }

    setLoadingCloud(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/sync/load/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Код не найден');

      onChangeSyncCode(code);
      onSyncDataLoaded({
        customEntries: data.customEntries || [],
        favoriteCities: data.favoriteCities || [],
      });

      setStatusMessage({
        type: 'success',
        text: `Успешно загружено из облака: ${data.customEntries?.length || 0} фраз и ${data.favoriteCities?.length || 0} избранных городов!`,
      });
    } catch (err: any) {
      console.error('Load from cloud error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Ошибка загрузки из облака' });
    } finally {
      setLoadingCloud(false);
    }
  };

  // Export JSON file
  const handleExportJson = () => {
    const exportData = {
      syncCode,
      exportedAt: new Date().toISOString(),
      customEntries,
      favoriteCities,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ellochka_dictionary_${syncCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.customEntries) {
          onSyncDataLoaded({
            customEntries: parsed.customEntries || [],
            favoriteCities: parsed.favoriteCities || [],
          });
          if (parsed.syncCode) {
            onChangeSyncCode(parsed.syncCode);
            setInputCode(parsed.syncCode);
          }
          setStatusMessage({
            type: 'success',
            text: `Файл импортирован! Загружено ${parsed.customEntries.length} фраз.`,
          });
        }
      } catch (err) {
        setStatusMessage({ type: 'error', text: 'Ошибка чтения JSON-файла' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#17131d] border-2 border-[#d4af37] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#d4af37]/30 flex items-center justify-between bg-gradient-to-r from-[#211a2c] via-[#1a1424] to-[#211a2c]">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-[#d4af37]" />
            <div>
              <h2 className="font-deco text-base sm:text-lg font-bold gold-gradient-text uppercase">
                Облачная синхронизация библиотеки
              </h2>
              <p className="text-xs text-[#c2b4a5] font-vintage">
                Доступ к вашим видеореакциям и шуткам с любого смартфона и компьютера
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

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/60 border border-rose-500/50 text-rose-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Cloud Sync Code Box */}
          <div className="bg-[#120f18] border border-[#d4af37]/30 rounded-xl p-4">
            <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#d4af37]" />
                Ваш персональный код синхронизации:
              </span>
              {lastSyncedAt && (
                <span className="text-[10px] text-stone-500">
                  Посл. синхр: {new Date(lastSyncedAt).toLocaleTimeString('ru-RU')}
                </span>
              )}
            </label>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Например: ELLO-1927"
                className="flex-1 bg-[#1a1424] border border-[#544431] rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-[#fce881] tracking-wider uppercase focus:outline-none focus:border-[#d4af37]"
              />
              <button
                onClick={handleCopyCode}
                className="p-2.5 rounded-xl bg-[#291f36] hover:bg-[#3d2c52] border border-[#d4af37]/30 text-stone-300 hover:text-white transition-colors"
                title="Скопировать код"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Sync Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={handleSaveToCloud}
                disabled={saving}
                className="py-2.5 px-3 bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#fce881] hover:to-[#d4af37] text-black font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                Сохранить в облако
              </button>

              <button
                onClick={handleLoadFromCloud}
                disabled={loadingCloud}
                className="py-2.5 px-3 bg-[#2b2138] hover:bg-[#3d2f50] border border-[#d4af37]/40 text-[#fce881] font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingCloud ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <DownloadCloud className="w-4 h-4" />
                )}
                Загрузить из облака
              </button>
            </div>
          </div>

          {/* Mobile Access / Link Sharing */}
          <div className="bg-[#120f18] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#fce881]">
              <Smartphone className="w-4 h-4 text-[#d4af37]" />
              Открыть на телефоне или планшете:
            </div>
            <p className="text-[11px] text-stone-400 font-vintage mb-2.5">
              Откройте эту ссылку на любом устройстве — ваша база видео и шуток подключится автоматически:
            </p>

            <div className="flex items-center gap-2 bg-[#1a1424] p-2 rounded-xl border border-white/5">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-[11px] font-mono text-stone-300 outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded-lg bg-[#d4af37] text-black font-semibold text-xs hover:bg-[#fce881] transition-colors flex items-center gap-1 shrink-0"
              >
                {copiedLink ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                {copiedLink ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
          </div>

          {/* Backup & Restore (JSON) */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
            <span className="text-stone-400 font-vintage">Резервная копия:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              >
                <Download className="w-3 h-3 text-[#d4af37]" />
                Экспорт JSON
              </button>

              <label className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] cursor-pointer">
                <Upload className="w-3 h-3 text-[#d4af37]" />
                Импорт JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[#d4af37]/30 bg-[#120f18] flex items-center justify-between text-xs text-stone-400">
          <span className="font-vintage">
            Пользовательских фраз в синхронизации: <strong className="text-[#fce881]">{customEntries.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Готово
          </button>
        </div>

      </div>
    </div>
  );
};
