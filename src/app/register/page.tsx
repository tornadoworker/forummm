'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import VegaCaptcha from '@/components/VegaCaptcha';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams?.get('error');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [captchaChallengeId, setCaptchaChallengeId] = useState('');
  const [captchaResponse, setCaptchaResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!urlError) return;
    switch (urlError) {
      case 'discord_cancelled':
        setError('Die Registrierung über Discord wurde abgebrochen.');
        break;
      case 'discord_not_configured':
        setError('Discord OAuth2 ist auf dem Server noch nicht konfiguriert (DISCORD_CLIENT_SECRET fehlt in .env).');
        break;
      case 'invalid_state':
        setError('Sicherheitsprüfung für Discord fehlgeschlagen (ungültiges State-Token). Bitte erneut versuchen.');
        break;
      case 'discord_token_failed':
        setError('Discord Token-Austausch fehlgeschlagen. Bitte prüfe die Client-Secret-Konfiguration.');
        break;
      case 'discord_profile_failed':
        setError('Dein Discord-Profil konnte nicht abgerufen werden.');
        break;
      default:
        setError('Ein Fehler bei der Registrierung ist aufgetreten.');
    }
  }, [urlError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    const cleanMail = email.trim();

    if (!cleanUser) {
      setError('Bitte wähle einen gültigen Benutzernamen.');
      return;
    }

    if (!cleanMail) {
      setError('Bitte gib deine E-Mail-Adresse ein.');
      return;
    }

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Die eingegebenen Passwörter stimmen nicht überein.');
      return;
    }

    if (!terms) {
      setError('Bitte bestätige, dass du das Regelwerk akzeptierst.');
      return;
    }

    if (!captchaResponse.trim()) {
      setError('Bitte löse das Sicherheits-CAPTCHA.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          email: cleanMail,
          password,
          terms,
          captchaChallengeId,
          captchaResponse: captchaResponse.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler bei der Registrierung.');
        setLoading(false);
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen. Bitte versuche es erneut.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-[440px] space-y-6">
        {/* Branding & Logo Header */}
        <div className="text-center space-y-2.5">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="Vega Crimelife Logo"
              className="h-11 w-auto object-contain group-hover:scale-105 transition-transform"
            />
            <span className="text-base font-extrabold tracking-wider text-[#F5F5F5] uppercase">
              Vega <span className="text-[#8B5CF6]">Crimelife</span>
            </span>
          </Link>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#F5F5F5] tracking-tight">
              Konto erstellen
            </h1>
            <p className="text-[13px] text-[#999999]">
              Werde Teil der Vega Crimelife Community.
            </p>
          </div>
        </div>

        {/* Register Container */}
        <div className="bg-[#141414] border border-[#292929] rounded-[8px] p-7 sm:p-9 shadow-2xl space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-[6px] bg-red-950/30 border border-red-500/30 text-red-300 text-[13px] leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ECHTER DISCORD OAUTH2 REGISTRIEREN BUTTON */}
          <div>
            <a
              href="/api/auth/discord?action=register&redirect=/"
              className="w-full h-11 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold rounded-[8px] transition-all flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg group cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Mit Discord registrieren</span>
            </a>
          </div>

          {/* Teiler */}
          <div className="relative flex items-center justify-center my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#292929]" />
            </div>
            <div className="relative px-3 bg-[#141414] text-[11px] font-semibold tracking-wider uppercase text-[#737373]">
              oder mit E-Mail registrieren
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-username" className="block text-[13px] font-medium text-[#F5F5F5]">
                Benutzername
              </label>
              <input
                id="reg-username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="z.B. Santos_Boss"
                className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[8px] px-3.5 text-sm text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6] transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-[13px] font-medium text-[#F5F5F5]">
                E-Mail-Adresse
              </label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.de"
                className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[8px] px-3.5 text-sm text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6] transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="block text-[13px] font-medium text-[#F5F5F5]">
                Passwort
              </label>
              <input
                id="reg-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[8px] px-3.5 text-sm text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6] transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-password-confirm" className="block text-[13px] font-medium text-[#F5F5F5]">
                Passwort wiederholen
              </label>
              <input
                id="reg-password-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[8px] px-3.5 text-sm text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6] transition"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-[4px] bg-[#101010] border border-[#292929] text-[#8B5CF6] accent-[#8B5CF6] focus:ring-0 cursor-pointer"
                />
                <span className="text-[13px] text-[#999999] leading-snug">
                  Ich habe das{' '}
                  <Link href="/rules" target="_blank" className="text-[#8B5CF6] hover:text-[#7C3AED] hover:underline">
                    Regelwerk
                  </Link>{' '}
                  gelesen und akzeptiere es.
                </span>
              </label>
            </div>

            {/* Hauseigenes CAPTCHA */}
            <VegaCaptcha
              action="REGISTER"
              value={captchaResponse}
              onChange={setCaptchaResponse}
              onChallengeChange={setCaptchaChallengeId}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !username.trim() || !email.trim() || !password || !passwordConfirm || !captchaResponse.trim()}
              className="w-full h-11 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-medium rounded-[8px] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Konto wird erstellt...</span>
                </>
              ) : (
                <span>Registrieren</span>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#292929] text-center text-[13px] text-[#999999]">
            Bereits registriert?{' '}
            <Link
              href="/login"
              className="text-[#8B5CF6] hover:text-[#7C3AED] font-medium hover:underline transition"
            >
              Hier anmelden
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[75vh]" />}>
      <RegisterFormContent />
    </Suspense>
  );
}
