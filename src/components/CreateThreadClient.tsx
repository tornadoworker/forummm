'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PostRenderer from '@/components/PostRenderer';
import {
  ArrowLeft,
  Send,
  Plus,
  Trash2,
  AlertCircle,
  BarChart2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Image as ImageIcon,
  Paperclip,
  Undo2,
  Redo2,
  Eye,
  Edit3,
  Clock,
  CheckCircle2,
  ChevronRight,
  UploadCloud,
  X,
  Lock,
  Layers,
  Sparkles,
  HelpCircle,
  FileCode
} from 'lucide-react';
import { bbcodeToMarkdown, markdownToBBCode } from '@/lib/bbcode';
import VegaCaptcha from '@/components/VegaCaptcha';

interface Category {
  id: string;
  name: string;
  forums: Forum[];
}

interface Forum {
  id: string;
  categoryId: string;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  name: string;
  description?: string | null;
  isStaffOnly: boolean;
  minRoleToPost: number;
  isArchived?: boolean;
}

interface ThreadPrefix {
  id: string;
  name: string;
  color: string;
  bgColor: string;
}

interface AttachmentItem {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

interface CreateThreadClientProps {
  categories: Category[];
  prefixes: ThreadPrefix[];
  currentUser: any;
  initialForumId?: string;
}

export default function CreateThreadClient({
  categories,
  prefixes,
  currentUser,
  initialForumId,
}: CreateThreadClientProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Foren filtern nach Berechtigung & Archiv-Schutz
  const permittedCategories = categories
    .map((cat) => ({
      ...cat,
      forums: cat.forums.filter((f) => {
        // Schreibgeschützte Archive niemals zur Erstellung anbieten
        if (f.isArchived || f.name.toLowerCase() === 'archiv') {
          return false;
        }
        if (f.isStaffOnly && !currentUser?.role?.canAccessAdmin && (currentUser?.role?.priority || 0) < 50) {
          return false;
        }
        if ((currentUser?.role?.priority || 0) < f.minRoleToPost) {
          return false;
        }
        return true;
      }),
    }))
    .filter((cat) => cat.forums.length > 0);

  // Standard-Forum ermitteln
  const defaultForum =
    permittedCategories
      .flatMap((c) => c.forums)
      .find((f) => f.id === initialForumId) ||
    permittedCategories[0]?.forums[0];

  const [forumId, setForumId] = useState(defaultForum?.id || '');
  const [prefixId, setPrefixId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Undo/Redo Historie
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Anhänge
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Umfrage
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isMultiChoice, setIsMultiChoice] = useState(false);
  const [pollDurationDays, setPollDurationDays] = useState('0'); // 0 = unbegrenzt

  // Vorschau Modus & BB-Code Quelltext Modus
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isBBCodeMode, setIsBBCodeMode] = useState(false);

