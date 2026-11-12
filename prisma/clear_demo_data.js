const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Lösche alle Demodaten aus der Datenbank...');

  // 1. Support Tickets & Nachrichten
  await prisma.ticketMessage.deleteMany({});
  await prisma.ticketAuditLog.deleteMany({});
  await prisma.ticket.deleteMany({});
  console.log('✓ Tickets und Ticketnachrichten gelöscht');

  // 2. Forenbeiträge, Umfragen, Reaktionen, Lesezeichen & Themen
  await prisma.pollVote.deleteMany({});
  await prisma.pollOption.deleteMany({});
  await prisma.poll.deleteMany({});
  await prisma.reaction.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.bookmark.deleteMany({});
  await prisma.thread.deleteMany({});
  console.log('✓ Forenthemen, Beiträge, Umfragen und Reaktionen gelöscht');

  // 3. Foren Counter zurücksetzen
  await prisma.forum.updateMany({
    data: {
      threadsCount: 0,
      postsCount: 0,
      lastPostAt: null,
    },
  });
  console.log('✓ Forenzähler auf 0 zurückgesetzt');

  // 4. Profilnachrichten & Private Nachrichten
  await prisma.profileMessage.deleteMany({});
  await prisma.directMessage.deleteMany({});
  await prisma.conversationParticipant.deleteMany({});
  await prisma.conversation.deleteMany({});
  console.log('✓ Private Unterhaltungen und Pinnwandeinträge gelöscht');

  // 5. Benachrichtigungen & Audit Logs
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  console.log('✓ Benachrichtigungen und Audit-Logs gelöscht');

  // 6. Demo-Benutzer löschen, aber EINEN sauberen Haupt-Admin erhalten
  // Finde die Projektleitung Rolle
  const adminRole = await prisma.role.findUnique({
    where: { name: 'PROJEKTLEITUNG' },
  });

  if (!adminRole) {
    throw new Error('Projektleitung Rolle nicht gefunden');
  }

  // Alle Benutzer außer CrimeLifeAdmin löschen
  await prisma.user.deleteMany({
    where: {
      username: {
        not: 'CrimeLifeAdmin',
      },
    },
  });

  // Admin-Account sicherstellen
  const passwordHash = await bcrypt.hash('admin1234!', 10);
  await prisma.user.upsert({
    where: { username: 'CrimeLifeAdmin' },
    update: {
      bio: 'Projektleitung Vega Crimelife',
      fivemId: null,
      discordTag: null,
    },
    create: {
      username: 'CrimeLifeAdmin',
      email: 'admin@vega-crimelife.de',
      passwordHash,
      roleId: adminRole.id,
      bio: 'Projektleitung Vega Crimelife',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    },
  });

  console.log('✓ Alle Demo-Benutzer gelöscht (Nur Haupt-Admin CrimeLifeAdmin bleibt erhalten)');
  console.log('Fertig! Die Datenbank ist nun komplett sauber.');
}

main()
  .catch((e) => {
    console.error('Fehler beim Löschen:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
