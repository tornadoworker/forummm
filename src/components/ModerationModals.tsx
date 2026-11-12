'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Ban,
  Folder,
  History,
  X,
  Send,
  CheckCircle2,
  Lock,
  UserX,
  MicOff,
  Clock,
  Tag,
  Archive
} from 'lucide-react';

/* -------------------------------------------------------------
 * 1. REPORT MODAL (Meldung einreichen)
 * ------------------------------------------------------------- */
interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'THREAD' | 'POST' | 'USER';
  targetId: string;
  targetTitle?: string;
  onSuccess?: () => void;
}

export function ReportModal({
  isOpen,
  onClose,
  type,
  targetId,
  targetTitle,
  onSuccess,
}: ReportModalProps) {
  const [reason, setReason] = useState('SPAM');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/moderation/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          targetId,
          reason,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Senden der Meldung.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
          setSuccess(false);
          setDescription('');
        }, 1500);
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] max-w-md w-full p-5 space-y-4 text-xs shadow-xl">
        <div className="flex items-center justify-between border-b border-[#292929] pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#F5F5F5]">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Inhalt melden</span>
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#F5F5F5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {targetTitle && (
          <div className="p-2.5 bg-[#111111] border border-[#292929] rounded-[4px] text-[11px] text-[#A3A3A3] truncate">
            Meldung für: <strong className="text-[#F5F5F5]">{targetTitle}</strong>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-[#111111] border border-red-500/40 rounded-[4px] text-xs text-red-400">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-4 bg-[#111111] border border-green-500/40 rounded-[4px] text-center space-y-1 text-green-400">
            <CheckCircle2 className="w-6 h-6 mx-auto" />
            <p className="font-semibold">Vielen Dank für deine Meldung.</p>
            <p className="text-[11px] text-[#A3A3A3]">Unsere Moderation wird den Vorfall umgehend prüfen.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[#A3A3A3] mb-1 font-medium">Grund der Meldung</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="SPAM">Spam oder Werbung</option>
                <option value="HARASSMENT">Beleidigung oder Belästigung</option>
                <option value="OFFENSIVE">Anstößiger oder illegaler Inhalt</option>
                <option value="MISINFORMATION">Falschinformationen / Trolling</option>
                <option value="RULE_VIOLATION">Verstoß gegen die Serverregeln</option>
                <option value="OTHER">Sonstiger Verstoß</option>
              </select>
            </div>

            <div>
              <label className="block text-[#A3A3A3] mb-1 font-medium">
                Zusätzliche Erläuterung <span className="text-[#737373] text-[10px]">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibe kurz, warum dieser Inhalt gemeldet wird..."
                className="w-full bg-[#101010] border border-[#292929] rounded-[4px] p-2.5 text-xs text-[#F5F5F5] placeholder-[#555555] focus:outline-none focus:border-[#8B5CF6]"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#292929]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5]"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white font-medium rounded-[4px] transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Wird gesendet...' : 'Meldung absenden'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 2. WARN USER MODAL (Verwarnung aussprechen)
 * ------------------------------------------------------------- */
interface WarnUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: { id: string; username: string };
  onSuccess?: () => void;
}

export function WarnUserModal({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}: WarnUserModalProps) {
  const [reason, setReason] = useState('Verstoß gegen die Forenregeln');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(1);
  const [durationDays, setDurationDays] = useState(30);
  const [internalNote, setInternalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/moderation/warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUser.id,
          reason,
          description,
          points,
          durationDays,
          internalNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Verwarnen.');
      } else {
        onSuccess?.();
        onClose();
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] max-w-md w-full p-5 space-y-4 text-xs shadow-xl">
        <div className="flex items-center justify-between border-b border-[#292929] pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#F5F5F5]">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Benutzer verwarnen</span>
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#F5F5F5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2.5 bg-[#111111] border border-[#292929] rounded-[4px] text-[11px] text-[#A3A3A3]">
          Betroffener Benutzer: <strong className="text-[#8B5CF6] font-semibold">{targetUser.username}</strong>
        </div>

        {error && (
          <div className="p-2.5 bg-[#111111] border border-red-500/40 rounded-[4px] text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[#A3A3A3] mb-1 font-medium">Verwarnungsgrund</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="z. B. Beleidigung / Unangemessenes Verhalten"
              className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A3A3A3] mb-1 font-medium">Strafpunkte</label>
              <select
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value, 10))}
                className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value={1}>1 Punkt (Leichter Verstoß)</option>
                <option value={2}>2 Punkte (Mittlerer Verstoß)</option>
                <option value={3}>3 Punkte (Schwerer Verstoß)</option>
                <option value={5}>5 Punkte (Sehr schwer / Mute-Schwelle)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#A3A3A3] mb-1 font-medium">Gültigkeitsdauer</label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value={7}>7 Tage</option>
                <option value={14}>14 Tage</option>
                <option value={30}>30 Tage</option>
                <option value={90}>90 Tage</option>
                <option value={0}>Dauerhaft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#A3A3A3] mb-1 font-medium">
              Erläuterung für den Benutzer <span className="text-[#737373] text-[10px]">(Sichtbar)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Begründung für die Benachrichtigung an den Benutzer..."
              className="w-full bg-[#101010] border border-[#292929] rounded-[4px] p-2.5 text-xs text-[#F5F5F5] placeholder-[#555555] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div>
            <label className="block text-[#A3A3A3] mb-1 font-medium">
              Interne Notiz für das Team <span className="text-[#8B5CF6] text-[10px]">(Streng vertraulich)</span>
            </label>
            <textarea
              rows={2}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Nur für Administratoren & Moderatoren sichtbar..."
              className="w-full bg-[#101010] border border-[#292929] rounded-[4px] p-2.5 text-xs text-[#F5F5F5] placeholder-[#555555] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#292929]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5]"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white font-medium rounded-[4px] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{submitting ? 'Wird gespeichert...' : 'Verwarnung erteilen'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 3. BAN / MUTE USER MODAL (Sperre oder Schreibsperre verhängen)
 * ------------------------------------------------------------- */
interface BanUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: { id: string; username: string };
  defaultType?: 'BAN' | 'MUTE';
  onSuccess?: () => void;
}