  // Hauseigenes CAPTCHA (bei auffälliger Aktivität / Spam)
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaChallengeId, setCaptchaChallengeId] = useState('');
  const [captchaResponse, setCaptchaResponse] = useState('');

  // Verlustfreier Wechsel zwischen BB-Code und visueller Formatierung
  const toggleBBCodeMode = () => {
    if (!isBBCodeMode) {
      const rawBB = markdownToBBCode(content);
      setContent(rawBB);
      setIsBBCodeMode(true);
    } else {
      const visualText = bbcodeToMarkdown(content);
      setContent(visualText);
      setIsBBCodeMode(false);
    }
  };

  // Link-Eingabe Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Entwurfsverwaltung
  const [draftBanner, setDraftBanner] = useState<{ timestamp: string; data: any } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Submit & Fehler
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftKey = `cln_draft_thread_${currentUser?.id || 'guest'}`;

  // 1. Gespeicherten Entwurf prüfen
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.content) {
          setDraftBanner({
            timestamp: new Date(parsed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            data: parsed,
          });
        }
      }
    } catch {}
  }, [draftKey]);

  // 2. Automatisches Speichern (alle 4 Sekunden bei Änderungen)
  useEffect(() => {
    if (!isDirty || (!title.trim() && !content.trim())) return;

    const timer = setTimeout(() => {
      try {
        const payload = {
          forumId,
          prefixId,
          title,
          content,
          showPoll,
          pollQuestion,
          pollOptions,
          isMultiChoice,
          pollDurationDays,
          attachments,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setIsDirty(false);
      } catch {}
    }, 4000);

    return () => clearTimeout(timer);
  }, [title, content, forumId, prefixId, showPoll, pollQuestion, pollOptions, isMultiChoice, pollDurationDays, attachments, isDirty, draftKey]);

  // 3. Schutz vor unbeabsichtigtem Verlassen der Seite
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && (title.trim() || content.trim()) && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, title, content, isSubmitting]);

  // Entwurf manuell speichern
  const handleSaveDraft = () => {
    try {
      const payload = {
        forumId,
        prefixId,
        title,
        content,
        showPoll,
        pollQuestion,
        pollOptions,
        isMultiChoice,
        pollDurationDays,
        attachments,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setIsDirty(false);
    } catch {}
  };

  // Entwurf laden
  const handleRestoreDraft = () => {
    if (!draftBanner) return;
    const d = draftBanner.data;
    if (d.forumId) setForumId(d.forumId);
    if (d.prefixId) setPrefixId(d.prefixId);
    if (d.title) setTitle(d.title);
    if (d.content) {
      setContent(d.content);
      setHistory([d.content]);
      setHistoryIndex(0);
    }
    if (d.showPoll !== undefined) setShowPoll(d.showPoll);
    if (d.pollQuestion) setPollQuestion(d.pollQuestion);
    if (d.pollOptions) setPollOptions(d.pollOptions);
    if (d.isMultiChoice !== undefined) setIsMultiChoice(d.isMultiChoice);
    if (d.pollDurationDays) setPollDurationDays(d.pollDurationDays);
    if (d.attachments) setAttachments(d.attachments);
    setDraftBanner(null);
  };

  // Entwurf verwerfen
  const handleDiscardDraft = () => {
    localStorage.removeItem(draftKey);
    setDraftBanner(null);
  };

  // Content Änderung mit History Stack
  const updateContentWithHistory = useCallback((newText: string) => {
    setContent(newText);
    setIsDirty(true);
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, newText];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevText = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setContent(prevText);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextText = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setContent(nextText);
    }
  };

  // Hilfsfunktion: Formatierung im Textarea einfügen / umhüllen
  const applyFormat = (prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${placeholder}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    updateContentWithHistory(newContent);

    // Cursor positionieren
    setTimeout(() => {
      textarea.focus();
      if (!selectedText && placeholder) {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
      } else {
        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
      }
    }, 10);
  };

  // Zeilenpräfix einfügen (für Überschriften, Listen, Zitate)
  const applyLinePrefix = (linePrefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || 'Inhalt hier';

    const formatted = selectedText
      .split('\n')
      .map((line) => `${linePrefix}${line}`)
      .join('\n');

    const newContent = content.substring(0, start) + formatted + content.substring(end);
    updateContentWithHistory(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formatted.length, start + formatted.length);
    }, 10);
  };

  // Keyboard Shortcuts im Textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyFormat('**', '**', 'Fetter Text');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyFormat('*', '*', 'Kursiver Text');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        applyFormat('<u>', '</u>', 'Unterstrichener Text');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (textarea) {
          const selected = content.substring(textarea.selectionStart, textarea.selectionEnd);
          setLinkText(selected || 'Link-Text');
        }
        setShowLinkModal(true);
      } else if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleRedo();
      }
    }
  };

  // Link einfügen aus Modal
  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    const finalUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') || linkUrl.startsWith('/')
      ? linkUrl.trim()
      : `https://${linkUrl.trim()}`;
    const formatted = `[${linkText.trim() || 'Link'}](${finalUrl})`;
    applyFormat('', '', formatted);
    setShowLinkModal(false);
    setLinkText('');
    setLinkUrl('');
  };

  // Dateiupload ausführen
  const uploadFile = async (file: File) => {
    if (!file) return;

    // Client-side Validierung
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimes.includes(file.type)) {
      setError('Erlaubt sind ausschließlich Bilddateien im Format JPG, PNG, WebP oder GIF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Die Datei überschreitet die maximale Dateigröße von 10 MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/forum/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Hochladen.');
      } else {
        const newAttachment: AttachmentItem = {
          id: Math.random().toString(),
          url: data.url,
          name: data.fileName || file.name,
          size: data.fileSize || file.size,
          type: data.mimeType || file.type,
        };
        setAttachments((prev) => [...prev, newAttachment]);

        // Direkt als Markdown-Bild in den Beitrag einbetten
        const imgMarkdown = `\n![${newAttachment.name}](${newAttachment.url})\n`;
        updateContentWithHistory(content + imgMarkdown);
      }
    } catch {
      setError('Netzwerkfehler beim Hochladen des Anhangs.');
    } finally {
      setIsUploading(false);
    }
  };

  // Drag & Drop Handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  // Paste Handler (Screenshot aus Zwischenablage mit Strg+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            uploadFile(file);
            break;
          }
        }
      }
    }
  };

  // Anhang entfernen
  const handleRemoveAttachment = (id: string, url: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    // Bild-Markdown aus Text entfernen
    setContent((prev) => prev.replace(new RegExp(`!\\[.*?\\]\\(${url}\\)`, 'g'), ''));
  };

  // Anhang manuell in Beitrag einfügen
  const handleInsertAttachment = (attachment: AttachmentItem) => {
    applyFormat(`\n![${attachment.name}](${attachment.url})\n`, '', '');
  };

  // Umfrage Optionen verwalten
  const addPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const updatePollOption = (idx: number, val: string) => {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
    setIsDirty(true);
  };

  // Aktuell ausgewähltes Forum & Präfix
  const currentForum = permittedCategories
    .flatMap((c) => c.forums)
    .find((f) => f.id === forumId);
  const currentCategory = permittedCategories.find((c) =>
    c.forums.some((f) => f.id === forumId)
  );
  const selectedPrefix = prefixes.find((p) => p.id === prefixId);

  // Thema einreichen
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!forumId) {
      setError('Bitte wähle ein Zielforum aus.');
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      setError('Der Thementitel muss mindestens 3 Zeichen lang sein.');
      return;
    }

    if (title.trim().length > 120) {
      setError('Der Thementitel darf maximal 120 Zeichen lang sein.');
      return;
    }

    if (!content.trim() || content.trim().length < 10) {
      setError('Der Beitragsinhalt muss mindestens 10 Zeichen lang sein.');
      return;
    }

    if (showPoll) {
      if (!pollQuestion.trim()) {
        setError('Bitte gib eine Frage für die Umfrage ein.');
        return;
      }
      const validOptions = pollOptions.filter((o) => o.trim().length > 0);
      if (validOptions.length < 2) {
        setError('Eine Umfrage benötigt mindestens 2 gültige Antwortmöglichkeiten.');
        return;
      }
    }

    if (requiresCaptcha && !captchaResponse.trim()) {
      setError('Bitte löse das Sicherheits-CAPTCHA.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forumId,
          prefixId: prefixId || null,
          title: title.trim(),
          content: content.trim(),
          pollQuestion: showPoll ? pollQuestion.trim() : undefined,
          pollOptions: showPoll ? pollOptions.filter((o) => o.trim()) : undefined,
          isMultiChoice: showPoll ? isMultiChoice : false,
          pollDurationDays: showPoll ? pollDurationDays : '0',
          captchaChallengeId: requiresCaptcha ? captchaChallengeId : undefined,
          captchaResponse: requiresCaptcha ? captchaResponse.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Erstellen des Themas.');
        if (data.requiresCaptcha) {
          setRequiresCaptcha(true);
        }
        setIsSubmitting(false);
      } else {
        // Entwurf löschen nach Erfolg
        localStorage.removeItem(draftKey);
        router.push(`/forum/thread/${data.threadId}`);
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen. Bitte versuche es erneut.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto space-y-4">
      {/* 1. Breadcrumb-Navigation */}
      <div className="flex items-center gap-1.5 text-xs text-[#A3A3A3] flex-wrap">
        <Link href="/" className="hover:text-[#F5F5F5] transition">
          Startseite
        </Link>
        <ChevronRight className="w-3 h-3 text-[#525252]" />
        <Link href="/forum" className="hover:text-[#F5F5F5] transition">
          Forenkanäle
        </Link>
        {currentForum && (
          <>
            <ChevronRight className="w-3 h-3 text-[#525252]" />
            <Link href={`/forum/${currentForum.id}`} className="hover:text-[#F5F5F5] transition">
              {currentForum.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 text-[#525252]" />
        <span className="text-[#8B5CF6] font-medium">Neues Thema erstellen</span>
      </div>

      {/* 2. Kopfbereich */}
      <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#F5F5F5]">Neues Thema erstellen</h1>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            {currentCategory ? (
              <span>
                Kategorie:{' '}
                <strong className="text-[#F5F5F5] font-medium">{currentCategory.name}</strong> ›{' '}
                <strong className="text-[#8B5CF6] font-medium">{currentForum?.name}</strong>
              </span>
            ) : (
              'Verfasse einen neuen Beitrag in der Vega Crimelife Community.'
            )}
          </p>
        </div>

        {/* Schnell-Zurück Link */}
        <Link
          href={currentForum ? `/forum/${currentForum.id}` : '/forum'}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] transition px-3 py-1.5 rounded-[4px] bg-[#111111] border border-[#292929]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Zurück zur Übersicht</span>
        </Link>
      </div>

      {/* 3. Entwurf-Wiederherstellen Benachrichtigung */}
      {draftBanner && (
        <div className="p-3 bg-[#161616] border border-[#8B5CF6]/50 rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8B5CF6] shrink-0" />
            <span className="text-[#F5F5F5]">
              Es wurde ein gespeicherter Entwurf von{' '}
              <strong className="text-[#8B5CF6]">{draftBanner.timestamp} Uhr</strong> gefunden.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-2.5 py-1 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white font-medium rounded-[4px] transition text-xs"
            >
              Entwurf wiederherstellen
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-2.5 py-1 text-[#A3A3A3] hover:text-red-400 font-medium rounded-[4px] transition text-xs"
            >
              Verwerfen
            </button>
          </div>
        </div>
      )}

      {/* 4. Fehlermeldung */}
      {error && (
        <div className="p-3 bg-[#161616] border border-red-500/50 rounded-[6px] text-xs text-red-400 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 5. Hauptformular */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Forum & Präfix Auswahl */}
        <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Forum Dropdown */}
            <div className="md:col-span-8 space-y-1.5">
              <label className="block text-xs font-medium text-[#F5F5F5]">
                Forum <span className="text-red-400">*</span>
              </label>
              <select
                value={forumId}
                onChange={(e) => {
                  setForumId(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] transition"
              >
                {permittedCategories.map((cat) => {
                  const mainForums = cat.forums.filter((f) => !f.parentId);
                  const subForums = cat.forums.filter((f) => Boolean(f.parentId));

                  return (
                    <optgroup key={cat.id} label={cat.name}>
                      {mainForums.map((mf) => {
                        const directSubs = subForums.filter((s) => s.parentId === mf.id);
                        return (
                          <React.Fragment key={mf.id}>
                            <option value={mf.id}>
                              {directSubs.length > 0 ? `${mf.name} (Hauptkanal)` : mf.name}
                            </option>
                            {directSubs.map((sf) => (
                              <option key={sf.id} value={sf.id}>
                                &nbsp;&nbsp;&nbsp;&nbsp;↳ {sf.name}
                              </option>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Präfix Dropdown */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-xs font-medium text-[#F5F5F5]">
                Präfix <span className="text-[#737373] text-[11px]">(Optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={prefixId}
                  onChange={(e) => {
                    setPrefixId(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] transition"
                >
                  <option value="">Kein Präfix</option>
                  {prefixes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {selectedPrefix && (
                  <span
                    className="px-2 py-1 rounded-[4px] text-[11px] font-semibold uppercase tracking-wider shrink-0 border border-[#292929]"
                    style={{
                      color: selectedPrefix.color || '#8B5CF6',
                      backgroundColor: selectedPrefix.bgColor || '#111111',
                    }}
                  >
                    {selectedPrefix.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Thementitel */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[#F5F5F5]">
                Thementitel <span className="text-red-400">*</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  title.length > 120 ? 'text-red-400 font-bold' : 'text-[#737373]'
                }`}
              >
                {title.length} / 120 Zeichen
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Aussagekräftigen Thementitel eingeben..."
              className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3.5 py-2.5 text-xs text-[#F5F5F5] placeholder-[#555555] focus:outline-none focus:border-[#8B5CF6] transition"
            />
          </div>
        </div>

        {/* 6. Professioneller Rich-Text-Editor Container */}
        <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden">
          {/* Editor Kopfzeile mit Modi: Editor vs Vorschau */}
          <div className="bg-[#111111] px-4 py-2 border-b border-[#292929] flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Beitrag verfassen</span>
            </span>

            {/* Tabs: Bearbeiten vs Vorschau */}
            <div className="flex items-center gap-1 bg-[#161616] p-0.5 rounded-[4px] border border-[#292929]">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-[3px] text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'editor'
                    ? 'bg-[#8B5CF6] text-white shadow-sm'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-[3px] text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-[#8B5CF6] text-white shadow-sm'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Vorschau</span>
              </button>
            </div>
          </div>

          {activeTab === 'editor' ? (
            <div>
              {/* Toolbar */}
              <div className="bg-[#141414] px-3 py-2 border-b border-[#292929] flex items-center gap-1 flex-wrap text-xs">
                {/* Undo / Redo */}
                <button
                  type="button"
                  title="Rückgängig (Strg+Z)"
                  onClick={handleUndo}
                  disabled={historyIndex === 0}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] disabled:opacity-30 disabled:hover:bg-transparent transition"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Wiederholen (Strg+Y)"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] disabled:opacity-30 disabled:hover:bg-transparent transition"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-[#292929] mx-1" />

                {/* Text Formatting */}
                {/* Text Formatting */}
                <button
                  type="button"
                  title="Fett (Strg+B)"
                  onClick={() => isBBCodeMode ? applyFormat('[b]', '[/b]', 'Fetter Text') : applyFormat('**', '**', 'Fetter Text')}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Kursiv (Strg+I)"
                  onClick={() => isBBCodeMode ? applyFormat('[i]', '[/i]', 'Kursiver Text') : applyFormat('*', '*', 'Kursiver Text')}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Unterstrichen (Strg+U)"
                  onClick={() => isBBCodeMode ? applyFormat('[u]', '[/u]', 'Unterstrichen') : applyFormat('<u>', '</u>', 'Unterstrichen')}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Durchgestrichen"
                  onClick={() => isBBCodeMode ? applyFormat('[s]', '[/s]', 'Durchgestrichen') : applyFormat('~~', '~~', 'Durchgestrichen')}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-[#292929] mx-1" />

                {/* Blocks */}
                <button
                  type="button"
                  title="Überschrift"
                  onClick={() => isBBCodeMode ? applyFormat('[h2]', '[/h2]', 'Überschrift') : applyLinePrefix('## ')}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Aufzählung"
                  onClick={() => isBBCodeMode ? applyFormat('[list]\n[*]', '\n[/list]', 'Listenpunkt') : applyLinePrefix('- ')}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Nummerierte Liste"
                  onClick={() => applyLinePrefix('1. ')}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Zitat"
                  onClick={() => isBBCodeMode ? applyFormat('[quote]\n', '\n[/quote]', 'Zitat hier') : applyLinePrefix('> ')}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Codeblock"
                  onClick={() => isBBCodeMode ? applyFormat('[code]\n', '\n[/code]', 'Code hier') : applyFormat('```\n', '\n```', 'Code hier')}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-[#292929] mx-1" />

                {/* Links & Attachments */}
                <button
                  type="button"
                  title="Link einfügen (Strg+K)"
                  onClick={() => setShowLinkModal(true)}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Bild hochladen"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition flex items-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Datei anhängen"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-[4px] text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#202020] transition flex items-center gap-1 cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>

                {/* BB-CODE ANZEIGEN TOGGLE BUTTON */}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleBBCodeMode}
                    className={`h-7 px-2.5 rounded-[4px] text-xs font-medium transition flex items-center gap-1.5 border cursor-pointer ${
                      isBBCodeMode
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-sm'
                        : 'bg-[#101010] text-[#A3A3A3] hover:text-[#F5F5F5] border-[#292929] hover:bg-[#1D1D1D]'
                    }`}
                    title="Zwischen visuellem Editor und rohem BB-Code wechseln"
                  >
                    <FileCode className={`w-3.5 h-3.5 ${isBBCodeMode ? 'text-white' : 'text-[#8B5CF6]'}`} />
                    <span>{isBBCodeMode ? 'BB-Code aktiv' : 'BB-Code anzeigen'}</span>
                  </button>
                </div>

                {/* Upload Status Indikator */}
                {isUploading && (
                  <span className="text-[11px] text-[#8B5CF6] flex items-center gap-1.5 animate-pulse">
                    <UploadCloud className="w-3.5 h-3.5 animate-bounce" />
                    <span>Lade Bild hoch...</span>
                  </span>
                )}
              </div>

              {/* Textarea Bereich mit Drag & Drop */}
              <div
                className="relative"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
              >
                <textarea
                  ref={textareaRef}
                  required
                  rows={14}
                  value={content}
                  onChange={(e) => updateContentWithHistory(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={
                    isBBCodeMode
                      ? 'BB-Code Quelltext eingeben... z. B. [b]Fetter Text[/b], [quote]Zitat[/quote], [code]Code[/code], [url=https://...]Link[/url]'
                      : 'Verfasse deinen Beitrag... (Formatierungen über die Toolbar, Shortcuts wie Strg+B, Bilder per Drag & Drop oder Strg+V einfügen)'
                  }
                  className={`w-full p-4 text-xs text-[#F5F5F5] placeholder-[#555555] focus:outline-none min-h-[320px] leading-relaxed resize-y border-none ${
                    isBBCodeMode ? 'bg-[#0c0c0c] font-mono text-[12px]' : 'bg-[#101010] font-sans'
                  }`}
                ></textarea>

                {/* Drag-Over Overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 bg-[#090909]/90 border-2 border-dashed border-[#8B5CF6] rounded-[4px] flex flex-col items-center justify-center gap-2 pointer-events-none z-10">
                    <UploadCloud className="w-8 h-8 text-[#8B5CF6]" />
                    <span className="text-xs font-semibold text-[#F5F5F5]">
                      Bild hier ablegen, um es hochzuladen
                    </span>
                  </div>
                )}
              </div>

              {/* Versteckter File-Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    uploadFile(e.target.files[0]);
                  }
                }}
              />

              {/* Anhänge Liste & Dropzone */}
              <div className="p-3.5 bg-[#121212] border-t border-[#292929] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
                  <span className="font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Dateianhänge ({attachments.length})</span>
                  </span>
                  <span className="text-[11px] text-[#737373]">
                    JPG, PNG, WebP, GIF bis 10 MB
                  </span>
                </div>

                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-2 bg-[#171717] border border-[#292929] rounded-[4px] flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img
                            src={att.url}
                            alt=""
                            className="w-8 h-8 rounded-[3px] object-cover border border-[#292929] shrink-0"
                          />
                          <div className="truncate">
                            <span className="block text-[#F5F5F5] truncate text-[11px] font-medium">
                              {att.name}
                            </span>
                            <span className="text-[10px] text-[#737373]">
                              {(att.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title="In Beitrag einfügen"
                            onClick={() => handleInsertAttachment(att)}
                            className="p-1 text-[#A3A3A3] hover:text-[#8B5CF6] transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Entfernen"
                            onClick={() => handleRemoveAttachment(att.id, att.url)}
                            className="p-1 text-[#A3A3A3] hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 7. Echte Vorschau (Identisch zur XenForo Beitragsansicht) */
            <div className="p-5 space-y-4 bg-[#101010]">
              {/* Thread Header Vorschau */}
              <div className="pb-3 border-b border-[#292929] space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedPrefix && (
                    <span
                      className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border border-[#292929]"
                      style={{
                        color: selectedPrefix.color || '#8B5CF6',
                        backgroundColor: selectedPrefix.bgColor || '#111111',
                      }}
                    >
                      {selectedPrefix.name}
                    </span>
                  )}
                  <h2 className="text-base font-bold text-[#F5F5F5]">
                    {title || 'Titel deines neuen Themas...'}
                  </h2>
                </div>
                <div className="text-[11px] text-[#737373] flex items-center gap-2">
                  <span>Forum: {currentForum?.name}</span>
                  <span>•</span>
                  <span>Vorschau-Modus</span>
                </div>
              </div>

              {/* Umfrage Vorschau (falls aktiv) */}
              {showPoll && pollQuestion.trim() && (
                <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F5F5F5] uppercase border-b border-[#292929] pb-2">
                    <BarChart2 className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Umfrage: {pollQuestion}</span>
                    {isMultiChoice && (
                      <span className="text-[10px] font-normal text-[#8B5CF6] normal-case ml-2">
                        (Mehrfachauswahl erlaubt)
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-xs">
                    {pollOptions
                      .filter((o) => o.trim())
                      .map((opt, oIdx) => (
                        <div key={oIdx} className="p-2 bg-[#111111] border border-[#292929] rounded-[4px] flex items-center justify-between">
                          <span className="text-[#E5E5E5] flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full border border-[#525252] inline-block" />
                            {opt}
                          </span>
                          <span className="text-[11px] text-[#737373]">0 Stimmen (0%)</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* XenForo Post Card */}
              <div className="bg-[#161616] border border-[#292929] rounded-[6px] overflow-hidden flex flex-col md:flex-row text-xs">
                {/* Benutzerbox links */}
                <div className="w-full md:w-44 bg-[#111111] p-4 border-b md:border-b-0 md:border-r border-[#292929] flex md:flex-col items-center text-center gap-2.5 shrink-0">
                  <img
                    src={
                      currentUser?.avatarUrl ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={currentUser?.username}
                    className="w-12 h-12 rounded-[6px] object-cover border border-[#292929]"
                  />
                  <div className="space-y-0.5 text-left md:text-center">
                    <span className="font-semibold text-xs text-[#F5F5F5] block">
                      {currentUser?.username}
                    </span>
                    <span className="inline-block text-[10px] font-medium text-[#8B5CF6]">
                      {currentUser?.role?.displayName || 'Mitglied'}
                    </span>
                    <div className="text-[10px] text-[#666666] pt-1 hidden md:block">
                      <span>Autor des Themas</span>
                    </div>
                  </div>
                </div>

                {/* Beitragsinhalt rechts mit PostRenderer */}
                <div className="flex-1 p-5 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-[#737373] border-b border-[#292929] pb-2">
                    <span>Heute um {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                    <span className="text-[#8B5CF6] font-bold">#1</span>
                  </div>

                  {/* Hier wird der Text über den PostRenderer gerendert */}
                  <PostRenderer
                    content={content || '*Kein Text eingegeben. Wechsle zurück in den Editor, um deinen Beitrag zu schreiben.*'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 8. Umfrage Sektion (Aufklappbar) */}
        <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              setShowPoll(!showPoll);
              setIsDirty(true);
            }}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#F5F5F5] hover:text-[#8B5CF6] transition"
          >
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#8B5CF6]" />
              <span>Umfrage zu diesem Thema hinzufügen</span>
            </div>
            <span className="text-xs text-[#8B5CF6]">
              {showPoll ? 'Umfrage entfernen' : '+ Umfrage aktivieren'}
            </span>
          </button>

          {showPoll && (
            <div className="pt-3 border-t border-[#292929] space-y-3.5 animate-in fade-in">
              {/* Umfragefrage */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#F5F5F5]">
                  Umfragefrage <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => {
                    setPollQuestion(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="z. B. Welche Fraktion interessiert dich am meisten?"
                  className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-2 text-xs text-[#F5F5F5] placeholder-[#555555] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Antwortmöglichkeiten */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#F5F5F5]">
                  Antwortmöglichkeiten (mindestens 2)
                </label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#737373] w-5 text-right">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updatePollOption(idx, e.target.value)}
                      placeholder={`Antwortmöglichkeit ${idx + 1}`}
                      className="flex-1 bg-[#101010] border border-[#292929] rounded-[4px] px-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#555555] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(idx)}
                        className="p-1.5 text-[#737373] hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {pollOptions.length < 10 && (
                  <button
                    type="button"
                    onClick={addPollOption}
                    className="text-xs text-[#8B5CF6] hover:text-[#A78BFA] transition inline-flex items-center gap-1.5 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Option hinzufügen</span>
                  </button>
                )}
              </div>

              {/* Einstellungen zur Umfrage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#292929]">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#F5F5F5]">
                  <input
                    type="checkbox"
                    checked={isMultiChoice}
                    onChange={(e) => {
                      setIsMultiChoice(e.target.checked);
                      setIsDirty(true);
                    }}
                    className="accent-[#8B5CF6] rounded"
                  />
                  <span>Mehrfachauswahl erlauben</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#A3A3A3] shrink-0">Laufzeit:</span>
                  <select
                    value={pollDurationDays}
                    onChange={(e) => {
                      setPollDurationDays(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-2.5 py-1 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="0">Unbegrenzt</option>
                    <option value="1">1 Tag</option>
                    <option value="3">3 Tage</option>
                    <option value="7">7 Tage (1 Woche)</option>
                    <option value="14">14 Tage (2 Wochen)</option>
                    <option value="30">30 Tage (1 Monat)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 9. Aktionsleiste */}
        <div className="bg-[#161616] border border-[#292929] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Links: Entwurf speichern & Vorschau */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] px-2.5 py-1.5 rounded-[4px] bg-[#111111] border border-[#292929] transition"
            >
              <Clock className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Entwurf speichern</span>
            </button>

            {lastSavedAt && (
              <span className="text-[11px] text-[#737373] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>Gespeichert ({lastSavedAt})</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'editor' ? 'preview' : 'editor')}
              className="inline-flex items-center gap-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] px-2.5 py-1.5 rounded-[4px] bg-[#111111] border border-[#292929] transition"
            >
              <Eye className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>{activeTab === 'editor' ? 'Vorschau anzeigen' : 'Zurück zum Editor'}</span>
            </button>
          </div>

          {/* Hauseigenes CAPTCHA bei auffälliger Aktivität */}
          {requiresCaptcha && (
            <div className="w-full">
              <VegaCaptcha
                action="CREATE_THREAD"
                value={captchaResponse}
                onChange={setCaptchaResponse}
                onChallengeChange={setCaptchaChallengeId}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Rechts: Abbrechen & Thema erstellen */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              href={currentForum ? `/forum/${currentForum.id}` : '/forum'}
              className="px-4 py-2 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] transition"
            >
              Abbrechen
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim() || (requiresCaptcha && !captchaResponse.trim())}
              className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-semibold rounded-[4px] transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Wird veröffentlicht...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Thema erstellen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Modal: Link einfügen */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#161616] border border-[#292929] rounded-[6px] max-w-sm w-full p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-[#292929] pb-2">
              <span className="font-bold text-[#F5F5F5] flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#8B5CF6]" />
                <span>Link einfügen</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-[#737373] hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] text-[#A3A3A3] mb-1">Link-Text</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="z. B. Vega Crimelife Regelwerk"
                  className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#A3A3A3] mb-1">Webadresse (URL)</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#101010] border border-[#292929] rounded-[4px] px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#292929]">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="px-3.5 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[4px] disabled:opacity-50 transition"
              >
                Einfügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
