import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n } from './i18n-config';

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language') ?? '';
  const preferredLanguage = acceptLanguage.split(',')[0].split('-')[0];

  if (i18n.locales.includes(preferredLanguage as any)) {
      return preferredLanguage;
  }
  
  return i18n.defaultLocale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    
    // Redirecciona a la URL con el prefijo del idioma.
    // Ej: /about -> /es/about
    // Ej: / -> /es
    return NextResponse.redirect(
      new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url)
    );
  }
}

export const config = {
  matcher: [
    // Omitir todas las rutas internas (api, _next/static, _next/image, etc.)
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
