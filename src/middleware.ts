import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Redirect www to non-www
function redirectWWW(request) {
  const url = request.nextUrl;
  if (url.hostname.startsWith('www.')) {
    url.hostname = url.hostname.replace('www.', '');
    return NextResponse.redirect(url, 301); // Permanent redirect
  }
  return null;
}

export default clerkMiddleware((auth, request) => {
  // First check for www redirect
  const wwwRedirect = redirectWWW(request);
  if (wwwRedirect) return wwwRedirect;
  
  // Then continue with normal Clerk auth
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};