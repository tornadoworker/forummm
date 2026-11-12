'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyServerButton({ textToCopy = 'connect play.vega-crimelife.de' }: { textToCopy?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#111111] hover:bg-[#1F1F1F] text-[#F5F5F5] border border-[#262626] rounded-[4px] transition shrink-0"
      title="In Zwischenablage kopieren"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400">Kopiert!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 text-[#999999]" />
          <span>Kopieren</span>
        </>
      )}
    </button>
  );
}
