// 环境变量配置
const env = {
  // API基础URL
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://10.1.1.11:8798",
  // 前端域名
  FRONTEND_BASE_URL:
    process.env.NEXT_PUBLIC_API_USER || "http://localhost:3000",
  // API路由URL
  API_ROUTE_URL: process.env.NEXT_PUBLIC_API_ROUTE_URL || "/api",
  // 认证服务URL
  AUTH_SERVICE_URL: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "",
  // 是否是生产环境
  isProd: process.env.NODE_ENV === "production",
  // 加密
  MD5_SALT_KEY: process.env.NEXT_PUBLIC_API_KEY || "",
  // WebSocket URL
  WS_URL: process.env.WS_URL || "wss://ws.matind.com/ws",
};

export default env;
