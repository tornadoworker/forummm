'use client';

import React, { useEffect, useState } from 'react';
import { Server, Copy, Check, ExternalLink } from 'lucide-react';

interface ServerStatusData {
  online: boolean;
  statusText: string;
  address: string;
  players: number | null;
  maxPlayers: number | null;
}

export default function LiveServerStatusBar({ defaultAddress = 'play.vega-crimelife.de' }: { defaultAddress?: string }) {
  const [status, setStatus] = useState<ServerStatusData>({
    online: false,
    statusText: 'Lade Status...',
    address: defaultAddress,
    players: null,
    maxPlayers: null,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/server-status')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setStatus(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus({
            online: false,
            statusText: 'Status nicht verfügbar',
            address: defaultAddress,
            players: null,
            maxPlayers: null,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [defaultAddress]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`connect ${status.address}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-[#161616] border border-[#292929] rounded-[6px] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      {/* Links: Status Indikator & Serveradresse */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`w-2 h-2 rounded-full ${
              status.online ? 'bg-emerald-500' : 'bg-[#737373]'
            }`}
          />
          <span className="font-semibold text-[#F5F5F5]">
            {status.online ? 'Server Online' : status.statusText}
          </span>
        </div>

        <span className="text-[#525252] hidden sm:inline">•</span>

        <div className="flex items-center gap-1.5 text-[#A3A3A3] truncate">
          <Server className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
          <span className="font-mono text-[12px] truncate">{status.address}</span>
        </div>
      </div>

      {/* Rechts: Spielerzahl & Verbinden Action */}
      <div className="flex items-center gap-3 shrink-0">
        {status.online && status.players !== null && status.maxPlayers !== null && (
          <div className="text-[12px] text-[#A3A3A3]">
            <span className="text-[#F5F5F5] font-semibold">{status.players}</span>
            <span> / {status.maxPlayers} Spieler</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#111111] hover:bg-[#1D1D1D] text-[#F5F5F5] border border-[#292929] rounded-[4px] transition"
            title="F8-Befehl kopieren: connect play.vega-crimelife.de"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Kopiert!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#A3A3A3]" />
                <span>F8 Connect</span>
              </>
            )}
          </button>

          <a
            href={`fivem://connect/${status.address}`}
            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-medium bg-[#8B5CF6] hover:bg-[#A78BFA] text-white rounded-[4px] transition"
          >
            <span>Verbinden</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
