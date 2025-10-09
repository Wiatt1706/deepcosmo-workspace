// 统一的HTTP客户端 - 基于Axios的请求拦截和错误处理
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { parseCookies, destroyCookie } from "nookies";
import { toast } from "sonner";

import env from "@/config/env";
import { ApiError } from "@/types/system";

// 扩展Axios配置，添加自定义选项
export interface ApiRequestConfig extends AxiosRequestConfig {
  // 是否显示错误提示（默认为true）
  showError?: boolean;
  // 是否自动处理401错误（默认为true）
  handle401?: boolean;
  // 自定义错误处理函数
  customErrorHandler?: (error: ApiError) => void;
}

// 错误处理函数
const handleHttpError = (error: { response?: { status: number; data: { msg?: string } } }, config?: ApiRequestConfig) => {
  if (!error.response) {
    toast.error("无法连接服务器，请检查网络");
    return Promise.reject(error);
  }

  const { status, data } = error.response;

  // 处理401错误
  if (status === 401 && typeof window !== "undefined") {
    const handle401 = config?.handle401 !== false; // 默认为true
    
    if (handle401) {
      // 清除token
      destroyCookie(null, "access_token", { path: "/" });
      destroyCookie(null, "refresh_token", { path: "/" });
      
      // 检查是否在登录页面
      const pathname = window.location.pathname;
      const isLoginPage = pathname.includes("/login");
      
      if (!isLoginPage) {
        const match = pathname.match(/^\/(\w{2})(\/|$)/);
        const locale = match?.[1] || "zh";
        toast.error("登录已过期，请重新登录");
        window.location.href = `/${locale}/login`;
      }
    }
    
    return Promise.reject(error);
  }

  // 处理其他HTTP错误
  const message = data?.msg || "请求失败，请稍后再试";
  switch (status) {
    case 400:
      toast.warning(`参数错误：${message}`);
      break;
    case 403:
      toast.warning("无权限访问该资源");
      break;
    case 404:
      toast.warning("接口不存在");
      break;
    case 500:
      toast.error(`服务器错误（${status}）：${message}`);
      break;
    default:
      toast.error(`错误（${status}）：${message}`);
      break;
  }

  return Promise.reject(error);
};

const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: env.API_ROUTE_URL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Language: "zh-CN",
      Time_Zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // 请求拦截器：自动带 token
  instance.interceptors.request.use(config => {
    const token = typeof window !== "undefined" ? parseCookies().access_token : null;
    if (token) {
      config.headers["access_token"] = token;
    }
    return config;
  });

  // 响应拦截器：统一处理错误提示
  instance.interceptors.response.use(
    response => response.data,
    error => handleHttpError(error, error.config)
  );

  return instance;
};

const apiClient = createApiClient();

// 定义 Empty 类型表示无返回数据的情况
export type Empty = unknown;

const apiRoute = {
  get: async <T = Empty>(url: string, config?: ApiRequestConfig): Promise<T> => {
    return apiClient.get(url, config) as Promise<T>;
  },
  post: async <T = Empty, D = unknown>(url: string, data?: D, config?: ApiRequestConfig): Promise<T> => {
    return apiClient.post(url, data, config) as Promise<T>;
  },
  put: async <T = Empty, D = unknown>(url: string, data?: D, config?: ApiRequestConfig): Promise<T> => {
    return apiClient.put(url, data, config) as Promise<T>;
  },
  delete: async <T = Empty>(url: string, config?: ApiRequestConfig): Promise<T> => {
    return apiClient.delete(url, config) as Promise<T>;
  },
  patch: async <T = Empty, D = unknown>(url: string, data?: D, config?: ApiRequestConfig): Promise<T> => {
    return apiClient.patch(url, data, config) as Promise<T>;
  },
  instance: apiClient,
};

export default apiRoute;
