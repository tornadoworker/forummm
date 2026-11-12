'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import VegaCaptcha from '@/components/VegaCaptcha';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') || '/';
  const urlError = searchParams?.get('error');

  const [step, setStep] = useState<'credentials' | '2fa'>(searchParams.get('step') === 'discord-2fa' ? '2fa' : 'credentials');
  const [pendingToken, setPendingToken] = useState<string>('');
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const [isBackupCodeMode, setIsBackupCodeMode] = useState<boolean>(false);

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaChallengeId, setCaptchaChallengeId] = useState('');
  const [captchaResponse, setCaptchaResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!urlError) return;
    switch (urlError) {
      case 'discord_cancelled':
        setError('Die Anmeldung über Discord wurde abgebrochen.');
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
      case 'account_banned':
        setError('Dieses Konto ist gesperrt.');
        break;
      default:
        setError('Ein Fehler bei der Anmeldung ist aufgetreten.');
    }
  }, [urlError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanLogin = login.trim();
    if (!cleanLogin) {
      setError('Bitte gib deinen Benutzernamen oder deine E-Mail-Adresse ein.');
      return;
    }

    if (!password) {
      setError('Bitte gib dein Passwort ein.');
      return;
    }

    if (requiresCaptcha && !captchaResponse.trim()) {
      setError('Aufgrund wiederholter Fehlversuche ist die Sicherheitsprüfung (CAPTCHA) erforderlich.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: cleanLogin,
          password,
          rememberMe,
          captchaChallengeId: requiresCaptcha ? captchaChallengeId : undefined,
          captchaResponse: requiresCaptcha ? captchaResponse.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ungültige Anmeldedaten. Bitte überprüfe deine Eingaben.');
        if (data.requiresCaptcha) {
          setRequiresCaptcha(true);
        }
        setLoading(false);
        return;
      }

      if (data.requires2FA) {
        setPendingToken(data.pendingToken);
        setStep('2fa');
        setLoading(false);
        return;
      }

      window.location.href = redirectTo;
    } catch {
      setError('Verbindung zum Server fehlgeschlagen. Bitte versuche es erneut.');
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = twoFactorCode.trim();
    if (!cleanCode) {
      setError(isBackupCodeMode ? 'Bitte gib einen deiner 8-stelligen Backup-Codes ein.' : 'Bitte gib den 6-stelligen Bestätigungscode ein.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendingToken,
          code: cleanCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ungültiger Bestätigungscode.');
        setLoading(false);
      } else {
        window.location.href = redirectTo;
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
              {step === '2fa' ? 'Sicherheitsabfrage' : 'Willkommen zurück'}
            </h1>
            <p className="text-[13px] text-[#999999]">
              {step === '2fa'
                ? 'Dein Account ist durch Zwei-Faktor-Authentifizierung geschützt.'
                : 'Melde dich mit deinem Konto oder Discord an.'}
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-[#141414] border border-[#292929] rounded-[8px] p-7 sm:p-9 shadow-2xl space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-[6px] bg-red-950/30 border border-red-500/30 text-red-300 text-[13px] leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === '2fa' ? (
            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div className="flex flex-col items-center justify-center py-2 text-center">
                <div className="w-12 h-12 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] mb-3">
                  {isBackupCodeMode ? <KeyRound className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                </div>
                <h2 className="text-sm font-semibold text-[#F5F5F5]">
                  {isBackupCodeMode ? 'Backup-Wiederherstellungscode' : 'Authenticator-Code eingeben'}
                </h2>
                <p className="text-xs text-[#999999] mt-1 max-w-[280px]">
                  {isBackupCodeMode
                    ? 'Gib einen deiner 8-stelligen Backup-Codes ein, die du bei der Einrichtung erhalten hast.'
                    : 'Öffne deine Authenticator-App (Google Authenticator, Authy o.ä.) und gib den 6-stelligen Code ein.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <input
                  id="two-factor-code"
                  type="text"
                  autoFocus
                  required
                  autoComplete="one-time-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.toUpperCase())}
                  placeholder={isBackupCodeMode ? 'z. B. 4A8F-9C2E' : '000000'}
                  maxLength={isBackupCodeMode ? 12 : 6}
                  className="w-full h-12 bg-[#101010] border border-[#292929] rounded-[8px] text-center font-mono text-lg tracking-[0.25em] text-[#F5F5F5] placeholder-[#555555] focus:outline-none focus:border-[#8B5CF6] transition"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupCodeMode(!isBackupCodeMode);
                    setTwoFactorCode('');
                    setError(null);
                  }}
                  className="text-[#8B5CF6] hover:text-[#A78BFA] transition cursor-pointer"
                >
                  {isBackupCodeMode ? 'Zurück zum Authenticator-Code' : 'Backup-Code verwenden'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !twoFactorCode.trim()}
                className="w-full h-11 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-medium rounded-[8px] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Wird überprüft...</span>
                  </>
                ) : (
                  <span>Bestätigen</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setError(null);
                    setTwoFactorCode('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Zurück zum Login
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* ECHTER DISCORD OAUTH2 LOGIN BUTTON */}
              <div>
                <a
                  href={`/api/auth/discord?action=login&redirect=${encodeURIComponent(redirectTo)}`}
                  className="w-full h-11 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold rounded-[8px] transition-all flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg group cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  <span>Mit Discord anmelden</span>
                </a>
              </div>

              {/* Teiler */}
              <div className="relative flex items-center justify-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#292929]" />
                </div>
                <div className="relative px-3 bg-[#141414] text-[11px] font-semibold tracking-wider uppercase text-[#737373]">
                  oder mit Anmeldedaten
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Benutzername oder E-Mail */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-identifier"
                    className="block text-[13px] font-medium text-[#F5F5F5]"
                  >
                    Benutzername oder E-Mail
                  </label>
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    autoComplete="username"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="name@example.de oder Benutzername"
                    className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[8px] px-3.5 text-sm text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6] transition"
                  />
                </div>

                {/* Passwort */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-[13px] font-medium text-[#F5F5F5]"
                    >
                      Passwort
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[13px] text-[#8B5CF6] hover:text-[#7C3AED] hover:underline transition"
                    >
                      Passwort vergessen?
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[8px] px-3.5 pr-10 text-sm text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#F5F5F5] transition p-1 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Angemeldet bleiben */}
                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-[4px] bg-[#101010] border border-[#292929] text-[#8B5CF6] accent-[#8B5CF6] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[13px] text-[#999999]">Angemeldet bleiben</span>
                  </label>
                </div>

                {/* Hauseigenes CAPTCHA bei wiederholten Fehlversuchen */}
                {requiresCaptcha && (
                  <VegaCaptcha
                    action="LOGIN"
                    value={captchaResponse}
                    onChange={setCaptchaResponse}
                    onChallengeChange={setCaptchaChallengeId}
                    disabled={loading}
                  />
                )}

                {/* Anmelden Button */}
                <button
                  type="submit"
                  disabled={loading || !login.trim() || !password || (requiresCaptcha && !captchaResponse.trim())}
                  className="w-full h-11 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-medium rounded-[8px] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Wird angemeldet...</span>
                    </>
                  ) : (
                    <span>Anmelden</span>
                  )}
                </button>
              </form>

              {/* Registrieren Link */}
              <div className="pt-4 border-t border-[#292929] text-center text-[13px] text-[#999999]">
                Noch kein Konto?{' '}
                <Link
                  href="/register"
                  className="text-[#8B5CF6] hover:text-[#7C3AED] font-medium hover:underline transition"
                >
                  Registrieren
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[75vh]" />}>
      <LoginFormContent />
    </Suspense>
  );
}
