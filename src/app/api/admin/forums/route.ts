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

    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        forums: {
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          include: {
            parent: true,
            subforums: {
              orderBy: [{ order: 'asc' }, { name: 'asc' }],
              include: {
                _count: { select: { threads: true } },
              },
            },
            _count: { select: { threads: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, categories });
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

    const { categoryId, name, description, icon, parentId, rules, order } = await req.json();

    if (!name || (!categoryId && !parentId)) {
      return NextResponse.json(
        { error: 'Name und Kategorie (oder übergeordnetes Forum) erforderlich.' },
        { status: 400 }
      );
    }

    let resolvedCategoryId = categoryId;
    if (parentId && !resolvedCategoryId) {
      const parentForum = await prisma.forum.findUnique({ where: { id: parentId } });
      if (parentForum) {
        resolvedCategoryId = parentForum.categoryId;
      }
    }

    const forum = await prisma.forum.create({
      data: {
        categoryId: resolvedCategoryId,
        parentId: parentId || null,
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || 'MessageSquare',
        rules: rules?.trim() || null,
        order: typeof order === 'number' ? order : 0,
      },
      include: {
        parent: true,
        _count: { select: { threads: true } },
      },
    });

    // Automatisch ein Kind-Archiv für dieses Forum anlegen, falls noch keines existiert
    if (name.trim().toLowerCase() !== 'archiv') {
      try {
        await prisma.forum.create({
          data: {
            categoryId: resolvedCategoryId,
            parentId: forum.id,
            name: 'Archiv',
            description: `Archiv für abgelehnte und geschlossene Themen in ${forum.name}`,
            icon: 'Archive',
            rules: 'Dieses Archiv ist schreibgeschützt. Themen werden hierhin automatisch verschoben, sobald sie abgelehnt werden.',
            isArchived: true,
            order: 999,
          },
        });
      } catch (archErr) {
        console.warn('Archiv creation error:', archErr);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_CREATE_FORUM',
        targetType: 'FORUM',
        targetId: forum.id,
        details: `Neues ${parentId ? 'Unterforum' : 'Forum'} erstellt: ${forum.name}`,
      },
    });

    return NextResponse.json({ success: true, forum });
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

    const { forumId, name, description, icon, parentId, rules, order, categoryId } = await req.json();

    if (!forumId || !name) {
      return NextResponse.json({ error: 'Forum-ID und Name erforderlich.' }, { status: 400 });
    }

    // Circular dependency check
    if (parentId && parentId === forumId) {
      return NextResponse.json({ error: 'Ein Forum kann nicht sein eigenes Unterforum sein.' }, { status: 400 });
    }

    const forum = await prisma.forum.update({
      where: { id: forumId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || 'MessageSquare',
        parentId: parentId || null,
        rules: rules?.trim() || null,
        order: typeof order === 'number' ? order : 0,
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        parent: true,
        _count: { select: { threads: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_UPDATE_FORUM',
        targetType: 'FORUM',
        targetId: forum.id,
        details: `Forum aktualisiert: ${forum.name}`,
      },
    });

    return NextResponse.json({ success: true, forum });
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
    const forumId = searchParams.get('forumId');

    if (!forumId) {
      return NextResponse.json({ error: 'Forum-ID erforderlich.' }, { status: 400 });
    }

    const existing = await prisma.forum.findUnique({
      where: { id: forumId },
      include: { subforums: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Forum nicht gefunden.' }, { status: 404 });
    }

    // Wenn es Unterforen hat, deren parentId auf null setzen
    if (existing.subforums && existing.subforums.length > 0) {
      await prisma.forum.updateMany({
        where: { parentId: forumId },
        data: { parentId: null },
      });
    }

    // Forum löschen
    await prisma.forum.delete({
      where: { id: forumId },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_DELETE_FORUM',
        targetType: 'FORUM',
        targetId: forumId,
        details: `Forum gelöscht: ${existing.name}`,
      },
    });

    return NextResponse.json({ success: true, message: 'Forum erfolgreich gelöscht.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
