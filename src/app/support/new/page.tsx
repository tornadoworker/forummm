'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';

export default function NewTicketPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/support/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setCategories(data.categories);
          if (data.categories.length > 0) {
            setCategoryId(data.categories[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId || !title.trim() || !description.trim()) {
      setError('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          title,
          description,
          evidenceUrl: evidenceUrl || undefined,
          priority: 'MEDIUM',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Erstellen des Tickets.');
      } else {
        router.push(`/support/ticket/${data.ticketNumber}`);
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Zurück */}
      <Link
        href="/support"
        className="inline-flex items-center gap-1.5 text-xs text-[#999999] hover:text-[#F5F5F5] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Zurück zu den Tickets</span>
      </Link>

      <div className="bg-[#171717] border border-[#262626] rounded-[6px] p-5 space-y-4">
        <div>
          <h1 className="text-base font-bold text-[#F5F5F5]">Ticket erstellen</h1>
          <p className="text-xs text-[#999999] mt-0.5">
            Beschreibe dein Anliegen sachlich und verständlich.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#111111] border border-red-500/40 text-red-400 text-xs rounded-[6px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#999999] font-medium mb-1">Kategorie</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-[#111111] border border-[#262626] rounded-[6px] px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#999999] font-medium mb-1">Betreff</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kurzer Betreff..."
              className="w-full bg-[#111111] border border-[#262626] rounded-[6px] px-3 py-2 text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div>
            <label className="block text-[#999999] font-medium mb-1">Beschreibung</label>
            <textarea
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Genaue Beschreibung deines Problems..."
              className="w-full bg-[#111111] border border-[#262626] rounded-[6px] p-3 text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div>
            <label className="block text-[#999999] font-medium mb-1">
              Dateianhang / Beweismaterial Link (Optional)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#111111] border border-[#262626] rounded-[6px] px-3 py-2 text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#262626]">
            <Link
              href="/support"
              className="px-3 py-1.5 text-xs text-[#999999] hover:text-[#F5F5F5]"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Wird erstellt...' : 'Ticket absenden'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
