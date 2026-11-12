'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Mail,
  Bookmark,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Menu,
  X,
  ShieldAlert,
  MessageSquare,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface NavbarProps {
  currentUser?: {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    role: {
      name: string;
      displayName: string;
      color: string;
      canAccessAdmin: boolean;
    };
  } | null;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
}

export default function Navbar({
  currentUser,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [liveResults, setLiveResults] = useState<{ threads: any[]; users: any[]; forums: any[] }>({
    threads: [],
    users: [],
    forums: [],
  });
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const close = () => setUserDropdownOpen(false);
    if (userDropdownOpen) {
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
  }, [userDropdownOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || !searchOpen) {
      setLiveResults({ threads: [], users: [], forums: [] });
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setLiveResults({
            threads: (data.threads || []).slice(0, 5),
            users: (data.users || []).slice(0, 4),
            forums: (data.forums || []).slice(0, 3),
          });
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, searchOpen]);

  const navLinks = [
    { href: '/', label: 'Startseite' },
    { href: '/forum', label: 'Forum' },
    { href: '/members', label: 'Mitglieder' },
    { href: '/rules', label: 'Regelwerk' },
    { href: '/support', label: 'Support' },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#111111] border-b border-[#292929]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8 h-full">
            <NextLink href="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="Vega Crimelife Logo"
                className="h-9 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              <span className="font-extrabold text-[15px] tracking-wide text-[#F5F5F5] uppercase">
                Vega <span className="text-[#8B5CF6]">Crimelife</span>
              </span>
            </NextLink>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 h-full">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
                return (
                  <NextLink
                    key={link.href}
                    href={link.href}
                    className={`h-full flex items-center px-3 text-[13px] font-medium transition border-b-2 ${
                      isActive
                        ? 'text-[#F5F5F5] border-[#8B5CF6]'
                        : 'text-[#A3A3A3] hover:text-[#F5F5F5] border-transparent'
                    }`}
                  >
                    {link.label}
                  </NextLink>
                );
              })}
            </nav>
          </div>

          {/* Rechte Aktionen */}
          <div className="flex items-center gap-2">
            {/* Suche Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D] rounded-[6px] transition"
              title="Suche"
            >
              <Search className="w-4 h-4" />
            </button>

            {currentUser ? (
              <>
                {/* Benachrichtigungen */}
                <NextLink
                  href="/notifications"
                  className="p-2 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D] rounded-[6px] transition relative"
                  title="Benachrichtigungen"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#8B5CF6] rounded-full"></span>
                  )}
                </NextLink>

                {/* Private Nachrichten */}
                <NextLink
                  href="/messages"
                  className="p-2 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D] rounded-[6px] transition relative hidden sm:flex"
                  title="Private Nachrichten"
                >
                  <Mail className="w-4 h-4" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#8B5CF6] rounded-full"></span>
                  )}
                </NextLink>

                {/* Profil Dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserDropdownOpen(!userDropdownOpen);
                    }}
                    className="flex items-center gap-2 p-1.5 pl-2.5 bg-[#161616] hover:bg-[#1D1D1D] border border-[#292929] rounded-[6px] transition"
                  >
                    <img
                      src={
                        currentUser.avatarUrl ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                      }
                      alt={currentUser.username}
                      className="w-6 h-6 rounded-[4px] object-cover border border-[#292929]"
                    />
                    <span className="text-xs font-medium text-[#F5F5F5] hidden sm:inline">
                      {currentUser.username}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A3A3A3]" />
                  </button>

                  {userDropdownOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 mt-2 w-52 bg-[#161616] border border-[#292929] rounded-[6px] shadow-xl py-1 z-50 text-xs"
                    >
                      <div className="px-3.5 py-2 border-b border-[#292929]">
                        <p className="text-[11px] text-[#A3A3A3]">Angemeldet als</p>
                        <p className="font-semibold text-[#F5F5F5] truncate">
                          {currentUser.username}
                        </p>
                        <span className="text-[10px] text-[#8B5CF6] font-medium block mt-0.5">
                          {currentUser.role.displayName}
                        </span>
                      </div>

                      <NextLink
                        href={`/user/${currentUser.username}`}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D]"
                      >
                        <User className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        <span>Profil ansehen</span>
                      </NextLink>

                      <NextLink
                        href="/bookmarks"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D]"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-[#A3A3A3]" />
                        <span>Gespeicherte Themen</span>
                      </NextLink>

                      <NextLink
                        href="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1D1D1D]"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#A3A3A3]" />
                        <span>Einstellungen</span>
                      </NextLink>

                      {currentUser.role.canAccessAdmin && (
                        <NextLink
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3.5 py-2 text-[#8B5CF6] hover:text-[#A78BFA] hover:bg-[#1D1D1D] font-medium border-t border-[#292929]"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Admin Control Panel</span>
                        </NextLink>
                      )}

                      <div className="border-t border-[#292929] mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3.5 py-1.5 text-[#A3A3A3] hover:text-red-400 hover:bg-[#1D1D1D] text-left"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Abmelden</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <NextLink
                  href="/login"
                  className="px-3.5 py-1.5 text-xs font-medium text-[#F5F5F5] bg-[#161616] hover:bg-[#1D1D1D] border border-[#292929] rounded-[6px] transition"
                >
                  Anmelden
                </NextLink>
                <NextLink
                  href="/register"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#8B5CF6] hover:bg-[#A78BFA] rounded-[6px] transition"
                >
                  Registrieren
                </NextLink>
              </div>
            )}

            {/* Mobil Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#A3A3A3] hover:text-[#F5F5F5] rounded-[6px]"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Suchleiste Dropdown mit Live-Ergebnissen */}
        {searchOpen && (
          <div className="py-3 border-t border-[#292929] relative">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8B5CF6] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Themen, Beiträge, Kanäle oder Mitglieder suchen... (Strg+K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full h-10 bg-[#161616] border border-[#292929] text-[#F5F5F5] placeholder-[#888888] text-xs rounded-[6px] pl-10 pr-9 focus:outline-none focus:border-[#8B5CF6] transition"
                />
                {searching ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#8B5CF6] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#F5F5F5]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
              <button
                type="submit"
                className="h-10 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition shrink-0"
              >
                Suchen
              </button>
            </form>

            {/* Instant Search Vorschläge */}
            {searchQuery.trim() && (
              <div className="max-w-2xl mx-auto mt-2 bg-[#161616] border border-[#292929] rounded-[8px] shadow-2xl overflow-hidden text-xs divide-y divide-[#292929]">
                {liveResults.users.length === 0 &&
                liveResults.threads.length === 0 &&
                liveResults.forums.length === 0 &&
                !searching ? (
                  <div className="p-4 text-center text-[#888888]">
                    Keine direkten Treffer für &bdquo;{searchQuery.trim()}&ldquo;
                  </div>
                ) : (
                  <>
                    {liveResults.users.length > 0 && (
                      <div className="p-2.5 space-y-1.5">
                        <div className="px-2 text-[10px] font-bold uppercase text-[#737373]">
                          Mitglieder
                        </div>
                        <div className="flex flex-wrap gap-1.5 px-1">
                          {liveResults.users.map((u) => (
                            <NextLink
                              key={u.id}
                              href={`/user/${u.username}`}
                              onClick={() => setSearchOpen(false)}
                              className="px-2.5 py-1 bg-[#111111] hover:bg-[#1F1F1F] border border-[#292929] rounded-[5px] flex items-center gap-2 text-[#F5F5F5] transition"
                            >
                              <img
                                src={
                                  u.avatarUrl ||
                                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'
                                }
                                alt=""
                                className="w-4 h-4 rounded-full object-cover"
                              />
                              <span className="font-medium">{u.username}</span>
                              <span className="text-[10px] text-[#8B5CF6]">{u.role.displayName}</span>
                            </NextLink>
                          ))}
                        </div>
                      </div>
                    )}

                    {liveResults.threads.length > 0 && (
                      <div className="p-2 space-y-1">
                        <div className="px-2 pt-0.5 text-[10px] font-bold uppercase text-[#737373]">
                          Themen
                        </div>
                        {liveResults.threads.map((t) => (
                          <NextLink
                            key={t.id}
                            href={`/forum/thread/${t.id}`}
                            onClick={() => setSearchOpen(false)}
                            className="px-2.5 py-2 hover:bg-[#1F1F1F] rounded-[5px] flex items-center justify-between gap-3 transition group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <MessageSquare className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                              {t.prefix && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#111111] text-[#8B5CF6] border border-[#292929] shrink-0">
                                  {t.prefix.name}
                                </span>
                              )}
                              <span className="text-[#F5F5F5] group-hover:text-[#8B5CF6] font-medium truncate">
                                {t.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#737373] shrink-0">
                              in {t.forum.name}
                            </span>
                          </NextLink>
                        ))}
                      </div>
                    )}

                    <NextLink
                      href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                      onClick={() => setSearchOpen(false)}
                      className="px-3.5 py-2.5 bg-[#111111] hover:bg-[#1D1D1D] flex items-center justify-between text-[#8B5CF6] font-medium transition"
                    >
                      <span>Alle Suchergebnisse für &bdquo;{searchQuery.trim()}&ldquo; anzeigen</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </NextLink>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 border-t border-[#292929] space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <NextLink
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-xs font-medium rounded-[6px] ${
                    isActive
                      ? 'text-[#F5F5F5] bg-[#161616] border border-[#292929]'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                  }`}
                >
                  {link.label}
                </NextLink>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
