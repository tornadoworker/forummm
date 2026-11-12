import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { type } = await req.json();
    if (type !== 'avatar' && type !== 'banner') return NextResponse.json({ error: 'Ungültiger Bildtyp.' }, { status: 400 });
    const isBanner = type === 'banner';

    const field = isBanner ? 'bannerUrl' : 'avatarUrl';
    const subDir = isBanner ? 'banners' : 'avatars';
    const oldUrl = user[field];
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id, [field]: oldUrl }, data: { [field]: null } });
      if (oldUrl?.startsWith(`/uploads/${subDir}/`)) {
        await tx.publicUpload.deleteMany({ where: { url: oldUrl } });
      }
    });

    return NextResponse.json({
      success: true,
      message: `${isBanner ? 'Profilbanner' : 'Avatar'} erfolgreich entfernt.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
