'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Volume2,
  VolumeX,
  HelpCircle,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

interface VegaCaptchaProps {
  action: string;
  value: string;
  onChange: (val: string) => void;
  onChallengeChange?: (challengeId: string) => void;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export default function VegaCaptcha({
  action,
  value,
  onChange,
  onChallengeChange,
  error,
  disabled = false,
  required = true,
  className = '',
}: VegaCaptchaProps) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Challenge vom Server anfordern
  const loadNewChallenge = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    onChange(''); // Eingabe zurücksetzen

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }

    try {
      const res = await fetch('/api/captcha/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok || !data.challengeId) {
        setFetchError(data.message || 'Sicherheitsaufgabe konnte nicht geladen werden.');
      } else {
        setChallengeId(data.challengeId);
        if (onChallengeChange) {
          onChallengeChange(data.challengeId);
        }
      }
    } catch {
      setFetchError('Verbindungsfehler beim Laden des CAPTCHAs.');
    } finally {
      setLoading(false);
    }
  }, [action, onChange, onChallengeChange]);

  useEffect(() => {
    loadNewChallenge();
  }, [loadNewChallenge]);

  // Audio-Wiedergabe umschalten
  const handleToggleAudio = () => {
    if (!challengeId) return;

    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    const audioUrl = `/api/captcha/audio/${challengeId}?t=${Date.now()}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    setIsPlayingAudio(true);
    audio.play().catch(() => {
      setIsPlayingAudio(false);
    });

    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
  };

  return (
    <div
      className={`bg-[#121216] border border-[#26262B] rounded-[8px] p-4 space-y-3.5 shadow-sm text-xs text-[#F5F5F5] ${className}`}
      role="region"
      aria-label="Sicherheitsüberprüfung"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#222227]">
        <div className="flex items-center gap-1.5 font-medium text-[#E5E5E5]">
          <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" aria-hidden="true" />
          <span>Sicherheitsüberprüfung</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="text-[#737373] hover:text-[#A78BFA] transition p-1 rounded focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]"
            title="Barrierefreiheit & Hilfe"
            aria-label="Informationen zur Barrierefreiheit und Hilfe"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#1B1B22] text-[#A1A1AA] border border-[#2D2D36]">
            VEGA Protect
          </span>
        </div>
      </div>

      {/* Bild & Steuerungsbuttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Bild-Container */}
        <div className="relative w-full sm:w-[230px] h-[75px] bg-[#18181E] border border-[#2D2D36] rounded-[6px] overflow-hidden flex items-center justify-center shrink-0">
          {loading ? (
            <div className="flex flex-col items-center gap-1 text-[#A1A1AA]">
              <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
              <span className="text-[10px]">Wird geladen...</span>
            </div>
          ) : fetchError ? (
            <div className="p-2 text-center text-rose-400 text-[11px] flex flex-col items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>{fetchError}</span>
            </div>
          ) : challengeId ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`/api/captcha/image/${challengeId}`}
              alt="Sicherheits-Code Aufgabe. Bitte trage die sichtbaren 5 bis 6 Zeichen ein."
              className="w-full h-full object-cover select-none pointer-events-none"
              draggable={false}
            />
          ) : null}
        </div>

        {/* Steuerungsknöpfe: Erneuern & Audio */}
        <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadNewChallenge}
            disabled={loading || disabled}
            className="flex-1 sm:flex-initial h-9 sm:h-8 px-3 bg-[#1C1C24] hover:bg-[#252530] text-[#D4D4D8] hover:text-white rounded-[6px] border border-[#2E2E3A] transition flex items-center justify-center gap-1.5 text-[11px] font-medium disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]"
            aria-label="Neue Sicherheitsaufgabe laden"
            title="Neue Sicherheitsaufgabe laden"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Erneuern</span>
          </button>

          <button
            type="button"
            onClick={handleToggleAudio}
            disabled={loading || !challengeId || disabled}
            className={`flex-1 sm:flex-initial h-9 sm:h-8 px-3 rounded-[6px] border transition flex items-center justify-center gap-1.5 text-[11px] font-medium disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] ${
              isPlayingAudio
                ? 'bg-purple-950/40 border-purple-500 text-purple-300'
                : 'bg-[#1C1C24] hover:bg-[#252530] text-[#D4D4D8] hover:text-white border-[#2E2E3A]'
            }`}
            aria-label={isPlayingAudio ? 'Audio-Wiedergabe stoppen' : 'Audio-Alternative abspielen'}
            title="Buchstaben akustisch vorlesen"
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-3.5 h-3.5 animate-pulse text-[#C084FC]" />
                <span>Stopp</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Audio</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Eingabefeld */}
      <div className="space-y-1.5">
        <label
          htmlFor={`captcha-input-${action}`}
          className="block text-[11px] font-medium text-[#A1A1AA]"
        >
          Sicherheitscode eingeben{' '}
          <span className="text-[10px] text-[#71717A]">(Groß-/Kleinschreibung egal)</span>
        </label>
        <div className="relative">
          <input
            id={`captcha-input-${action}`}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || loading}
            required={required}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck="false"
            maxLength={6}
            placeholder="Code hier eingeben"
            className="w-full h-10 bg-[#16161C] border border-[#2E2E38] rounded-[6px] px-3 font-mono tracking-widest text-sm text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition disabled:opacity-50"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `captcha-error-${action}` : undefined}
          />
          {value.length >= 5 && (
            <div className="absolute right-3 top-2.5 text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Fehlermeldung */}
      {error && (
        <div
          id={`captcha-error-${action}`}
          className="p-2 bg-rose-950/30 border border-rose-500/30 rounded text-[11px] text-rose-300 flex items-center gap-1.5"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Barrierefreiheit & Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181F] border border-[#2D2D38] rounded-[8px] max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#282834]">
              <h3 className="font-bold text-sm text-[#F5F5F5] flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#8B5CF6]" />
                Barrierefreiheit & Support
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-[#71717A] hover:text-[#F5F5F5] text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs text-[#A1A1AA] leading-relaxed">
              <p>
                <strong className="text-[#F5F5F5]">Akustische Alternative:</strong> Klicke auf den Button
                „Audio“, um die Buchstaben und Ziffern in einer barrierefreien Tonfolge vorgelesen zu bekommen.
              </p>
              <p>
                <strong className="text-[#F5F5F5]">Keine Verwechslung:</strong> Verwechslungszeichen wie die Ziffer 0
                oder der Buchstabe O sowie die Ziffer 1 und I/l kommen in unseren Aufgaben nicht vor.
              </p>
              <p>
                <strong className="text-[#F5F5F5]">Brauchst du Unterstützung?</strong> Falls du aufgrund von
                Seh- oder Höreinschränkungen Unterstützung benötigst, kannst du unser Support-Team direkt kontaktieren.
              </p>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <a
                href="/support"
                className="h-8 px-3.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white rounded-[6px] font-medium flex items-center gap-1.5 transition text-xs"
              >
                Support kontaktieren
              </a>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="h-8 px-3 bg-[#24242F] hover:bg-[#2F2F3D] text-[#D4D4D8] rounded-[6px] transition text-xs"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
