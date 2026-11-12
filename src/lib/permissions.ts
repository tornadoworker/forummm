import type { Role, User } from '@prisma/client';

export type UserWithRole = User & { role: Role };

export function hasPermission(
  user: (User & { role: Role }) | null | undefined,
  permission: keyof Role
): boolean {
  if (!user || user.isBanned) return false;
  // Höchste Rollen (Projektleitung / Admin) haben alles
  if (user.role.name === 'PROJEKTLEITUNG' || user.role.name === 'ADMINISTRATOR') return true;
  return Boolean(user.role[permission]);
}

export function canAccessAdmin(user: (User & { role: Role }) | null | undefined): boolean {
  return hasPermission(user, 'canAccessAdmin');
}

export function canManageTickets(user: (User & { role: Role }) | null | undefined): boolean {
  return hasPermission(user, 'canManageTickets');
}

export function canViewInternalNotes(user: (User & { role: Role }) | null | undefined): boolean {
  return hasPermission(user, 'canViewInternalNotes');
}

export function canModerate(user: (User & { role: Role }) | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role.canCloseThreads ||
    user.role.canPinThreads ||
    user.role.canDeletePosts ||
    user.role.canBanUsers
  );
}

export const USERNAME_CHANGE_COOLDOWN_DAYS = 90;

/**
 * Prüft, ob ein Benutzer von der 90-Tage-Sperre für Benutzernamen ausgenommen ist.
 * Ausgenommen sind:
 * 1. Der Benutzer 'tornadoworker' (per Username oder E-Mail)
 * 2. Projektleitung & Administratoren (bzw. Benutzer mit ACP- oder Benutzerverwaltungsrechten)
 */
export function isExemptFromUsernameCooldown(user: {
  username?: string | null;
  email?: string | null;
  role?: {
    name?: string | null;
    canAccessAdmin?: boolean;
    canManageUsers?: boolean;
  } | null;
} | null | undefined): boolean {
  if (!user) return false;

  const uname = (user.username || '').trim().toLowerCase();
  const mail = (user.email || '').trim().toLowerCase();

  // 1. Tornadoworker Sonderrecht (Groß-/Kleinschreibung tolerant)
  if (
    uname === 'tornadoworker' ||
    mail === 'tornadoworker@gmail.com' ||
    mail.startsWith('tornadoworker@')
  ) {
    return true;
  }

  // 2. Admins & Projektleitung
  const roleName = (user.role?.name || '').toUpperCase();
  if (roleName === 'PROJEKTLEITUNG' || roleName === 'ADMINISTRATOR') {
    return true;
  }
  if (user.role?.canAccessAdmin || user.role?.canManageUsers) {
    return true;
  }

  return false;
}

export interface UsernameCooldownInfo {
  canChange: boolean;
  isExempt: boolean;
  cooldownDays: number;
  daysRemaining: number;
  nextAllowedDate: Date | null;
  reason: string;
}

export function getUsernameCooldownInfo(user: {
  username?: string | null;
  email?: string | null;
  lastUsernameChange?: Date | string | null;
  role?: {
    name?: string | null;
    canAccessAdmin?: boolean;
    canManageUsers?: boolean;
  } | null;
} | null | undefined): UsernameCooldownInfo {
  if (!user) {
    return {
      canChange: false,
      isExempt: false,
      cooldownDays: USERNAME_CHANGE_COOLDOWN_DAYS,
      daysRemaining: 0,
      nextAllowedDate: null,
      reason: 'Nicht angemeldet.',
    };
  }

  const isExempt = isExemptFromUsernameCooldown(user);
  if (isExempt) {
    return {
      canChange: true,
      isExempt: true,
      cooldownDays: 0,
      daysRemaining: 0,
      nextAllowedDate: null,
      reason: 'Unbegrenzte Namensänderungen (Admin- / Tornadoworker-Sonderberechtigung).',
    };
  }

  if (!user.lastUsernameChange) {
    return {
      canChange: true,
      isExempt: false,
      cooldownDays: USERNAME_CHANGE_COOLDOWN_DAYS,
      daysRemaining: 0,
      nextAllowedDate: null,
      reason: 'Namensänderung verfügbar (noch keine vorherige Änderung registriert).',
    };
  }

  const lastChangeMs = new Date(user.lastUsernameChange).getTime();
  if (isNaN(lastChangeMs)) {
    return {
      canChange: true,
      isExempt: false,
      cooldownDays: USERNAME_CHANGE_COOLDOWN_DAYS,
      daysRemaining: 0,
      nextAllowedDate: null,
      reason: 'Namensänderung verfügbar.',
    };
  }

  const cooldownMs = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const nextAllowedMs = lastChangeMs + cooldownMs;
  const now = Date.now();

  if (now >= nextAllowedMs) {
    return {
      canChange: true,
      isExempt: false,
      cooldownDays: USERNAME_CHANGE_COOLDOWN_DAYS,
      daysRemaining: 0,
      nextAllowedDate: null,
      reason: 'Namensänderung verfügbar (90-Tage-Frist abgelaufen).',
    };
  }

  const msRemaining = nextAllowedMs - now;
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  const nextAllowedDate = new Date(nextAllowedMs);

  return {
    canChange: false,
    isExempt: false,
    cooldownDays: USERNAME_CHANGE_COOLDOWN_DAYS,
    daysRemaining,
    nextAllowedDate,
    reason: `Du kannst deinen Benutzernamen nur alle 90 Tage ändern. Nächste Änderung möglich am ${nextAllowedDate.toLocaleDateString('de-DE')} (in ${daysRemaining} ${daysRemaining === 1 ? 'Tag' : 'Tagen'}).`,
  };
}
