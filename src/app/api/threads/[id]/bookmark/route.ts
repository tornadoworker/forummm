import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { id: threadId } = await params;

    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_threadId: {
          userId: user.id,
          threadId,
        },
      },
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ success: true, bookmarked: false });
    } else {
      await prisma.bookmark.create({
        data: {
          userId: user.id,
          threadId,
        },
      });
      return NextResponse.json({ success: true, bookmarked: true });
    }
  } catch (err: any) {
    console.error('Bookmark error:', err);
    return NextResponse.json({ error: 'Fehler beim Speichern des Lesezeichens.' }, { status: 500 });
  }
}
