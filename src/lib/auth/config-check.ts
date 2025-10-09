/**
 * 认证配置检查工具
 * 帮助诊断OAuth配置问题
 */

export function checkAuthConfig() {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 检查环境变量
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    issues.push("缺少 NEXT_PUBLIC_SUPABASE_URL 环境变量");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    issues.push("缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量");
  }

  if (!process.env.NEXT_PUBLIC_FRONTEND_URL) {
    warnings.push("建议设置 NEXT_PUBLIC_FRONTEND_URL 环境变量");
  }

  // 检查URL格式
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL 应该使用 HTTPS");
  }

  if (process.env.NEXT_PUBLIC_FRONTEND_URL && !process.env.NEXT_PUBLIC_FRONTEND_URL.startsWith('http')) {
    issues.push("NEXT_PUBLIC_FRONTEND_URL 应该包含协议 (http:// 或 https://)");
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    recommendations: [
      "确保在 Supabase 控制台中正确配置了 OAuth 提供商",
      "检查重定向 URL 是否包含正确的语言前缀 (如 /zh/auth/callback)",
      "确保 GitHub OAuth 应用的回调 URL 设置正确",
      "检查 Supabase 项目设置中的 Site URL 配置"
    ]
  };
}

// 在开发环境中自动检查配置
if (process.env.NODE_ENV === 'development') {
  const config = checkAuthConfig();
  
  if (!config.isValid) {
    console.error("🚨 认证配置问题:", config.issues);
  }
  
  if (config.warnings.length > 0) {
    console.warn("⚠️ 认证配置警告:", config.warnings);
  }
  
  if (config.recommendations.length > 0) {
    console.info("💡 建议:", config.recommendations);
  }
}
