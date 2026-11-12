import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#111111] border-t border-[#292929] mt-12 text-[#A3A3A3] text-xs">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Vega Crimelife Logo"
              className="h-7 w-auto object-contain shrink-0"
            />
            <span className="font-bold text-[#F5F5F5]">Vega Crimelife</span>
            <span className="text-[12px] text-[#A3A3A3]">– GTA V FiveM Community Plattform</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-[12px]">
            <Link href="/forum" className="hover:text-[#F5F5F5] transition">
              Forum
            </Link>
            <Link href="/stats" className="hover:text-[#F5F5F5] transition">
              Live-Statistik
            </Link>
            <Link href="/competitions" className="hover:text-[#F5F5F5] transition">
              Wettbewerbe
            </Link>
            <Link href="/rules" className="hover:text-[#F5F5F5] transition">
              Regelwerk
            </Link>
            <Link href="/support" className="hover:text-[#F5F5F5] transition">
              Support
            </Link>
            <Link href="/members" className="hover:text-[#F5F5F5] transition">
              Mitglieder
            </Link>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#292929] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#737373] gap-2">
          <p>© {new Date().getFullYear()} Vega Crimelife. Alle Rechte vorbehalten.</p>
          <p>Community Forum Software</p>
        </div>
      </div>
    </footer>
  );
}
