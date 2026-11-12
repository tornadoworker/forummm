import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsernameCooldownInfo } from '@/lib/permissions';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const usernameCooldown = getUsernameCooldownInfo(user);

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      lastUsernameChange: user.lastUsernameChange,
      usernameCooldown,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      location: user.location,
      website: user.website,
      fivemId: user.fivemId,
      discordId: user.discordId,
      discordTag: user.discordTag,
      twoFactorEnabled: user.twoFactorEnabled,
      // Datenschutz
      showOnlineStatus: user.showOnlineStatus,
      profilePublic: user.profilePublic,
      allowDMs: user.allowDMs,
      allowProfilePosts: user.allowProfilePosts,
      showActivity: user.showActivity,
      // Benachrichtigungen
      notifyReplies: user.notifyReplies,
      notifyMentions: user.notifyMentions,
      notifyReactions: user.notifyReactions,
      notifyDMs: user.notifyDMs,
      notifyTickets: user.notifyTickets,
      notifyAnnouncements: user.notifyAnnouncements,
      notifyEmail: user.notifyEmail,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
}
