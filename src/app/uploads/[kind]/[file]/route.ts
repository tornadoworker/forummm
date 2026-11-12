import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; file: string }> }) {
  const { kind, file } = await params;
  const upload = await prisma.publicUpload.findUnique({ where: { url: `/uploads/${kind}/${file}` } });
  if (!upload) return new Response(null, { status: 404 });

  return new Response(upload.content, {
    headers: {
      'Content-Type': upload.mimeType,
      'Content-Length': upload.content.byteLength.toString(),
      'Cache-Control': 'public, max-age=300',
    },
  });
}
