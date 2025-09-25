export const API = {
  AUTH: {
    LOGIN: "/auth/login", // 登录
    REFRESH: "/auth/refresh", // Next API refresh
    LOGOUT: "/auth/logout", // 登出
    OAUTH: "/auth/oauth", // 三方登录
    ME: "/auth/me", // 获取当前用户信息
    PROFILE: "/auth/profile", // 用户资料管理
  },
  COMMON: {
    ME: "/common/me", // Next API me (保留兼容性)
    DASHBOARD: "/common/dashboard", // 仪表板数据
    PROFILE: "/common/profile", // 用户资料 (保留兼容性)
  },
};
