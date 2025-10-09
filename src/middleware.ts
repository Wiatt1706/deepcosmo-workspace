import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// 极简路由配置
const PROTECTED_ROUTES = ["/dashboard", "/settings", "/profile", "/workspace"];
const PUBLIC_FILE = /(\.(.*)$)/;
const DEFAULT_LOCALE = routing.defaultLocale ?? "zh";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源和API直接跳过
  if (pathname.startsWith("/api") || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  // 处理根路径：优先使用 NEXT_LOCALE cookie，其次使用默认语言
  if (pathname === "/") {
    const nextLocaleCookie = request.cookies.get("NEXT_LOCALE")?.value;
    type SupportedLocale = (typeof routing.locales)[number];
    let targetLocale: SupportedLocale = DEFAULT_LOCALE as SupportedLocale;

    if (nextLocaleCookie && (routing.locales as readonly string[]).includes(nextLocaleCookie)) {
      targetLocale = nextLocaleCookie as SupportedLocale;
    }

    return NextResponse.redirect(new URL(`/${targetLocale}`, request.url));
  }

  // 应用国际化中间件
  const response = intlMiddleware(request);
  if (response.headers.get("Location")) {
    return response;
  }

  // 极简鉴权逻辑
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  
  if (isProtectedRoute(pathWithoutLocale)) {
    const token = request.cookies.get("access_token")?.value;
    
    if (!token) {
      const locale = routing.locales.find(locale => 
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
      ) || DEFAULT_LOCALE;
      
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  return NextResponse.next();
}

function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some(route => 
    path === route || path.startsWith(`${route}/`)
  );
}

function getPathWithoutLocale(pathname: string): string {
  const localePrefix = routing.locales.find(
    locale => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (localePrefix) {
    const pathWithoutLocale = pathname.replace(`/${localePrefix}`, "") || "/";
    return pathWithoutLocale.startsWith("/") ? pathWithoutLocale : `/${pathWithoutLocale}`;
  }

  return pathname;
}
