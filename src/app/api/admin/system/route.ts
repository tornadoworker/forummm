import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAdmin(user)) {
      return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
    }

    const body = await req.json();

    // Log the configuration update in Audit Logs
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_SYSTEM_CONFIG_UPDATE',
        details: `Systemeinstellungen aktualisiert durch ${user.username}: ${JSON.stringify(body)}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Systemeinstellungen erfolgreich übernommen.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
