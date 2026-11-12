const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const forumChannels = [
  {
    name: 'Server-Regeln',
    description: 'Offizielle Server-, Roleplay- und Verhaltensregeln',
    icon: 'FileText',
    order: 1,
  },
  {
    name: 'Beschwerden',
    description: 'Spielerbeschwerden, Adminbeschwerden und Fraktionsanliegen',
    icon: 'AlertTriangle',
    order: 2,
  },
  {
    name: 'Bewerbungen',
    description: 'Leader-Bewerbungen, Teambewerbungen und Fraktionsanträge',
    icon: 'Award',
    order: 3,
  },
  {
    name: 'Staatliche Organisationen',
    description: 'LSPD, FIB, EMS, Government und Justiz',
    icon: 'Shield',
    order: 4,
  },
  {
    name: 'Ghetto',
    description: 'Gangkriminalität, Hoods, Kriege und Gang-Aktivitäten',
    icon: 'Flame',
    order: 5,
  },
  {
    name: 'Private Organisationen',
    description: 'Inoffizielle Organisationen, Familien und Unternehmen',
    icon: 'Building2',
    order: 6,
  },
  {
    name: 'Radiosender \'LifeInvader\'',
    description: 'Community-Nachrichten, Werbung und Event-Ankündigungen',
    icon: 'Radio',
    order: 7,
  },
  {
    name: 'Role Play biografien',
    description: 'Charakter-Biografien, Bad-Cop Anträge und Sonderrollen',
    icon: 'BookOpen',
    order: 8,
  },
  {
    name: 'Globale Ereignisse',
    description: 'Serverweite Events, Tuning-Treffen und Wettkämpfe',
    icon: 'Trophy',
    order: 9,
  },
];

const newPrefixes = [
  { name: 'IMPORTANT', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
  { name: 'Pending review', color: '#EAB308', bgColor: 'rgba(234, 179, 8, 0.2)' },
  { name: 'On consideration', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.2)' },
  { name: 'Approved', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.2)' },
  { name: 'Rejected', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
];

async function main() {
  console.log('Richte die 9 exakten Forenkanäle ein...');

  // 1. Prefixes anlegen/aktualisieren
  for (const p of newPrefixes) {
    await prisma.threadPrefix.upsert({
      where: { name: p.name },
      update: { color: p.color, bgColor: p.bgColor },
      create: p,
    });
  }
  console.log('✓ Thread-Präfixe aktualisiert');

  // 2. Bestehende Kategorien & Foren löschen
  await prisma.post.deleteMany({});
  await prisma.thread.deleteMany({});
  await prisma.forum.deleteMany({});
  await prisma.category.deleteMany({});

  // 3. Hauptkategorie erstellen
  const category = await prisma.category.create({
    data: {
      name: 'Vega Crimelife Foren',
      description: 'Offizielle Forumkanäle des Servers',
      icon: 'Folder',
      order: 1,
    },
  });

  // 4. Die 9 Forenkanäle anlegen
  for (const channel of forumChannels) {
    await prisma.forum.create({
      data: {
        categoryId: category.id,
        name: channel.name,
        description: channel.description,
        icon: channel.icon,
        order: channel.order,
        threadsCount: 0,
        postsCount: 0,
      },
    });
  }

  console.log('✓ 9 Forenkanäle erfolgreich angelegt:');
  forumChannels.forEach(c => console.log(`  ${c.order}. ${c.name}`));
}

main()
  .catch((e) => {
    console.error('Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
