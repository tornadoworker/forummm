import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        forums: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const prefixes = await prisma.threadPrefix.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories, prefixes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
