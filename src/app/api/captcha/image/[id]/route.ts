import { NextRequest, NextResponse } from 'next/server';
import { CaptchaService } from '@/lib/captcha/service';
import { generateCaptchaPng } from '@/lib/captcha/imageGenerator';
import { getClientIp, checkAndIncrementRateLimit } from '@/lib/captcha/rateLimiter';
import { CAPTCHA_RATE_LIMITS } from '@/lib/captcha/constants';

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const challengeId = params.id;

    if (!challengeId) {
      return new NextResponse('Challenge ID missing', { status: 400 });
    }

    const ip = getClientIp(req);
    // Rate Limit für Bildabrufe (verhindert Denial-of-Service / Scraping)
    const rl = await checkAndIncrementRateLimit(
      `rl:cpt_img:${challengeId}:${ip}`,
      CAPTCHA_RATE_LIMITS.IMAGE_PER_MIN,
      60
    );
    if (!rl.allowed) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }

    const code = await CaptchaService.getCodeForRendering(challengeId);
    if (!code) {
      return new NextResponse('CAPTCHA expired or invalid', {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // PNG Bild generieren
    const pngBuffer = generateCaptchaPng(code);

    return new NextResponse(Uint8Array.from(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err: any) {
    console.error('Error rendering CAPTCHA image:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
