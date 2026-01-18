import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // These must match your message files
  locales: ['en', 'si'],
  defaultLocale: 'en'
});

export const config = {
  // Apply only to dashboard (safe, scoped)
  matcher: ['/dashboard/:path*']
};
