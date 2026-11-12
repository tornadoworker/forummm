'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import VegaCaptcha from '@/components/VegaCaptcha';

export default function ForgotPasswordPage() {
  const [login, setLogin] = useState('');
  const [captchaChallengeId, setCaptchaChallengeId] = useState('');
  const [captchaResponse, setCaptchaResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim()) {
      setError('Bitte gib deine E-Mail oder deinen Benutzernamen ein.');
      return;
    }

    if (!captchaResponse.trim()) {
      setError('Bitte löse das Sicherheits-CAPTCHA.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: login.trim(),
          captchaChallengeId,
          captchaResponse: captchaResponse.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Anfordern des Zurücksetzens.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
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
              Passwort zurücksetzen
            </h1>
            <p className="text-[13px] text-[#999999]">
              Wir senden dir eine Anleitung zum Wiederherstellen deines Kontos.
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

          {success ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[#F5F5F5]">Anfrage übermittelt</h3>
                <p className="text-[13px] text-[#999999] leading-relaxed">
                  Falls die Angaben mit einem aktiven Benutzerkonto übereinstimmen, erhältst du in Kürze Anweisungen zur Zurücksetzung deines Passworts.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full h-11 bg-[#101010] hover:bg-[#1A1A1A] text-[#F5F5F5] text-sm font-medium rounded-[8px] border border-[#292929] transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Zurück zur Anmeldung</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reset-login" className="block text-[13px] font-medium text-[#F5F5F5]">
                  Benutzername oder E-Mail
                </label>
                <input
                  id="reset-login"
                  type="text"
                  required
                  autoFocus
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="name@example.de oder Benutzername"
                  className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[8px] px-3.5 text-sm text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6] transition"
                />
              </div>

              {/* Hauseigenes CAPTCHA */}
              <VegaCaptcha
                action="FORGOT_PASSWORD"
                value={captchaResponse}
                onChange={setCaptchaResponse}
                onChallengeChange={setCaptchaChallengeId}
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading || !login.trim() || !captchaResponse.trim()}
                className="w-full h-11 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-medium rounded-[8px] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Wird gesendet...</span>
                  </>
                ) : (
                  <span>Passwort zurücksetzen</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-[13px] text-[#999999] hover:text-[#F5F5F5] transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Zurück zur Anmeldung</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
