const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo-Daten dürfen nur in der lokalen Entwicklung angelegt werden.');
  }

  console.log('Seeding CrimeLife Network database...');

  // 1. Rollen erstellen
  const rolesData = [
    {
      name: 'PROJEKTLEITUNG',
      displayName: 'Projektleitung',
      color: '#EF4444',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      priority: 100,
      canCreateThreads: true,
      canEditPosts: true,
      canDeletePosts: true,
      canPinThreads: true,
      canCloseThreads: true,
      canMoveThreads: true,
      canManageCategories: true,
      canManageRoles: true,
      canAccessAdmin: true,
      canManageTickets: true,
      canViewInternalNotes: true,
      canBanUsers: true,
      canEditWiki: true,
    },
    {
      name: 'ADMINISTRATOR',
      displayName: 'Administrator',
      color: '#DC2626',
      badgeBg: 'rgba(220, 38, 38, 0.15)',
      priority: 80,
      canCreateThreads: true,
      canEditPosts: true,
      canDeletePosts: true,
      canPinThreads: true,
      canCloseThreads: true,
      canMoveThreads: true,
      canManageCategories: true,
      canManageRoles: true,
      canAccessAdmin: true,
      canManageTickets: true,
      canViewInternalNotes: true,
      canBanUsers: true,
      canEditWiki: true,
    },
    {
      name: 'MODERATOR',
      displayName: 'Moderator',
      color: '#10B981',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      priority: 60,
      canCreateThreads: true,
      canEditPosts: true,
      canDeletePosts: true,
      canPinThreads: true,
      canCloseThreads: true,
      canMoveThreads: true,
      canManageCategories: false,
      canManageRoles: false,
      canAccessAdmin: false,
      canManageTickets: true,
      canViewInternalNotes: true,
      canBanUsers: true,
      canEditWiki: true,
    },
    {
      name: 'SUPPORTER',
      displayName: 'Supporter',
      color: '#4C8DFF',
      badgeBg: 'rgba(76, 141, 255, 0.15)',
      priority: 40,
      canCreateThreads: true,
      canEditPosts: false,
      canDeletePosts: false,
      canPinThreads: false,
      canCloseThreads: true,
      canMoveThreads: false,
      canManageCategories: false,
      canManageRoles: false,
      canAccessAdmin: false,
      canManageTickets: true,
      canViewInternalNotes: true,
      canBanUsers: false,
      canEditWiki: false,
    },
    {
      name: 'VIP',
      displayName: 'VIP',
      color: '#F59E0B',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      priority: 20,
      canCreateThreads: true,
      canEditPosts: false,
      canDeletePosts: false,
      canPinThreads: false,
      canCloseThreads: false,
      canMoveThreads: false,
      canManageCategories: false,
      canManageRoles: false,
      canAccessAdmin: false,
      canManageTickets: false,
      canViewInternalNotes: false,
      canBanUsers: false,
      canEditWiki: false,
    },
    {
      name: 'MITGLIED',
      displayName: 'Mitglied',
      color: '#94A3B8',
      badgeBg: 'rgba(148, 163, 184, 0.15)',
      priority: 10,
      canCreateThreads: true,
      canEditPosts: false,
      canDeletePosts: false,
      canPinThreads: false,
      canCloseThreads: false,
      canMoveThreads: false,
      canManageCategories: false,
      canManageRoles: false,
      canAccessAdmin: false,
      canManageTickets: false,
      canViewInternalNotes: false,
      canBanUsers: false,
      canEditWiki: false,
    },
    {
      name: 'GAST',
      displayName: 'Gast',
      color: '#64748B',
      badgeBg: 'rgba(100, 116, 139, 0.15)',
      priority: 0,
      canCreateThreads: false,
      canEditPosts: false,
      canDeletePosts: false,
      canPinThreads: false,
      canCloseThreads: false,
      canMoveThreads: false,
      canManageCategories: false,
      canManageRoles: false,
      canAccessAdmin: false,
      canManageTickets: false,
      canViewInternalNotes: false,
      canBanUsers: false,
      canEditWiki: false,
    },
  ];

  const roles = {};
  for (const r of rolesData) {
    roles[r.name] = await prisma.role.upsert({
      where: { name: r.name },
      update: r,
      create: r,
    });
  }

  // 2. Benutzer erstellen (Passwort für alle: admin1234!)
  const passwordHash = await bcrypt.hash('admin1234!', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'CrimeLifeAdmin' },
    update: {},
    create: {
      username: 'CrimeLifeAdmin',
      email: 'admin@crimelife-network.de',
      passwordHash,
      roleId: roles.PROJEKTLEITUNG.id,
      bio: 'Projektleitung & Gründer von CrimeLife Network FiveM. Zuständig für Server-Infrastruktur & Community Leitung.',
      avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      fivemId: 'license:c1e4f9b8a2e7d3c0',
      discordTag: 'cln_admin#0001',
    },
  });

  const supporter = await prisma.user.upsert({
    where: { username: 'Support_Dave' },
    update: {},
    create: {
      username: 'Support_Dave',
      email: 'support@crimelife-network.de',
      passwordHash,
      roleId: roles.SUPPORTER.id,
      bio: 'Leitender Supporter für technische Hilfestellungen und Ingame-Support.',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      fivemId: 'license:d5a7b1c3e9f2a4b8',
      discordTag: 'dave_support#1337',
    },
  });

  const moderator = await prisma.user.upsert({
    where: { username: 'Mod_Sarah' },
    update: {},
    create: {
      username: 'Mod_Sarah',
      email: 'mod@crimelife-network.de',
      passwordHash,
      roleId: roles.MODERATOR.id,
      bio: 'Community Moderatorin. Achtet auf einen fairen und respektvollen Umgangston im Forum.',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      fivemId: 'license:e9f1a2b3c4d5e6f7',
      discordTag: 'sarah_mod#7777',
    },
  });

  const member = await prisma.user.upsert({
    where: { username: 'GTA_Veteran' },
    update: {},
    create: {
      username: 'GTA_Veteran',
      email: 'member@crimelife-network.de',
      passwordHash,
      roleId: roles.MITGLIED.id,
      bio: 'Begeisterter FiveM Roleplayer, Fraktionsleiter der Vagos und Forenveteran seit Tag 1.',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      fivemId: 'license:f3e2d1c0b9a8f7e6',
      discordTag: 'vagos_boss#2026',
    },
  });

  // 3. Thread-Präfixe
  const prefixesData = [
    { name: 'Wichtig', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
    { name: 'Ankündigung', color: '#965CFF', bgColor: 'rgba(150, 92, 255, 0.2)' },
    { name: 'Support', color: '#4C8DFF', bgColor: 'rgba(76, 141, 255, 0.2)' },
    { name: 'Vorschlag', color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.2)' },
    { name: 'In Prüfung', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.2)' },
    { name: 'Angenommen', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.2)' },
    { name: 'Abgelehnt', color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.2)' },
    { name: 'Erledigt', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.2)' },
  ];

  const prefixes = {};
  for (const p of prefixesData) {
    prefixes[p.name] = await prisma.threadPrefix.upsert({
      where: { name: p.name },
      update: p,
      create: p,
    });
  }

  // 4. Forenkategorien und Foren
  const categoriesData = [
    {
      name: 'CrimeLife Network',
      description: 'Offizielle Mitteilungen, Neuigkeiten und Versionsänderungen rund um das Projekt',
      icon: 'Shield',
      order: 1,
      forums: [
        { name: 'Ankündigungen', description: 'Wichtige Neuigkeiten und Ankündigungen der Projektleitung', icon: 'Megaphone', order: 1 },
        { name: 'Server Updates', description: 'Detailberichte über Serverwartungen, Downtimes und Hostupgrades', icon: 'Sparkles', order: 2 },
        { name: 'Changelogs', description: 'Patchnotizen, neue Skripte, MLOs und Bugfixes für FiveM', icon: 'FileCode', order: 3 },
        { name: 'Events', description: 'Groß angelegte Community Events, Turniere und Car-Meets', icon: 'Calendar', order: 4 },
      ],
    },
    {
      name: 'Community',
      description: 'Austausch, Diskussionen und Treffpunkt für alle Spieler von CrimeLife Network',
      icon: 'Users',
      order: 2,
      forums: [
        { name: 'Allgemeine Diskussionen', description: 'Gott und die Welt, allgemeine Gespräche & Off-Topic', icon: 'MessagesSquare', order: 1 },
        { name: 'Vorstellungen', description: 'Stelle dich und deinen RP-Charakter der Community vor', icon: 'UserCheck', order: 2 },
        { name: 'Fragen und Antworten', description: 'Schnelle Hilfe von Spielern für Spieler', icon: 'HelpCircle', order: 3 },
        { name: 'Medien und Screenshots', description: 'Die besten Schnappschüsse, Videos und Livestreams von Los Santos', icon: 'Image', order: 4 },
      ],
    },
    {
      name: 'FiveM',
      description: 'Spezifische Themen zu Gameplay, Fraktionen, Fahrzeugen und Entwicklung',
      icon: 'Gamepad2',
      order: 3,
      forums: [
        { name: 'Gameplay Diskussionen', description: 'Wirtschaftssystem, Berufe, Housing und Roleplay-Konzepte', icon: 'Layers', order: 1 },
        { name: 'Fraktionen', description: 'Präsentationen und Diskussionen von Bad-Factions und State-Factions (LSPD, EMS, FIB)', icon: 'ShieldAlert', order: 2 },
        { name: 'Fahrzeuge', description: 'Custom Autos, Handling-Feedback, Tuning und Fahrphysik', icon: 'Car', order: 3 },
        { name: 'Vorschläge', description: 'Ideen und Wünsche für neue Systeme und Funktionen', icon: 'Lightbulb', order: 4 },
        { name: 'Fehlermeldungen', description: 'Gefundene Bugs oder Synchronisationsfehler mit genauer Reproduktion melden', icon: 'Bug', order: 5 },
      ],
    },
    {
      name: 'Support & Hilfe',
      description: 'Offizieller Anlaufpunkt für Unterstützung und Anträge',
      icon: 'LifeBuoy',
      order: 4,
      forums: [
        { name: 'Allgemeine Hilfe', description: 'Anleitungen, Troubleshooting und Verbindungsprobleme', icon: 'HelpCircle', order: 1 },
        { name: 'Technische Probleme', description: 'Grafikfehler, Voice-Chat (SaltyChat/TokoVOIP) und Client-Crashes', icon: 'Wrench', order: 2 },
        { name: 'Entbannungsanträge', description: 'Reiche hier eine sachliche und ehrliche Entbannungsanfrage ein', icon: 'Key', order: 3 },
        { name: 'Beschwerden', description: 'Regelverstöße oder Fehlverhalten anderer Spieler bzw. Teammitglieder', icon: 'AlertTriangle', order: 4 },
      ],
    },
    {
      name: 'Bewerbungen',
      description: 'Werde Teil unseres Server-Teams oder gründe eine offizielle Fraktion',
      icon: 'Award',
      order: 5,
      forums: [
        { name: 'Team Bewerbungen', description: 'Bewerbungen als Supporter, Moderator oder Developer', icon: 'Award', order: 1 },
        { name: 'Fraktions Bewerbungen', description: 'Konzepte zur Gründung einer Gang, Mafia oder eines Unternehmens', icon: 'Briefcase', order: 2 },
        { name: 'Bewerbungsinformationen', description: 'Voraussetzungen, Bewerbungsvorlagen und Status der Bewerbungsphasen', icon: 'Info', order: 3 },
      ],
    },
  ];

  const forums = {};
  for (const catData of categoriesData) {
    const category = await prisma.category.create({
      data: {
        name: catData.name,
        description: catData.description,
        icon: catData.icon,
        order: catData.order,
      },
    });

    for (const fData of catData.forums) {
      const forum = await prisma.forum.create({
        data: {
          categoryId: category.id,
          name: fData.name,
          description: fData.description,
          icon: fData.icon,
          order: fData.order,
        },
      });
      forums[fData.name] = forum;
    }
  }

  // 5. Beispiel-Threads mit Posts
  // Thread 1: Willkommen bei CrimeLife Network v2.0
  const threadWelcome = await prisma.thread.create({
    data: {
      forumId: forums['Ankündigungen'].id,
      authorId: admin.id,
      prefixId: prefixes['Wichtig'].id,
      title: 'Willkommen bei CrimeLife Network 2.0 – Der Start einer neuen Ära!',
      isPinned: true,
      viewsCount: 342,
      repliesCount: 3,
      posts: {
        create: [
          {
            authorId: admin.id,
            content: `Herzlich willkommen auf dem offiziellen Community Forum von **CrimeLife Network**!

Nach monatelanger intensiver Entwicklungsarbeit freuen wir uns riesig, euch unser brandneues Forum sowie die bevorstehende Eröffnung unseres GTA V FiveM Servers präsentieren zu dürfen.

### Was erwartet euch auf CrimeLife Network?
- **Eigenentwickelte Systeme:** Ein hochgradig performantes Wirtschaftssystem, dynamische Drogenküchen, maßgeschneiderte MLOs und flüssiges Waffen-Balancing.
- **Aktives & faires Team:** Schneller Support, transparente Entscheidungen und professionelle Moderation.
- **Fokus auf echtes Roleplay:** Bei uns steht Charakterentwicklung an erster Stelle – keine sinnlosen Gambo-Schlachten ohne RP-Hintergrund!

Schaut euch gern in den Forenbereichen um, stellt eure Charaktere vor und schaut in unser [Wiki](/wiki) für das vollständige Regelwerk.

*Mit freundlichen Grüßen,*
**Eure CrimeLife Network Projektleitung**`,
          },
          {
            authorId: supporter.id,
            content: 'Glückwunsch zum erfolgreichen Relaunch! Das Forum sieht verdammt gut aus. Der Support steht ab sofort für all eure Fragen bereit!',
          },
          {
            authorId: member.id,
            content: 'Endlich ist es soweit! Die Vagos stehen schon in den Startlöchern. Los Santos gehört bald uns! 💥',
          },
        ],
      },
    },
  });

  // Thread 2: Umfrage zu neuem Tuning-System
  const threadChangelog = await prisma.thread.create({
    data: {
      forumId: forums['Changelogs'].id,
      authorId: admin.id,
      prefixId: prefixes['Ankündigung'].id,
      title: 'Changelog v2.1.0 – Großes Performance-Update & Custom Handling',
      isPinned: false,
      viewsCount: 189,
      repliesCount: 1,
      posts: {
        create: [
          {
            authorId: admin.id,
            content: `Guten Abend Community,

soeben wurde das Update **v2.1.0** auf unseren Server aufgespielt:

- ⚡ **Optimierte Tickrate:** Server-Resmon auf 0.8ms gesenkt.
- 🚗 **Fahrzeugphysik:** Handling für über 40 Import-Fahrzeuge überarbeitet. Bremswege wurden realistischer gestaltet.
- 💊 **Drogenrouten:** Neue verdeckte Labore im Norden hinzugefügt.
- 🔧 **Bugfix:** Problem mit der Kofferraum-Synchronisation behoben.

Feedback und Fehlerberichte bitte wie gewohnt im [Fehlermeldungen-Forum](/forum) posten!`,
          },
          {
            authorId: moderator.id,
            content: 'Top Update! Die Handling-Änderungen machen die Verfolgungsjagden für das LSPD deutlich anspruchsvoller.',
          },
        ],
      },
    },
  });

  // Thread 3 mit Poll in Vorschläge
  const threadPoll = await prisma.thread.create({
    data: {
      forumId: forums['Vorschläge'].id,
      authorId: member.id,
      prefixId: prefixes['Vorschlag'].id,
      title: 'Community Abstimmung: Sollen Drift-Events an den Wochenenden belohnt werden?',
      viewsCount: 215,
      repliesCount: 1,
      posts: {
        create: [
          {
            authorId: member.id,
            content: 'Hey zusammen! Was haltet ihr davon, wenn wir jeden Samstagabend offizielle Drift-Meisterschaften am Los Santos Airport veranstalten mit Ingame-Preisgeldern und Pokalen?',
          },
        ],
      },
      poll: {
        create: {
          question: 'Bist du für wöchentliche offizielle Drift-Events mit Preisgeld?',
          isMultiChoice: false,
          options: {
            create: [
              { text: 'Ja, absolut dafür! Bringt geile Abwechslung.', votesCount: 14 },
              { text: 'Nur, wenn die Polizei nicht direkt alles stürmt.', votesCount: 6 },
              { text: 'Nein, passt nicht zum Hardcore RP Konzept.', votesCount: 2 },
            ],
          },
        },
      },
    },
  });

  // 6. Support Ticket Kategorien
  const ticketCategoriesData = [
    { name: 'Allgemeiner Support', description: 'Allgemeine Fragen zum Account, Forum oder Gameplay', icon: 'LifeBuoy', requiresPlayerName: false, requiresEvidence: false },
    { name: 'Technischer Support', description: 'Probleme mit Teamspeak, SaltyChat, FiveM Crash oder Texturen', icon: 'Wrench', requiresPlayerName: false, requiresEvidence: false },
    { name: 'Spieler melden', description: 'Regelverstoß wie RDM, VDM, FailRP oder Metagaming melden', icon: 'ShieldAlert', requiresPlayerName: true, requiresEvidence: true },
    { name: 'Teammitglied melden', description: 'Beschwerden über unangemessenes Verhalten von Teammitgliedern', icon: 'AlertTriangle', requiresPlayerName: true, requiresEvidence: true },
    { name: 'Entbannungsantrag', description: 'Antrag auf Aufhebung einer Verwarnung oder eines Banns', icon: 'Key', requiresPlayerName: true, requiresEvidence: false },
    { name: 'Entwarnungsantrag', description: 'Antrag auf Löschung einer Ingame-Verwarnung (Warn)', icon: 'FileText', requiresPlayerName: false, requiresEvidence: false },
    { name: 'Fraktionsanliegen', description: 'Forderungen, Basen-Upgrades oder Beschwerden bezüglich Fraktionen', icon: 'Users', requiresPlayerName: false, requiresEvidence: false },
    { name: 'Sonstige Anliegen', description: 'Alle weiteren Themen, die in keine der obigen Kategorien passen', icon: 'HelpCircle', requiresPlayerName: false, requiresEvidence: false },
  ];

  const ticketCats = {};
  for (const tc of ticketCategoriesData) {
    ticketCats[tc.name] = await prisma.ticketCategory.upsert({
      where: { name: tc.name },
      update: tc,
      create: tc,
    });
  }

  // 7. Beispiel-Tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNumber: 'CLN-1001',
      categoryId: ticketCats['Spieler melden'].id,
      authorId: member.id,
      assignedToId: supporter.id,
      title: 'VDM Vorfall am Würfelpark',
      description: 'Gestern gegen 21:30 Uhr wurde ich ohne RP-Hintergrund mehrfach von einem schwarzen Sultan RS überfahren.',
      affectedPlayer: 'ID 47 (Max_Mustermann)',
      evidenceUrl: 'https://streamable.com/example-clip-vdm',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      messages: {
        create: [
          {
            authorId: member.id,
            content: 'Hier ist der Clip. Man sieht eindeutig, wie er absichtlich auf den Gehweg zieht und mich überrollt.',
            isInternalNote: false,
          },
          {
            authorId: supporter.id,
            content: 'Team-Notiz: Ich habe die Server-Logs zu dem Zeitpunkt geprüft. Spieler ID 47 war bereits mehrfach wegen ähnlicher Vorfälle auffällig. Ban vorbereiten.',
            isInternalNote: true, // INTERN!
          },
          {
            authorId: supporter.id,
            content: 'Hallo GTA_Veteran, vielen Dank für deine Meldung und das Beweisvideo. Wir bearbeiten den Fall und ziehen die entsprechende Sanktion durch.',
            isInternalNote: false,
          },
        ],
      },
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      ticketNumber: 'CLN-1002',
      categoryId: ticketCats['Allgemeiner Support'].id,
      authorId: member.id,
      title: 'Frage zu Fraktionsvoraussetzungen',
      description: 'Wie viele Mitglieder benötigen wir aktuell mindestens, um ein eigenes Fraktionskonzept einzureichen?',
      status: 'OPEN',
      priority: 'MEDIUM',
      messages: {
        create: [
          {
            authorId: member.id,
            content: 'Wir sind aktuell 7 aktive Spieler mit detailliertem Konzept für eine Motorrad-Gang (Lost MC). Reicht das für den Start?',
            isInternalNote: false,
          },
        ],
      },
    },
  });

  // 8. Wiki-Kategorien und Artikel
  const wikiCatRules = await prisma.wikiCategory.create({
    data: {
      name: 'Serverregeln & Richtlinien',
      description: 'Das verbindliche Grundgesetz für alle Spieler auf CrimeLife Network FiveM',
      icon: 'Shield',
      order: 1,
    },
  });

  const wikiCatGameplay = await prisma.wikiCategory.create({
    data: {
      name: 'Gameplay & Mechaniken',
      description: 'Wirtschaft, Berufe, Housing, Fahrzeuge und Tastaturbelegung',
      icon: 'Gamepad2',
      order: 2,
    },
  });

  const wikiCatFactions = await prisma.wikiCategory.create({
    data: {
      name: 'Fraktionen & Kriminalität',
      description: 'Regeln für Geiselnahmen, Banküberfälle, Sperrzonen und Fraktionskriege',
      icon: 'Sword',
      order: 3,
    },
  });

  // Artikel 1: Allgemeine Serverregeln
  await prisma.wikiArticle.create({
    data: {
      categoryId: wikiCatRules.id,
      authorId: admin.id,
      title: '§ 1 Grundregeln & RP-Verständnis',
      slug: 'grundregeln-rp-verstaendnis',
      content: `## 1.1 Allgemeines Verhalten
Auf CrimeLife Network legen wir allergrößten Wert auf ein immersives, realistisches und faires Roleplay-Erlebnis. 
Respektloses Verhalten OOC (Out of Character), Rassismus, Sexismus, Diskriminierung oder Beleidigungen unter der Gürtellinie führen zum sofortigen permanenten Ausschluss aus der gesamten Community.

## 1.2 RDM (Random Deathmatch) & VDM (Vehicle Deathmatch)
- **RDM:** Das Töten oder Angreifen von Spielern ohne plausiblen RP-Hintergrund und ohne vorherige eindeutige Schussankündigung ist strengstens untersagt.
- **VDM:** Das absichtliche Überfahren oder Rammen von Spielern mit Fahrzeugen als Waffe ist verboten.

## 1.3 Power-RP & Fail-RP
- Aktionen müssen realistisch nachvollziehbar sein. Du darfst anderen Spielern keine Handlungen aufzwingen, gegen die sie logisch keine Chance zur Gegenwehr haben.
- Das Schützen des eigenen Lebens ("Fear-RP") ist Pflicht! Wer vor 3 gezogenen Waffen einer feindlichen Gang seine eigene Waffe zieht, begeht schweres Fail-RP.

## 1.4 New-Life-Regel (NLR)
Wenn dein Charakter im RP bewusstlos wird und vom Notarzt (EMS) im Krankenhaus wiederbelebt wird, vergisst dein Charakter sämtliche Geschehnisse der Situation, die zum Tod geführt haben. Racheaktionen sind unzulässig.`,
      isPublished: true,
      viewsCount: 1420,
      order: 1,
    },
  });

  // Artikel 2: Fraktionsrichtlinien
  await prisma.wikiArticle.create({
    data: {
      categoryId: wikiCatFactions.id,
      authorId: admin.id,
      title: 'Fraktionsrichtlinien & Kriminalität',
      slug: 'fraktionsrichtlinien-kriminalitaet',
      content: `## 2.1 Fraktionsgrößen
Offizielle Gangs und Mafien dürfen maximal aus 15 Mitgliedern bestehen. Bei State-Fraktionen (LSPD, EMS, Justiz) gibt es dynamische Obergrenzen je nach Serverpopulation.

## 2.2 Geiselnahmen & Raubüberfälle
- Fake-Geiseln (z.B. Freunde oder Fraktionsmitglieder) sind strikt verboten.
- Bei jedem Überfall muss eine faire Verhandlungsbasis mit den Einsatzkräften der Polizei bestehen.
- Maximalforderungen für Geiseln sind im Regelwerk auf 25.000$ pro Zivilist begrenzt.

## 2.3 Schussankündigung
Eine Schussankündigung muss verbal, verständlich und mit angemessener Reaktionszeit (mindestens 5 Sekunden) erfolgen. Schüsse ohne klare Fristsetzung sind unzulässig.`,
      isPublished: true,
      viewsCount: 890,
      order: 2,
    },
  });

  // 9. Benachrichtigungen für Admin
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: 'TICKET_UPDATE',
        title: 'Neues Support-Ticket',
        message: 'Ein neues Ticket (CLN-1002) wurde in der Kategorie Allgemeiner Support erstellt.',
        link: '/support/ticket/CLN-1002',
        isRead: false,
      },
      {
        userId: admin.id,
        type: 'REPLY',
        title: 'Neue Antwort auf dein Thema',
        message: 'GTA_Veteran hat auf "Willkommen bei CrimeLife Network 2.0" geantwortet.',
        link: `/forum/thread/${threadWelcome.id}`,
        isRead: true,
      },
    ],
  });

  console.log('CrimeLife Network database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
