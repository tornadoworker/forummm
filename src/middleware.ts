import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware for Global Security Enforcements:
 * - CSRF verification on state-changing API endpoints
 * - Open Redirect validation on login/redirect query parameters
 * - Response security headers
 */

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const method = req.method.toUpperCase();

  // 1. Open Redirect Protection
  const redirectParam = searchParams.get('redirect');
  if (redirectParam) {
    // Only allow relative paths starting with a single '/'
    const isSafeRelative = redirectParam.startsWith('/') && !redirectParam.startsWith('//');
    const isDangerous =
      redirectParam.includes('://') ||
      redirectParam.toLowerCase().startsWith('javascript:') ||
      redirectParam.toLowerCase().startsWith('data:');

    if (!isSafeRelative || isDangerous) {
      // Sanitize by dropping dangerous redirect target
      const cleanUrl = req.nextUrl.clone();
      cleanUrl.searchParams.delete('redirect');
      return NextResponse.redirect(cleanUrl);
    }
  }

  // 2. CSRF Protection for mutating API routes (POST, PUT, PATCH, DELETE)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/v1/')) {
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (isMutating) {
      const origin = req.headers.get('origin');
      const referer = req.headers.get('referer');
      const host = req.headers.get('host');

      // Check if origin/referer is present and matches the host
      if (origin || referer) {
        const sourceUrl = origin || referer;
        try {
          const parsed = new URL(sourceUrl!);
          const hostOnly = host?.split(':')[0]?.toLowerCase();
          const parsedHostOnly = parsed.hostname.toLowerCase();

          const isMatch =
            (host && parsed.host.toLowerCase() === host.toLowerCase()) ||
            parsedHostOnly === hostOnly ||
            (process.env.NODE_ENV !== 'production' &&
              (parsedHostOnly === 'localhost' || parsedHostOnly === '127.0.0.1'));

          if (!isMatch) {
            return NextResponse.json(
              { error: 'CSRF_BLOCKED: Ungültige Anfrageherkunft.' },
              { status: 403 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: 'CSRF_BLOCKED: Fehlerhafter Header.' },
            { status: 403 }
          );
        }
      }
    }
  }

  // Proceed with request
  const response = NextResponse.next();

  // Enforce no-store on sensitive API endpoints
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
