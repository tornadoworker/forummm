import { prisma } from '../src/lib/prisma';

const RULES_CONTENT = `Willkommen im offiziellen Forum von **VEGA CrimeLife**. Um ein faires, respektvolles und konstruktives Miteinander auf unserer Plattform zu gewährleisten, ist das folgende Regelwerk für alle registrierten Mitglieder ausnahmslos verbindlich.

---

### 1. Respekt
Beleidigungen, Diskriminierung, Drohungen und gezielte Provokationen sind verboten. Kritik bleibt sachlich.

### 2. Themen & Beiträge
Nutze passende Kategorien und verständliche Titel. Spam, Doppelposts und absichtliches Stören von Diskussionen sind untersagt.

### 3. Verbotene Inhalte
Keine rechtswidrigen, pornografischen oder gewaltverherrlichenden Inhalte. Schadsoftware, Phishing und unerlaubte Werbung sind verboten.

### 4. Datenschutz
Veröffentliche keine privaten Daten, Nachrichten oder vertraulichen Ticketinhalte ohne Zustimmung. Sensible Beweise gehören in den Support.

### 5. Accounts & Profile
Keine Identitätstäuschung oder zusätzlichen Accounts zur Umgehung von Sperren. Namen, Avatare und Signaturen müssen regelkonform sein.

### 6. Beschwerden & Beweise
Melde Verstöße über die vorgesehenen Funktionen. Öffentliche Hetze, falsche Anschuldigungen und manipulierte Beweise sind verboten.

### 7. Wettbewerbe & Statistiken
Anmeldungen und Ergebnisse müssen wahrheitsgemäß sein. Ranglisten, Abstimmungen und Bewertungen dürfen nicht manipuliert werden.

### 8. Moderation & Konsequenzen
Verstöße können zu Verwarnungen, Inhaltslöschungen oder Sperren führen. Moderationsentscheidungen dürfen sachlich über den Support angefochten werden.

---

*Gültig ab sofort für alle Bereiche des VEGA CrimeLife Forums. Bei Fragen oder Unklarheiten steht das Support-Team über das Ticket-System zur Verfügung.*`;

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: { canAccessAdmin: true } },
  });
  if (!admin) throw new Error('No admin user found');

  const forum = await prisma.forum.findFirst({
    where: { name: 'Server-Regeln' },
  });
  if (!forum) throw new Error('Server-Regeln forum not found');

  // Prefix suchen (z. B. "Wichtig" oder "Ankündigung")
  const prefix = await prisma.threadPrefix.findFirst({
    where: { name: { in: ['Wichtig', 'Ankündigung', 'Information'] } },
  });

  const threadTitle = 'Forum Regelwerk | VEGA CrimeLife';

  // Prüfen ob bereits existiert
  let thread = await prisma.thread.findFirst({
    where: { title: threadTitle, forumId: forum.id },
  });

  if (thread) {
    console.log('Thread exists, updating content:', thread.id);
    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        isPinned: true,
        isLocked: true,
        prefixId: prefix?.id || null,
      },
    });

    const firstPost = await prisma.post.findFirst({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
    });

    if (firstPost) {
      await prisma.post.update({
        where: { id: firstPost.id },
        data: { content: RULES_CONTENT },
      });
    }
  } else {
    console.log('Creating new official thread:', threadTitle);
    thread = await prisma.thread.create({
      data: {
        title: threadTitle,
        forumId: forum.id,
        authorId: admin.id,
        prefixId: prefix?.id || null,
        isPinned: true,
        isLocked: true,
        posts: {
          create: {
            content: RULES_CONTENT,
            authorId: admin.id,
          },
        },
      },
    });
    console.log('Created thread with ID:', thread.id);
  }

  // Auch Wiki / Regelwerk-Artikel aktualisieren/anlegen
  let wikiCat = await prisma.wikiCategory.findFirst({
    where: { name: { contains: 'Regel' } },
  });
  if (!wikiCat) {
    wikiCat = await prisma.wikiCategory.create({
      data: {
        name: 'Offizielles Regelwerk',
        order: 1,
      },
    });
  }

  await prisma.wikiArticle.upsert({
    where: { slug: 'forum-regelwerk' },
    update: {
      title: 'Forum Regelwerk | VEGA CrimeLife',
      content: RULES_CONTENT,
      isPublished: true,
      categoryId: wikiCat.id,
    },
    create: {
      title: 'Forum Regelwerk | VEGA CrimeLife',
      slug: 'forum-regelwerk',
      content: RULES_CONTENT,
      isPublished: true,
      authorId: admin.id,
      categoryId: wikiCat.id,
      order: 1,
    },
  });

  console.log('Wiki article updated/created.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
