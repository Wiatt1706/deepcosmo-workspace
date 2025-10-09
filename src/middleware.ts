import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// 路由鉴权配置
const routeConfig = {
  // 公开路由 - 无需鉴权
  public: [
    "/", // 首页
    "/login", // 登录页
    "/editor/*", // 编辑器相关
    "/register", // 注册页
    "/forgot-password", // 忘记密码
    "/reset-password", // 重置密码
    "/about", // 关于页面
    "/contact", // 联系页面
    "/privacy", // 隐私政策
    "/terms", // 服务条款
    "/api/auth/*", // 认证相关API
    "/api/common/*", // 公共API
  ],

  // 需要鉴权的路由 - 明确指定需要鉴权的路径
  protected: [
    "/dashboard/*", // 仪表板相关
    "/editor/*", // 编辑器相关
    "/spreadsheets/*", // 电子表格相关
    "/settings/*", // 设置相关
    "/profile/*", // 用户资料相关
    "/workspace/*", // 工作空间相关
  ],

  // 排除鉴权的路由 - 即使匹配了protected模式也会被排除
  excluded: [
    "/dashboard/public", // 仪表板中的公开页面
    "/product/public", // 产品中的公开页面
  ],
};

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

  if (isRouteProtected(pathWithoutLocale)) {
    const token = request.cookies.get("access_token")?.value;
    console.log("token", token);
    if (!token) {
      const locale = routing.locales.find(locale =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
      ) || DEFAULT_LOCALE;

      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }
  return NextResponse.next();
}

/**
 * 检查路由是否需要鉴权
 * @param path 无语言前缀的路径
 * @returns 是否需要鉴权
 */
function isRouteProtected(path: string): boolean {
  // 1. 检查是否为公开路由
  if (isPathMatch(path, routeConfig.public)) {
    return false;
  }

  // 2. 检查是否在排除列表中
  if (isPathMatch(path, routeConfig.excluded)) {
    return false;
  }

  // 3. 检查是否匹配需要鉴权的路由
  if (isPathMatch(path, routeConfig.protected)) {
    return true;
  }

  // 4. 默认策略：如果明确配置了protected路由，则其他路由不需要鉴权
  // 如果希望默认所有路由都需要鉴权，可以改为 return true;
  return false;
}

/**
 * 检查路径是否匹配模式列表
 * @param path 要检查的路径
 * @param patterns 模式列表
 * @returns 是否匹配
 */
function isPathMatch(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.endsWith("/*")) {
      const base = pattern.slice(0, -2); // 移除末尾的/*
      return path === base || path.startsWith(`${base}/`);
    }
    return path === pattern;
  });
}

// 提取无语言前缀的路径
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
