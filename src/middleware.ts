import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('architect_session')?.value;
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isResetPage = request.nextUrl.pathname.startsWith('/reset-password');
  const isAuthApi = request.nextUrl.pathname.startsWith('/api/auth');
  
  // Let static assets and public routes pass
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    isAuthApi
  ) {
    return NextResponse.next();
  }

  // If trying to access login/reset pages
  if (isLoginPage || isResetPage) {
    if (token) {
       return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If no token, handle redirect/401
  if (!token) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Pass through (token will be verified by the API routes/server components)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