export function BanUserModal({
  isOpen,
  onClose,
  targetUser,
  defaultType = 'BAN',
  onSuccess,
}: BanUserModalProps) {
  const [type, setType] = useState<'BAN' | 'MUTE'>(defaultType);
  const [reason, setReason] = useState('Schwerer Regelverstoß');
  const [durationDays, setDurationDays] = useState(7);
  const [internalNote, setInternalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/moderation/bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUser.id,
          type,
          reason,
          durationDays,
          internalNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Verhängen der Sanktion.');
      } else {
        onSuccess?.();
        onClose();
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] max-w-md w-full p-5 space-y-4 text-xs shadow-xl">
        <div className="flex items-center justify-between border-b border-[#292929] pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#F5F5F5]">
            {type === 'BAN' ? <Ban className="w-4 h-4 text-red-500" /> : <MicOff className="w-4 h-4 text-amber-500" />}
            <span>{type === 'BAN' ? 'Benutzer sperren' : 'Schreibsperre (Mute) verhängen'}</span>
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#F5F5F5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2.5 bg-[#111111] border border-[#292929] rounded-[4px] text-[11px] text-[#A3A3A3]">
          Betroffener Benutzer: <strong className="text-red-400 font-semibold">{targetUser.username}</strong>
        </div>

        {error && (
          <div className="p-2.5 bg-[#111111] border border-red-500/40 rounded-[4px] text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A3A3A3] mb-1 font-medium">Sanktionstyp</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'BAN' | 'MUTE')}
                className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="BAN">Kontosperre (Ausschluss)</option>
                <option value="MUTE">Schreibsperre (Mute)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#A3A3A3] mb-1 font-medium">Dauer</label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value={1}>1 Tag (24 Stunden)</option>
                <option value={3}>3 Tage</option>
                <option value={7}>7 Tage (1 Woche)</option>
                <option value={14}>14 Tage (2 Wochen)</option>
                <option value={30}>30 Tage (1 Monat)</option>
                <option value={0}>Permanent (Dauerhaft)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#A3A3A3] mb-1 font-medium">Offizielle Begründung</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="z. B. Wiederholtes Toxisches Verhalten / Fremdwerbung"
              className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div>
            <label className="block text-[#A3A3A3] mb-1 font-medium">
              Interne Notiz für Moderation <span className="text-[#8B5CF6] text-[10px]">(Vertraulich)</span>
            </label>
            <textarea
              rows={2}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Beweise, Ticket-Nummer oder interne Abstimmung..."
              className="w-full bg-[#101010] border border-[#292929] rounded-[4px] p-2.5 text-xs text-[#F5F5F5] placeholder-[#555555] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#292929]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5]"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-1.5 font-medium rounded-[4px] text-white transition flex items-center gap-1.5 disabled:opacity-50 ${
                type === 'BAN' ? 'bg-red-600 hover:bg-red-500' : 'bg-[#8B5CF6] hover:bg-[#A78BFA]'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{submitting ? 'Wird angewendet...' : type === 'BAN' ? 'Sperre verhängen' : 'Stummschalten'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 4. MOVE THREAD MODAL (Thema verschieben)
 * ------------------------------------------------------------- */
interface MoveThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  threadTitle: string;
  currentForumId: string;
  categories: any[];
  onSuccess?: () => void;
}

export function MoveThreadModal({
  isOpen,
  onClose,
  threadId,
  threadTitle,
  currentForumId,
  categories,
  onSuccess,
}: MoveThreadModalProps) {
  const [targetForumId, setTargetForumId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetForumId || targetForumId === currentForumId) {
      setError('Bitte wähle ein anderes Zielforum aus.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/moderation/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          action: 'MOVE',
          targetForumId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Verschieben.');
      } else {
        onSuccess?.();
        onClose();
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-[#161616] border border-[#292929] rounded-[8px] max-w-md w-full p-5 space-y-4 text-xs shadow-xl">
        <div className="flex items-center justify-between border-b border-[#292929] pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#F5F5F5]">
            <Folder className="w-4 h-4 text-[#8B5CF6]" />
            <span>Thema verschieben</span>
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#F5F5F5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2.5 bg-[#111111] border border-[#292929] rounded-[4px] text-[11px] text-[#A3A3A3] truncate">
          Thema: <strong className="text-[#F5F5F5]">{threadTitle}</strong>
        </div>

        {error && (
          <div className="p-2.5 bg-[#111111] border border-red-500/40 rounded-[4px] text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[#A3A3A3] mb-1 font-medium">Neues Zielforum</label>
            <select
              value={targetForumId}
              onChange={(e) => setTargetForumId(e.target.value)}
              className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="">-- Forum auswählen --</option>
              {categories.map((cat) => (
                <optgroup key={cat.id} label={cat.name}>
                  {cat.forums.map((f: any) => (
                    <option key={f.id} value={f.id} disabled={f.id === currentForumId}>
                      {f.name} {f.id === currentForumId ? '(Aktuell)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#292929]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5]"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting || !targetForumId}
              className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white font-medium rounded-[4px] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>{submitting ? 'Wird verschoben...' : 'Verschieben'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 6. CHANGE PREFIX MODAL (Themen-Präfix ändern)
 * ------------------------------------------------------------- */
interface ChangePrefixModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  threadTitle: string;
  currentPrefixId?: string | null;
  prefixes?: any[];
  onSuccess?: (updatedThread: any) => void;
}

export function ChangePrefixModal({
  isOpen,
  onClose,
  threadId,
  threadTitle,
  currentPrefixId,
  prefixes: initialPrefixes,
  onSuccess,
}: ChangePrefixModalProps) {
  const [prefixes, setPrefixes] = useState<any[]>(initialPrefixes || []);
  const [selectedPrefixId, setSelectedPrefixId] = useState<string>(currentPrefixId || '');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && (!initialPrefixes || initialPrefixes.length === 0)) {
      setLoading(true);
      fetch('/api/forum-meta')
        .then((res) => res.json())
        .then((data) => {
          if (data.prefixes) {
            setPrefixes(data.prefixes);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    if (currentPrefixId !== undefined) {
      setSelectedPrefixId(currentPrefixId || '');
    }
  }, [isOpen, initialPrefixes, currentPrefixId]);

  if (!isOpen) return null;

  const selectedPrefix = prefixes.find((p) => p.id === selectedPrefixId);
  const isRejectedSelected =
    selectedPrefix &&
    (selectedPrefix.name.toLowerCase() === 'abgelehnt' ||
      selectedPrefix.name.toLowerCase() === 'rejected');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/moderation/threads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          action: 'CHANGE_PREFIX',
          prefixId: selectedPrefixId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Ändern des Präfixes.');
      }

      if (onSuccess) {
        onSuccess(data.thread);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161616] border border-[#292929] rounded-[6px] p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#292929] pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#8B5CF6]" />
            <h3 className="text-sm font-bold text-[#F5F5F5]">Themen-Präfix ändern</h3>
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#F5F5F5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2.5 bg-[#111111] border border-[#292929] rounded-[4px] text-[11px] text-[#A3A3A3] truncate">
          Thema: <strong className="text-[#F5F5F5]">{threadTitle}</strong>
        </div>

        {error && (
          <div className="p-2.5 bg-[#111111] border border-red-500/40 rounded-[4px] text-xs text-red-400">
            {error}
          </div>
        )}

        {isRejectedSelected && (
          <div className="p-2.5 bg-[#111111] border border-[#EF4444]/40 rounded-[4px] text-xs text-[#EF4444] flex items-start gap-2">
            <Archive className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Achtung:</strong> Bei Auswahl von „Abgelehnt“ wird das Thema automatisch geschlossen und in das schreibgeschützte Unterforen-Archiv verschoben!
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#A3A3A3] mb-2 font-medium text-xs">
              Verfügbares Präfix auswählen
            </label>

            {loading ? (
              <div className="text-center py-4 text-xs text-[#737373]">Lade Präfixe...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedPrefixId('')}
                  className={`p-2 rounded-[4px] border text-xs font-medium text-left transition flex items-center justify-between ${
                    !selectedPrefixId
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white'
                      : 'bg-[#111111] border-[#292929] text-[#737373] hover:text-[#F5F5F5]'
                  }`}
                >
                  <span>(Kein Präfix)</span>
                  {!selectedPrefixId && <CheckCircle2 className="w-3.5 h-3.5 text-[#8B5CF6]" />}
                </button>

                {prefixes.map((p) => {
                  const isSelected = selectedPrefixId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPrefixId(p.id)}
                      className={`p-2 rounded-[4px] border text-xs font-semibold text-left transition flex items-center justify-between ${
                        isSelected
                          ? 'border-[#8B5CF6] ring-1 ring-[#8B5CF6]'
                          : 'border-[#292929] hover:border-[#525252]'
                      }`}
                      style={{
                        backgroundColor: p.bgColor || '#111111',
                        color: p.color,
                      }}
                    >
                      <span>{p.name}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#292929]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5]"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white font-medium rounded-[4px] transition flex items-center gap-1.5 disabled:opacity-50 text-xs"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{submitting ? 'Wird gespeichert...' : 'Präfix setzen'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
