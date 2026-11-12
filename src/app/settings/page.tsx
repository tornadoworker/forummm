'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  Edit3,
  Image as ImageIcon,
  Camera,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Laptop,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Save,
  Upload,
  X,
  ExternalLink,
  Loader2,
  Globe,
  MapPin,
  Check,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Copy,
  Download,
  KeyRound,
  Clock,
  Sparkles
} from 'lucide-react';

type SettingsTab =
  | 'overview'
  | 'profile'
  | 'avatar'
  | 'security'
  | 'privacy'
  | 'notifications'
  | 'sessions'
  | 'delete';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [loadingUser, setLoadingUser] = useState(true);

  // Benutzerdaten State
  const [userData, setUserData] = useState<any>(null);
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [showUsernamePassword, setShowUsernamePassword] = useState(false);
  const [usernameCooldown, setUsernameCooldown] = useState<any>(null);

  // Feedback State
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setError] = useState<string | null>(null);

  // Profil Formular
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [fivemId, setFivemId] = useState('');

  // Avatar & Banner
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Sicherheit Formular
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorVerifyCode, setTwoFactorVerifyCode] = useState('');
  const [twoFactorDisablePassword, setTwoFactorDisablePassword] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [twoFactorModalError, setTwoFactorModalError] = useState<string | null>(null);

  // Datenschutz
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [profilePublic, setProfilePublic] = useState(true);
  const [allowDMs, setAllowDMs] = useState(true);
  const [allowProfilePosts, setAllowProfilePosts] = useState(true);
  const [showActivity, setShowActivity] = useState(true);

  // Benachrichtigungen
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [notifyReactions, setNotifyReactions] = useState(true);
  const [notifyDMs, setNotifyDMs] = useState(true);
  const [notifyTickets, setNotifyTickets] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  // Konto Löschen
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Daten laden
  useEffect(() => {
    fetch('/api/user/me')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          const u = data.user;
          setUserData(u);
          setDisplayName(u.displayName || '');
          setBio(u.bio || '');
          setLocation(u.location || '');
          setWebsite(u.website || '');
          setDiscordTag(u.discordTag || '');
          setFivemId(u.fivemId || '');
          setAvatarUrl(u.avatarUrl || null);
          setBannerUrl(u.bannerUrl || null);
          setNewEmail(u.email || '');
          setTwoFactorEnabled(Boolean(u.twoFactorEnabled));
          if (u.usernameCooldown) {
            setUsernameCooldown(u.usernameCooldown);
          }

          setShowOnlineStatus(u.showOnlineStatus ?? true);
          setProfilePublic(u.profilePublic ?? true);
          setAllowDMs(u.allowDMs ?? true);
          setAllowProfilePosts(u.allowProfilePosts ?? true);
          setShowActivity(u.showActivity ?? true);

          setNotifyReplies(u.notifyReplies ?? true);
          setNotifyMentions(u.notifyMentions ?? true);
          setNotifyReactions(u.notifyReactions ?? true);
          setNotifyDMs(u.notifyDMs ?? true);
          setNotifyTickets(u.notifyTickets ?? true);
          setNotifyAnnouncements(u.notifyAnnouncements ?? true);
          setNotifyEmail(Boolean(u.notifyEmail));
        }
      })
      .catch(() => router.push('/login?redirect=/settings'))
      .finally(() => setLoadingUser(false));
  }, [router]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccessMessage(null);
    } else {
      setSuccessMessage(msg);
      setError(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Speichern Handler
  const handleSaveSettings = async (payload: any, successText = 'Änderungen erfolgreich gespeichert.') => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'Fehler beim Speichern der Einstellungen.', true);
      } else {
        showNotification(successText);
        if (data.user) {
          setUserData((prev: any) => ({ ...prev, ...data.user }));
        }
      }
    } catch {
      showNotification('Verbindung zum Server fehlgeschlagen.', true);
    } finally {
      setSaving(false);
    }
  };

  // Avatar Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingBanner(true);

    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch('/api/user/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'Upload fehlgeschlagen.', true);
      } else {
        showNotification(data.message || 'Bild erfolgreich hochgeladen.');
        if (type === 'avatar') setAvatarUrl(data.url);
        else setBannerUrl(data.url);
      }
    } catch {
      showNotification('Fehler beim Hochladen der Datei.', true);
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingBanner(false);
      if (e.target) e.target.value = '';
    }
  };

  // Bild entfernen Handler
  const handleRemoveImage = async (type: 'avatar' | 'banner') => {
    try {
      const res = await fetch('/api/user/remove-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || 'Bild entfernt.');
        if (type === 'avatar') setAvatarUrl(null);
        else setBannerUrl(null);
      }
    } catch {
      showNotification('Fehler beim Entfernen des Bildes.', true);
    }
  };

  // Passwort ändern
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showNotification('Bitte gib dein aktuelles Passwort ein.', true);
      return;
    }
    if (newPassword.length < 6) {
      showNotification('Das neue Passwort muss mindestens 6 Zeichen lang sein.', true);
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      showNotification('Die neuen Passwörter stimmen nicht überein.', true);
      return;
    }

    await handleSaveSettings(
      { currentPassword, newPassword, newPasswordConfirm },
      'Dein Passwort wurde erfolgreich aktualisiert.'
    );
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
  };

  // E-Mail ändern
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === userData?.email) return;
    if (!emailPassword) {
      showNotification('Bitte bestätige die E-Mail-Änderung mit deinem Passwort.', true);
      return;
    }
    await handleSaveSettings(
      { newEmail, emailPassword },
      'Deine E-Mail-Adresse wurde erfolgreich geändert.'
    );
    setEmailPassword('');
  };

  // Benutzername ändern
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.trim();
    if (!cleanUsername) {
      showNotification('Bitte gib einen neuen Benutzernamen ein.', true);
      return;
    }
    if (cleanUsername === userData?.username) {
      showNotification('Der neue Benutzername ist identisch mit deinem aktuellen Namen.', true);
      return;
    }
    if (!usernamePassword) {
      showNotification('Bitte gib dein Passwort ein, um die Namensänderung zu bestätigen.', true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUsername: cleanUsername,
          usernamePassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'Fehler beim Ändern des Benutzernamens.', true);
      } else {
        setUserData((prev: any) => ({
          ...prev,
          username: data.user.username,
          lastUsernameChange: data.user.lastUsernameChange,
          usernameCooldown: data.usernameCooldown,
        }));
        if (data.usernameCooldown) {
          setUsernameCooldown(data.usernameCooldown);
        }
        setNewUsername('');
        setUsernamePassword('');
        showNotification(data.message || `Benutzername erfolgreich in '${data.user.username}' geändert!`);
      }
    } catch {
      showNotification('Verbindungsfehler bei der Namensänderung.', true);
    } finally {
      setSaving(false);
    }
  };

  // 2FA Handlers
  const handleStart2FASetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorModalError(null);
    setTwoFactorVerifyCode('');
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'Fehler beim Vorbereiten der 2FA-Einrichtung.', true);
      } else {
        setTwoFactorSetupData(data);
        setShow2FASetupModal(true);
      }
    } catch {
      showNotification('Verbindungsfehler beim Vorbereiten von 2FA.', true);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FACode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = twoFactorVerifyCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setTwoFactorModalError('Bitte gib den 6-stelligen Bestätigungscode ein.');
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorModalError(null);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTwoFactorModalError(data.error || 'Ungültiger Bestätigungscode.');
      } else {
        setTwoFactorEnabled(true);
        setShow2FASetupModal(false);
        setTwoFactorSetupData(null);
        showNotification('Zwei-Faktor-Authentifizierung wurde erfolgreich aktiviert!');
      }
    } catch {
      setTwoFactorModalError('Verbindungsfehler bei der Code-Prüfung.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorDisablePassword) {
      setTwoFactorModalError('Bitte gib dein aktuelles Passwort ein.');
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorModalError(null);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: twoFactorDisablePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTwoFactorModalError(data.error || 'Falsches Passwort.');
      } else {
        setTwoFactorEnabled(false);
        setShow2FADisableModal(false);
        setTwoFactorDisablePassword('');
        showNotification('Zwei-Faktor-Authentifizierung wurde erfolgreich deaktiviert.');
      }
    } catch {
      setTwoFactorModalError('Verbindungsfehler beim Deaktivieren von 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Konto Löschen Handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'KONTO LÖSCHEN') {
      showNotification('Bitte bestätige die Löschung durch Eingabe von "KONTO LÖSCHEN".', true);
      return;
    }
    if (!deletePassword) {
      showNotification('Bitte gib dein Passwort ein.', true);
      return;
    }

    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_ACCOUNT', password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'Fehler beim Löschen des Kontos.', true);
      } else {
        window.location.href = '/';
      }
    } catch {
      showNotification('Serverfehler bei der Kontolöschung.', true);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  const menuItems: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Übersicht', icon: LayoutDashboard },
    { id: 'profile', label: 'Profil bearbeiten', icon: Edit3 },
    { id: 'avatar', label: 'Avatar & Banner', icon: ImageIcon },
    { id: 'security', label: 'Konto & Sicherheit', icon: Shield },
    { id: 'privacy', label: 'Datenschutz', icon: Eye },
    { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
    { id: 'sessions', label: 'Sitzungen', icon: Laptop },
    { id: 'delete', label: 'Konto löschen', icon: Trash2 },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#292929]">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight">Kontoeinstellungen</h1>
          <p className="text-xs text-[#A3A3A3]">
            Verwalte dein Profil, deine Sicherheitsoptionen und Benachrichtigungseinstellungen.
          </p>
        </div>

        {userData && (
          <Link
            href={`/user/${userData.username}`}
            className="self-start sm:self-auto h-9 px-3.5 bg-[#161616] hover:bg-[#1D1D1D] text-[#F5F5F5] text-xs font-medium rounded-[6px] border border-[#292929] transition inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Öffentliches Profil ansehen</span>
          </Link>
        )}
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="flex items-center gap-2.5 p-3 rounded-[6px] bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2.5 p-3 rounded-[6px] bg-red-950/30 border border-red-500/30 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hauptbereich: 2-Spalten-Layout (Sidebar 240px + Content) */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* LINKER MENÜBALKEN (240px) */}
        <div className="w-full md:w-[240px] shrink-0 bg-[#111111] border border-[#292929] rounded-[8px] p-2 space-y-0.5 overflow-x-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDanger = item.id === 'delete';

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[6px] transition text-left ${
                  isActive
                    ? isDanger
                      ? 'bg-red-950/40 text-red-400 border border-red-500/30'
                      : 'bg-[#171717] text-[#F5F5F5] border border-[#292929]'
                    : isDanger
                    ? 'text-red-400/80 hover:bg-red-950/20 hover:text-red-400'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#161616]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? isDanger
                        ? 'text-red-400'
                        : 'text-[#8B5CF6]'
                      : 'text-[#737373]'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* RECHTER INHALTSBEREICH (CONTAINER #171717) */}
        <div className="flex-1 w-full bg-[#171717] border border-[#292929] rounded-[8px] p-6 sm:p-7 space-y-6">
          {/* TAB 1: ÜBERSICHT */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#F5F5F5]">Kontoübersicht</h2>
                <p className="text-xs text-[#A3A3A3]">
                  Wichtige Eckdaten zu deinem Vega Crimelife Mitgliedskonto.
                </p>
              </div>

              {/* User Profil-Karte */}
              <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={userData?.username}
                        className="w-14 h-14 rounded-full object-cover border border-[#292929]"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#161616] border border-[#292929] flex items-center justify-center text-[#8B5CF6] font-bold text-lg">
                        {userData?.username?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#F5F5F5]">{userData?.username}</span>
                      <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#161616] border border-[#292929] text-[#8B5CF6]">
                        {userData?.role?.displayName}
                      </span>
                    </div>
                    <p className="text-xs text-[#A3A3A3]">{userData?.email}</p>
                    {userData?.displayName && (
                      <p className="text-[11px] text-[#737373]">Anzeigename: {userData.displayName}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="h-8 px-3 bg-[#161616] hover:bg-[#1D1D1D] text-[#F5F5F5] text-xs font-medium rounded-[6px] border border-[#292929] transition self-start sm:self-auto"
                >
                  Profil bearbeiten
                </button>
              </div>

              {/* Schnell-Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-3.5 space-y-1">
                  <span className="text-[11px] text-[#737373] block">Registriert seit</span>
                  <span className="font-semibold text-[#F5F5F5]">
                    {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('de-DE') : '-'}
                  </span>
                </div>
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-3.5 space-y-1">
                  <span className="text-[11px] text-[#737373] block">Sicherheitsstatus</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Passwort geschützt</span>
                  </span>
                </div>
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-3.5 space-y-1">
                  <span className="text-[11px] text-[#737373] block">Online-Sichtbarkeit</span>
                  <span className="font-semibold text-[#F5F5F5]">
                    {showOnlineStatus ? 'Öffentlich' : 'Verborgen'}
                  </span>
                </div>
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-3.5 space-y-1">
                  <span className="text-[11px] text-[#737373] block">Namensänderung</span>
                  {usernameCooldown?.isExempt ? (
                    <span className="font-semibold text-[#8B5CF6] flex items-center gap-1 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Jederzeit möglich</span>
                    </span>
                  ) : usernameCooldown?.canChange ? (
                    <span className="font-semibold text-emerald-400 flex items-center gap-1 text-[11px]">
                      <Check className="w-3.5 h-3.5" />
                      <span>Verfügbar (90d)</span>
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-400 flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Noch {usernameCooldown?.daysRemaining}d gesperrt</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFIL BEARBEITEN */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-[#F5F5F5]">Profil bearbeiten</h2>
                <p className="text-xs text-[#A3A3A3]">
                  Passe deine persönlichen Angaben und Beschreibungen für andere Community-Mitglieder an.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveSettings({
                    displayName,
                    bio,
                    location,
                    website,
                    discordTag,
                    fivemId,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-[#F5F5F5]">
                        Benutzername
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className="text-[11px] text-[#8B5CF6] hover:text-[#A78BFA] transition inline-flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Name ändern</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      disabled
                      value={userData?.username || ''}
                      className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] font-mono cursor-default"
                    />
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {usernameCooldown?.isExempt ? (
                        <span className="text-[10px] text-[#8B5CF6] flex items-center gap-1 font-medium">
                          <Sparkles className="w-3 h-3" />
                          Unbegrenzte Namensänderungen (Admin / Tornadoworker)
                        </span>
                      ) : usernameCooldown?.canChange ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Namensänderung verfügbar (alle 90 Tage)
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Gesperrt bis {usernameCooldown?.nextAllowedDate ? new Date(usernameCooldown.nextAllowedDate).toLocaleDateString('de-DE') : ''} (in {usernameCooldown?.daysRemaining} Tagen)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#F5F5F5]">
                      Anzeigename / Spitzname
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="z.B. Alex Santos"
                      className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-[#8B5CF6] transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#F5F5F5]">
                    Über mich / Biografie
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Erzähle etwas über dich oder deinen RP-Charakter..."
                    className="w-full bg-[#101010] border border-[#292929] rounded-[6px] p-3 text-xs text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-[#8B5CF6] transition resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#F5F5F5]">
                      Standort (Freiwillig)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="z.B. Los Santos / Berlin"
                        className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 pl-9 text-xs text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-[#8B5CF6] transition"
                      />
                      <MapPin className="w-4 h-4 text-[#737373] absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#F5F5F5]">
                      Website (Freiwillig)
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://deine-seite.de"
                        className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 pl-9 text-xs text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-[#8B5CF6] transition"
                      />
                      <Globe className="w-4 h-4 text-[#737373] absolute left-3 top-3.5" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-[#F5F5F5]">
                        Discord Konto & Tag
                      </label>
                      {userData?.discordId ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Über OAuth2 verknüpft
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#A3A3A3]">
                          Nicht über OAuth2 verknüpft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={discordTag}
                        onChange={(e) => setDiscordTag(e.target.value)}
                        placeholder="benutzername"
                        className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-[#8B5CF6] transition"
                      />
                      <a
                        href="/api/auth/discord?action=link&redirect=/settings"
                        title="Mit Discord über OAuth2 verknüpfen"
                        className="h-11 px-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-[6px] text-xs font-medium flex items-center gap-1.5 shrink-0 transition shadow-sm cursor-pointer"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                        <span>OAuth2 Verknüpfen</span>
                      </a>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#F5F5F5]">
                      FiveM Spieler-ID
                    </label>
                    <input
                      type="text"
                      value={fivemId}
                      onChange={(e) => setFivemId(e.target.value)}
                      placeholder="z.B. 12345"
                      className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-[#8B5CF6] transition"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#292929] flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 px-5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Änderungen speichern</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: AVATAR & BANNER (DIREKTE UPLOADS VOM GERÄT) */}
          {activeTab === 'avatar' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#F5F5F5]">Avatar & Profilbanner</h2>
                <p className="text-xs text-[#A3A3A3]">
                  Lade eigene Bilder direkt von deinem Gerät hoch. Keine externen URLs erforderlich.
                </p>
              </div>

              {/* Versteckte File Inputs */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'avatar')}
              />
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'banner')}
              />

              {/* Live Preview Box */}
              <div className="bg-[#111111] border border-[#292929] rounded-[8px] overflow-hidden">
                <span className="text-[10px] text-[#737373] uppercase font-semibold px-4 pt-3 block">
                  Live-Vorschau deines Profilkopfes
                </span>

                <div className="p-4 space-y-3">
                  <div className="relative h-28 sm:h-36 rounded-[6px] overflow-hidden bg-[#161616] border border-[#292929]">
                    {bannerUrl ? (
                      <img
                        src={bannerUrl}
                        alt="Banner Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-[#141414] to-[#1A1A1A] flex items-center justify-center text-[11px] text-[#525252]">
                        Kein Profilbanner festgelegt
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 -mt-10 px-3 relative z-10">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-[#111111] shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#161616] border-2 border-[#111111] flex items-center justify-center text-[#8B5CF6] font-bold text-xl shadow-lg">
                        {userData?.username?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="pt-8">
                      <span className="font-bold text-sm text-[#F5F5F5] block">{userData?.username}</span>
                      <span className="text-[11px] text-[#8B5CF6]">{userData?.role?.displayName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Aktionen Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Avatar Bereich */}
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 space-y-3">
                  <h3 className="font-semibold text-xs text-[#F5F5F5]">Profilbild (Avatar)</h3>
                  <p className="text-[11px] text-[#737373] leading-relaxed">
                    Unterstützt JPEG, PNG und WebP. Empfohlenes Seitenverhältnis 1:1, max. 5 MB.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => avatarInputRef.current?.click()}
                      className="h-9 px-3.5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {uploadingAvatar ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Wird hochgeladen...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Avatar hochladen</span>
                        </>
                      )}
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('avatar')}
                        className="h-9 px-3 bg-[#161616] hover:bg-red-950/40 hover:text-red-400 text-[#A3A3A3] text-xs font-medium rounded-[6px] border border-[#292929] transition"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                </div>

                {/* Banner Bereich */}
                <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 space-y-3">
                  <h3 className="font-semibold text-xs text-[#F5F5F5]">Profilbanner</h3>
                  <p className="text-[11px] text-[#737373] leading-relaxed">
                    Erscheint als Header auf deiner Profilseite. Empfohlen: 1200 × 300 px, max. 5 MB.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={uploadingBanner}
                      onClick={() => bannerInputRef.current?.click()}
                      className="h-9 px-3.5 bg-[#161616] hover:bg-[#1D1D1D] text-[#F5F5F5] text-xs font-medium rounded-[6px] border border-[#292929] transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {uploadingBanner ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Wird hochgeladen...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Banner hochladen</span>
                        </>
                      )}
                    </button>

                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('banner')}
                        className="h-9 px-3 bg-[#161616] hover:bg-red-950/40 hover:text-red-400 text-[#A3A3A3] text-xs font-medium rounded-[6px] border border-[#292929] transition"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KONTO & SICHERHEIT */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#F5F5F5]">Konto & Sicherheit</h2>
                <p className="text-xs text-[#A3A3A3]">
                  Verwalte deine Zugangsdaten und die Authentifizierung deines Benutzerkontos.
                </p>
              </div>

              {/* Benutzername ändern */}
              <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#292929] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-xs text-[#F5F5F5]">Benutzername ändern</h3>
                      {usernameCooldown?.isExempt ? (
                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/40 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Sonderrecht: Unbegrenzt
                        </span>
                      ) : usernameCooldown?.canChange ? (
                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Änderung verfügbar
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Cooldown aktiv ({usernameCooldown?.daysRemaining} Tage)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#737373] mt-0.5">
                      Aktueller Benutzername: <span className="text-[#F5F5F5] font-mono font-medium">{userData?.username}</span>
                    </p>
                  </div>

                  {userData?.lastUsernameChange && (
                    <span className="text-[10px] text-[#737373]">
                      Zuletzt geändert: {new Date(userData.lastUsernameChange).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>

                {/* Cooldown Info Box */}
                <div className={`p-3 rounded-[6px] border text-xs flex items-start gap-2.5 ${
                  usernameCooldown?.isExempt
                    ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#C4B5FD]'
                    : usernameCooldown?.canChange
                    ? 'bg-[#161616] border-[#292929] text-[#A3A3A3]'
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                }`}>
                  {usernameCooldown?.isExempt ? (
                    <Sparkles className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                  ) : usernameCooldown?.canChange ? (
                    <AlertCircle className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-medium text-[#F5F5F5]">
                      {usernameCooldown?.isExempt
                        ? 'Sonderberechtigung aktiv (Tornadoworker / Admin)'
                        : usernameCooldown?.canChange
                        ? '90-Tage-Regelung für Benutzernamen'
                        : 'Benutzername-Änderung vorübergehend gesperrt'}
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      {usernameCooldown?.isExempt
                        ? 'Als Administrator bzw. Tornadoworker darfst du deinen Benutzernamen jederzeit ohne die 90-tägige Wartezeit ändern.'
                        : usernameCooldown?.canChange
                        ? 'Community-Mitglieder können ihren Benutzernamen alle 90 Tage anpassen. Nach der Speicherung tritt ein 90-tägiger Cooldown in Kraft.'
                        : usernameCooldown?.reason}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUsernameSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#F5F5F5]">
                        Neuer Benutzername
                      </label>
                      <input
                        type="text"
                        disabled={!usernameCooldown?.canChange || saving}
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="z.B. NeuerName"
                        className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-[#8B5CF6] transition disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#F5F5F5]">
                        Aktuelles Passwort zur Bestätigung
                      </label>
                      <div className="relative">
                        <input
                          type={showUsernamePassword ? 'text' : 'password'}
                          autoComplete="off"
                          disabled={!usernameCooldown?.canChange || saving}
                          value={usernamePassword}
                          onChange={(e) => setUsernamePassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 pr-10 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] transition disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          disabled={!usernameCooldown?.canChange}
                          onClick={() => setShowUsernamePassword(!showUsernamePassword)}
                          className="absolute right-3 top-3 text-[#737373] hover:text-[#F5F5F5] disabled:opacity-40 cursor-pointer"
                        >
                          {showUsernamePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!usernameCooldown?.canChange || saving || !newUsername.trim() || !usernamePassword}
                    className="h-9 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Benutzernamen speichern</span>
                  </button>
                </form>
              </div>

              {/* Passwort ändern */}
              <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-5 space-y-4">
                <div className="border-b border-[#292929] pb-2">
                  <h3 className="font-semibold text-xs text-[#F5F5F5]">Passwort ändern</h3>
                  <p className="text-[11px] text-[#737373]">
                    Wähle ein sicheres Passwort mit mindestens 6 Zeichen.
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#F5F5F5]">
                      Aktuelles Passwort
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        autoComplete="off"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 pr-10 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-3 text-[#737373] hover:text-[#F5F5F5]"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#F5F5F5]">
                        Neues Passwort
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          autoComplete="off"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mind. 6 Zeichen"
                          className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 pr-10 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-3 text-[#737373] hover:text-[#F5F5F5]"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#F5F5F5]">
                        Neues Passwort wiederholen
                      </label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="off"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !currentPassword || !newPassword}
                    className="h-9 px-4 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Passwort aktualisieren</span>
                  </button>
                </form>
              </div>

              {/* E-Mail ändern */}
              <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-5 space-y-4">
                <div className="border-b border-[#292929] pb-2">
                  <h3 className="font-semibold text-xs text-[#F5F5F5]">E-Mail-Adresse verwalten</h3>
                  <p className="text-[11px] text-[#737373]">
                    Aktuelle E-Mail: <span className="text-[#F5F5F5]">{userData?.email}</span>
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#F5F5F5]">
                        Neue E-Mail-Adresse
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#F5F5F5]">
                        Passwort zur Bestätigung
                      </label>
                      <input
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !newEmail || newEmail === userData?.email || !emailPassword}
                    className="h-9 px-4 bg-[#161616] hover:bg-[#1D1D1D] text-[#F5F5F5] text-xs font-medium rounded-[6px] border border-[#292929] transition disabled:opacity-50"
                  >
                    E-Mail-Adresse ändern
                  </button>
                </form>
              </div>

              {/* 2FA Bereich */}
              <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-xs text-[#F5F5F5]">
                      Zwei-Faktor-Authentifizierung (2FA / TOTP)
                    </h3>
                    {twoFactorEnabled ? (
                      <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Aktiviert
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#161616] text-[#A3A3A3] border border-[#292929]">
                        Inaktiv
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#737373] leading-relaxed max-w-[500px]">
                    Schütze dein Konto zusätzlich durch RFC-konforme TOTP-Codes (Google Authenticator, Authy, Apple Passwords). Bei jeder Anmeldung wird nach dem Passwort ein 6-stelliger Zahlencode oder ein Backup-Code abgefragt.
                  </p>
                </div>

                <div className="shrink-0">
                  {twoFactorEnabled ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTwoFactorModalError(null);
                        setTwoFactorDisablePassword('');
                        setShow2FADisableModal(true);
                      }}
                      className="h-9 px-4 rounded-[6px] text-xs font-medium bg-red-950/30 hover:bg-red-950/50 text-red-300 border border-red-500/30 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>2FA Deaktivieren</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={twoFactorLoading}
                      onClick={handleStart2FASetup}
                      className="h-9 px-4 rounded-[6px] text-xs font-medium bg-[#8B5CF6] hover:bg-[#7C3AED] text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {twoFactorLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      <span>2FA jetzt aktivieren</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DATENSCHUTZ */}
          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-[#F5F5F5]">Datenschutz</h2>
                <p className="text-xs text-[#A3A3A3]">
                  Lege fest, wer deine Aktivitäten und Profilelemente sehen darf.
                </p>
              </div>

              <div className="bg-[#111111] border border-[#292929] rounded-[6px] divide-y divide-[#292929]">
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      Online-Status anzeigen
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Erlaube anderen Nutzern zu sehen, wann du zuletzt online warst.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showOnlineStatus}
                    onChange={(e) => setShowOnlineStatus(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      Profil öffentlich sichtbar
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Nicht registrierte Gäste können deine Profilinformationen einsehen.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profilePublic}
                    onChange={(e) => setProfilePublic(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      Private Nachrichten erlauben
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Andere Community-Mitglieder dürfen dir private Direktnachrichten senden.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDMs}
                    onChange={(e) => setAllowDMs(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      Pinnwand-Nachrichten erlauben
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Erlaube Kommentare und Pinnwandeinträge auf deiner Profilseite.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowProfilePosts}
                    onChange={(e) => setAllowProfilePosts(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      Aktivitäten & Beiträge anzeigen
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Zeige deine erstellten Themen und Reaktionen im öffentlichen Profil an.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showActivity}
                    onChange={(e) => setShowActivity(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    handleSaveSettings({
                      showOnlineStatus,
                      profilePublic,
                      allowDMs,
                      allowProfilePosts,
                      showActivity,
                    }, 'Datenschutz-Einstellungen gespeichert.')
                  }
                  className="h-10 px-5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Datenschutz speichern</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: BENACHRICHTIGUNGEN */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-[#F5F5F5]">Benachrichtigungen</h2>
                <p className="text-xs text-[#A3A3A3]">
                  Wähle aus, bei welchen Foren-Ereignissen du benachrichtigt werden möchtest.
                </p>
              </div>

              <div className="bg-[#111111] border border-[#292929] rounded-[6px] divide-y divide-[#292929]">
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      Antworten auf eigene Themen
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Benachrichtigung, wenn jemand in deinen erstellten Themen antwortet.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyReplies}
                    onChange={(e) => setNotifyReplies(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      Erwähnungen (@Username)
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Benachrichtigung, wenn dich jemand in einem Beitrag markiert.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyMentions}
                    onChange={(e) => setNotifyMentions(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      Reaktionen & Likes
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Benachrichtigung, wenn ein Mitglied deinen Beitrag positiv bewertet.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyReactions}
                    onChange={(e) => setNotifyReactions(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      Private Nachrichten
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Benachrichtigung bei Eingang neuer Direktnachrichten.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyDMs}
                    onChange={(e) => setNotifyDMs(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      Support-Ticket Antworten
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Benachrichtigung, wenn das Support-Team auf dein Ticket antwortet.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyTickets}
                    onChange={(e) => setNotifyTickets(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#F5F5F5] block">
                      E-Mail-Zustellung
                    </span>
                    <span className="text-[11px] text-[#737373] block">
                      Wichtige Benachrichtigungen zusätzlich per E-Mail erhalten.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="w-4 h-4 accent-[#8B5CF6] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    handleSaveSettings({
                      notifyReplies,
                      notifyMentions,
                      notifyReactions,
                      notifyDMs,
                      notifyTickets,
                      notifyAnnouncements,
                      notifyEmail,
                    }, 'Benachrichtigungseinstellungen gespeichert.')
                  }
                  className="h-10 px-5 bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-medium rounded-[6px] transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Benachrichtigungen speichern</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: SITZUNGEN */}
          {activeTab === 'sessions' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-[#F5F5F5]">Aktive Sitzungen</h2>
                <p className="text-xs text-[#A3A3A3]">
                  Übersicht aller Geräte, auf denen du derzeit bei Vega Crimelife eingeloggt bist.
                </p>
              </div>

              {/* Aktuelle Sitzung */}
              <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[6px] bg-[#161616] border border-[#292929] flex items-center justify-center text-[#8B5CF6]">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#F5F5F5]">
                        Aktueller Webbrowser (Desktop)
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                        Diese Sitzung
                      </span>
                    </div>
                    <p className="text-[11px] text-[#737373]">
                      Windows PC • Google Chrome / Next.js Client
                    </p>
                    <p className="text-[10px] text-[#525252]">Zuletzt aktiv: Gerade eben</p>
                  </div>
                </div>
              </div>

              {/* Sitzungen beenden */}
              <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-medium text-xs text-[#F5F5F5] block">
                    Andere Sitzungen beenden
                  </span>
                  <span className="text-[11px] text-[#737373] block">
                    Meldet dein Konto auf allen anderen Geräten und Browsern ab.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveSettings({ action: 'REVOKE_SESSIONS' }, 'Alle anderen Sitzungen wurden abgemeldet.');
                  }}
                  className="h-9 px-4 bg-[#161616] hover:bg-[#1D1D1D] text-[#F5F5F5] text-xs font-medium rounded-[6px] border border-[#292929] transition self-start sm:self-auto"
                >
                  Andere Sitzungen abmelden
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: KONTO LÖSCHEN */}
          {activeTab === 'delete' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-red-400">Konto löschen</h2>
                <p className="text-xs text-[#A3A3A3]">
                  Unwiderrufliche Löschung deines Benutzerkontos und aller persönlichen Einstellungen.
                </p>
              </div>

              <div className="p-4 rounded-[6px] bg-red-950/20 border border-red-500/30 text-red-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Wichtiger Hinweis vor der Löschung:</span>
                </div>
                <p className="text-[11px] text-red-200/80 leading-relaxed">
                  Durch das Löschen deines Kontos werden deine Zugangsdaten, Passwörter und privaten Nachrichten unwiderruflich aus der Datenbank entfernt. Aus Gründen der Nachvollziehbarkeit bleiben deine Forenbeiträge als anonymisierter Gastbeitrag erhalten.
                </p>
              </div>

              <div className="bg-[#111111] border border-red-500/30 rounded-[6px] p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block font-medium text-[#F5F5F5]">
                    Tippe zur Bestätigung genau <span className="font-mono text-red-400">KONTO LÖSCHEN</span> ein:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="KONTO LÖSCHEN"
                    className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-red-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-[#F5F5F5]">
                    Bestätige mit deinem aktuellen Passwort:
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-red-500 transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'KONTO LÖSCHEN' || !deletePassword}
                  className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-[6px] transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Konto unwiderruflich löschen</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2FA SETUP MODAL */}
      {show2FASetupModal && twoFactorSetupData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141414] border border-[#292929] rounded-[10px] w-full max-w-[540px] shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#292929] flex items-center justify-between bg-[#111111]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F5F5F5]">2FA einrichten</h3>
                  <p className="text-[11px] text-[#A3A3A3]">Zwei-Faktor-Authentifizierung mit Authenticator-App</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShow2FASetupModal(false)}
                className="text-[#737373] hover:text-[#F5F5F5] transition p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {twoFactorModalError && (
                <div className="flex items-start gap-2.5 p-3 rounded-[6px] bg-red-950/30 border border-red-500/30 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{twoFactorModalError}</span>
                </div>
              )}

              {/* Schritt 1: QR Code & Secret */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#F5F5F5]">
                  <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-[10px]">1</span>
                  <span>QR-Code mit App scannen</span>
                </div>
                <p className="text-xs text-[#A3A3A3] leading-relaxed">
                  Öffne deine Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator, Authy, Apple Schlüsselbund) und scanne den folgenden QR-Code:
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#101010] border border-[#292929] rounded-[8px] p-4">
                  <div className="bg-white p-2 rounded-[6px] shrink-0 shadow-sm">
                    {/* QR Code Bild */}
                    <img
                      src={twoFactorSetupData.qrCodeUrl}
                      alt="2FA QR Code"
                      className="w-32 h-32 block"
                    />
                  </div>

                  <div className="space-y-2 w-full text-xs">
                    <span className="text-[11px] text-[#737373] block">
                      Kannst du den QR-Code nicht scannen? Gib den Schlüssel manuell ein:
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="bg-[#161616] border border-[#292929] rounded px-2.5 py-1.5 font-mono text-[11px] text-[#8B5CF6] select-all break-all flex-1">
                        {twoFactorSetupData.secret}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(twoFactorSetupData.secret);
                          setCopiedCodes(true);
                          setTimeout(() => setCopiedCodes(false), 2000);
                        }}
                        title="Schlüssel kopieren"
                        className="h-8 px-2.5 bg-[#161616] hover:bg-[#1D1D1D] text-[#F5F5F5] rounded border border-[#292929] transition shrink-0 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schritt 2: Backup-Codes */}
              <div className="space-y-3 pt-2 border-t border-[#292929]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F5F5F5]">
                    <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Backup-Wiederherstellungscodes sichern</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(twoFactorSetupData.recoveryCodes.join('\n'));
                        setCopiedCodes(true);
                        setTimeout(() => setCopiedCodes(false), 2000);
                      }}
                      className="text-[11px] text-[#8B5CF6] hover:text-[#A78BFA] transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedCodes ? 'Kopiert!' : 'Kopieren'}</span>
                    </button>
                    <span className="text-[#404040]">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([
                          `Vega Crimelife - 2FA Backup-Codes\nBenutzer: ${userData?.username}\nErstellt: ${new Date().toISOString()}\n\n` +
                          twoFactorSetupData.recoveryCodes.join('\n')
                        ], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `vega-crimelife-2fa-backup-codes-${userData?.username}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-[11px] text-[#8B5CF6] hover:text-[#A78BFA] transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#101010] border border-[#292929] rounded-[8px] p-3">
                  {twoFactorSetupData.recoveryCodes.map((code, idx) => (
                    <div key={idx} className="bg-[#161616] border border-[#292929] rounded px-2 py-1 text-center font-mono text-[11px] text-[#F5F5F5]">
                      {code}
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-[#737373]">
                  Jeder Code kann genau einmal verwendet werden, falls du den Zugriff auf dein Smartphone verlierst.
                </p>
              </div>

              {/* Schritt 3: Bestätigungscode */}
              <form onSubmit={handleVerify2FACode} className="space-y-3 pt-2 border-t border-[#292929]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#F5F5F5]">
                  <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Bestätigungscode eingeben</span>
                </div>
                <p className="text-xs text-[#A3A3A3]">
                  Gib den aktuellen 6-stelligen Code aus der App ein, um die Einrichtung abzuschließen:
                </p>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={twoFactorVerifyCode}
                    onChange={(e) => setTwoFactorVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-4 text-center font-mono text-base tracking-[0.25em] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] w-48"
                  />
                  <button
                    type="submit"
                    disabled={twoFactorLoading || twoFactorVerifyCode.length !== 6}
                    className="flex-1 h-11 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-medium rounded-[6px] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {twoFactorLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Wird aktiviert...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>2FA endgültig aktivieren</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2FA DISABLE MODAL */}
      {show2FADisableModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#292929] rounded-[10px] w-full max-w-[420px] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#292929] flex items-center justify-between bg-[#111111]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#F5F5F5]">2FA deaktivieren</h3>
              </div>
              <button
                type="button"
                onClick={() => setShow2FADisableModal(false)}
                className="text-[#737373] hover:text-[#F5F5F5] transition p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDisable2FASubmit} className="p-6 space-y-4">
              {twoFactorModalError && (
                <div className="flex items-start gap-2.5 p-3 rounded-[6px] bg-red-950/30 border border-red-500/30 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{twoFactorModalError}</span>
                </div>
              )}

              <p className="text-xs text-[#A3A3A3] leading-relaxed">
                Bist du sicher, dass du die Zwei-Faktor-Authentifizierung deaktivieren möchtest? Dein Konto wird dadurch weniger geschützt.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#F5F5F5]">
                  Bestätige mit deinem aktuellen Passwort:
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={twoFactorDisablePassword}
                  onChange={(e) => setTwoFactorDisablePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 bg-[#101010] border border-[#292929] rounded-[6px] px-3.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-red-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShow2FADisableModal(false)}
                  className="h-9 px-4 rounded-[6px] text-xs font-medium bg-[#161616] hover:bg-[#1D1D1D] text-[#A3A3A3] border border-[#292929] transition cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={twoFactorLoading || !twoFactorDisablePassword}
                  className="h-9 px-4 rounded-[6px] text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {twoFactorLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>2FA deaktivieren</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
