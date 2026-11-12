import { NextRequest, NextResponse } from 'next/server';
import { CaptchaService } from '@/lib/captcha/service';
import { generateCaptchaWav } from '@/lib/captcha/audioGenerator';
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
    // Rate Limit für Audioabrufe
    const rl = await checkAndIncrementRateLimit(
      `rl:cpt_audio:${challengeId}:${ip}`,
      CAPTCHA_RATE_LIMITS.AUDIO_PER_MIN,
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

    // WAV Audio generieren
    const wavBuffer = generateCaptchaWav(code);

    return new NextResponse(Uint8Array.from(wavBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': wavBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err: any) {
    console.error('Error rendering CAPTCHA audio:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
