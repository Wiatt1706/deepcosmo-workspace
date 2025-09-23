// API 请求/响应类型定义

// 用户相关类型
export interface User {
  id: number;
  name: string;
  email?: string;
  role: "admin" | "member" | "guest";
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 登录请求
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// 登录响应
export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: User;
  expiresIn?: number;
}

// 刷新令牌响应
export interface RefreshResponse {
  token: string;
  expiresIn?: number;
}

// 用户信息响应
export interface MeResponse {
  user: User;
}

// 通用 API 响应包装
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  msg: string;
  timestamp?: number;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 错误响应
export interface ErrorResponse {
  code: number;
  msg: string;
  details?: Record<string, unknown>;
  timestamp?: number;
}

// API 端点类型映射
export interface ApiEndpoints {
  // 认证相关
  "POST /auth/login": {
    request: LoginRequest;
    response: ApiResponse<LoginResponse>;
  };
  "POST /auth/refresh": {
    request: Record<string, never>;
    response: ApiResponse<RefreshResponse>;
  };
  "POST /auth/logout": {
    request: Record<string, never>;
    response: ApiResponse<null>;
  };
  
  // 用户相关
  "GET /common/me": {
    request: Record<string, never>;
    response: ApiResponse<MeResponse>;
  };
  "PUT /common/profile": {
    request: Partial<User>;
    response: ApiResponse<User>;
  };
  
  // 示例数据接口
  "GET /common/dashboard": {
    request: Record<string, never>;
    response: ApiResponse<{
      stats: {
        totalUsers: number;
        activeUsers: number;
        newUsers: number;
      };
      recentActivities: Array<{
        id: number;
        type: string;
        description: string;
        timestamp: string;
      }>;
    }>;
  };
}
