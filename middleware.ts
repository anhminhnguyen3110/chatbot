import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { guestRegex, isDevelopmentEnvironment } from './lib/constants';
import { nanoid } from 'nanoid';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // Log the incoming request (skip for static assets)
  const shouldLog = !pathname.startsWith('/_next/') && 
                    !pathname.includes('.') && 
                    pathname !== '/favicon.ico';
  
  let requestId: string | undefined;
  if (shouldLog) {
    requestId = nanoid();
    
    // Parse request details
    const searchParams = request.nextUrl.searchParams;
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Get request body for POST/PUT requests
    let requestBody: any = null;
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      try {
        // Clone request to avoid consuming the body
        const clonedRequest = request.clone();
        const contentType = request.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          requestBody = await clonedRequest.json();
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          const formData = await clonedRequest.formData();
          requestBody = Object.fromEntries(formData.entries());
        } else if (contentType?.includes('text/')) {
          requestBody = await clonedRequest.text();
        }
      } catch (error) {
        requestBody = 'Unable to parse request body';
      }
    }
    
    console.log(`${request.method} ${pathname}`, {
      requestId,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      body: requestBody,
      contentType: request.headers.get('content-type')
    });
  }

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: false,
  });

  if (!token) {
    const redirectUrl = encodeURIComponent(request.url);

    return NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url),
    );
  }

  const isGuest = guestRegex.test(token?.email ?? '');

  if (token && !isGuest && ['/login', '/register'].includes(pathname)) {
    const response = NextResponse.redirect(new URL('/', request.url));
    if (requestId) {
      response.headers.set('X-Request-ID', requestId);
      
      // Log redirect response
      if (shouldLog) {
        console.log(`Response: ${request.method} ${pathname}`, {
          requestId,
          status: 302,
          statusText: 'Found',
          redirectTo: response.headers.get('location'),
          type: 'redirect'
        });
      }
    }
    return response;
  }

  const response = NextResponse.next();
  if (requestId) {
    response.headers.set('X-Request-ID', requestId);
    
    // Log response for API routes and pages
    if (shouldLog) {
      // We can't easily access the response body in middleware for streaming responses
      // But we can log basic response metadata
      console.log(`Response: ${request.method} ${pathname}`, {
        requestId,
        status: response.status || 200,
        statusText: response.statusText || 'OK',
        contentType: response.headers.get('content-type'),
        type: 'next'
      });
    }
  }
  return response;
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
