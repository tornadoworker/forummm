import { prisma } from '../src/lib/prisma';

async function main() {
  const cat = await prisma.category.findFirst();
  if (!cat) throw new Error('No category found');

  let statsForum = await prisma.forum.findFirst({ where: { name: 'Live Statistik' } });
  if (!statsForum) {
    statsForum = await prisma.forum.create({
      data: {
        name: 'Live Statistik',
        description: 'Offizielle Ranglisten für FiveM Kills, Tode, K/D-Werte und Fraktionserfolge auf Vega Crimelife.',
        order: 4,
        categoryId: cat.id,
        isArchived: false,
        subforums: {
          create: [
            { name: 'Spieler-Ranglisten', description: 'Top 100 Schützen, K/D-Vergleich und Kills', categoryId: cat.id, order: 1 },
            { name: 'Fraktions-Statistiken', description: 'Gang- und Fraktionswertungen im direkten Vergleich', categoryId: cat.id, order: 2 },
            { name: 'Bester Shooter', description: 'Die besten Schützen und Headshot-Leaderboards', categoryId: cat.id, order: 3 },
          ]
        }
      }
    });
    console.log('Created Live Statistik forum:', statsForum.id);
  } else {
    console.log('Live Statistik forum already exists:', statsForum.id);
  }

  let compForum = await prisma.forum.findFirst({ where: { name: 'Wettbewerbe' } });
  if (!compForum) {
    compForum = await prisma.forum.create({
      data: {
        name: 'Wettbewerbe',
        description: '1v1 Duelle, Team-Turniere und offizielle Community-Wettkämpfe auf Vega Crimelife.',
        order: 5,
        categoryId: cat.id,
        isArchived: false,
        subforums: {
          create: [
            { name: '1v1 Duelle & Herausforderungen', description: 'Spieler gegen Spieler Duelle und Matchups', categoryId: cat.id, order: 1 },
            { name: 'Team- & Fraktions-Turniere', description: 'Offizielle Turniere, Spielpläne und Brackets', categoryId: cat.id, order: 2 },
            { name: 'Match-Ergebnisse & Archiv', description: 'Bestätigte Sieger und Duell-Historie', categoryId: cat.id, order: 3 },
          ]
        }
      }
    });
    console.log('Created Wettbewerbe forum:', compForum.id);
  } else {
    console.log('Wettbewerbe forum already exists:', compForum.id);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
