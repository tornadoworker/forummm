import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/permissions';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
    }

    const prefixes = await prisma.threadPrefix.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { threads: true } },
      },
    });

    return NextResponse.json({ success: true, prefixes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
    }

    const { name, color, bgColor, isActive, isRequired, order, forumIds } = await req.json();

    if (!name || !color) {
      return NextResponse.json({ error: 'Name und Farbe erforderlich.' }, { status: 400 });
    }

    const prefix = await prisma.threadPrefix.create({
      data: {
        name: name.trim(),
        color,
        bgColor: bgColor || `${color}20`,
        isActive: isActive !== false,
        isRequired: Boolean(isRequired),
        order: typeof order === 'number' ? order : 0,
        forumIds: forumIds ? (Array.isArray(forumIds) ? JSON.stringify(forumIds) : forumIds) : null,
      },
      include: {
        _count: { select: { threads: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_CREATE_PREFIX',
        targetType: 'PREFIX',
        targetId: prefix.id,
        details: `Neuer Präfix erstellt: ${prefix.name}`,
      },
    });

    return NextResponse.json({ success: true, prefix });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
    }

    const { prefixId, name, color, bgColor, isActive, isRequired, order, forumIds } = await req.json();

    if (!prefixId || !name || !color) {
      return NextResponse.json({ error: 'Präfix-ID, Name und Farbe erforderlich.' }, { status: 400 });
    }

    const prefix = await prisma.threadPrefix.update({
      where: { id: prefixId },
      data: {
        name: name.trim(),
        color,
        bgColor: bgColor || `${color}20`,
        isActive: isActive !== false,
        isRequired: Boolean(isRequired),
        order: typeof order === 'number' ? order : 0,
        forumIds: forumIds ? (Array.isArray(forumIds) ? JSON.stringify(forumIds) : forumIds) : null,
      },
      include: {
        _count: { select: { threads: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_UPDATE_PREFIX',
        targetType: 'PREFIX',
        targetId: prefix.id,
        details: `Präfix aktualisiert: ${prefix.name}`,
      },
    });

    return NextResponse.json({ success: true, prefix });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const prefixId = searchParams.get('prefixId');

    if (!prefixId) {
      return NextResponse.json({ error: 'Präfix-ID erforderlich.' }, { status: 400 });
    }

    const existing = await prisma.threadPrefix.findUnique({
      where: { id: prefixId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Präfix nicht gefunden.' }, { status: 404 });
    }

    // Wenn Themen diesen Präfix haben, prefixId auf null setzen
    await prisma.thread.updateMany({
      where: { prefixId },
      data: { prefixId: null },
    });

    await prisma.threadPrefix.delete({
      where: { id: prefixId },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_DELETE_PREFIX',
        targetType: 'PREFIX',
        targetId: prefixId,
        details: `Präfix gelöscht: ${existing.name}`,
      },
    });

    return NextResponse.json({ success: true, message: 'Präfix erfolgreich gelöscht.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
