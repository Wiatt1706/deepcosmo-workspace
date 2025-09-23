// utils/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { parseCookies, setCookie, destroyCookie } from "nookies";
import { toast } from "sonner";

import env from "@/config/env";
import { ApiError, BaseResponse } from "@/types/system";
import { API } from "./endpoints";

// 扩展Axios配置，添加自定义选项
export interface ApiRequestConfig extends AxiosRequestConfig {
  // 是否显示错误提示（默认为true）
  showError?: boolean;
  // 自定义错误处理函数
  customErrorHandler?: (error: ApiError) => void;
}

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

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
    response => {
      return response.data;
    },
    async error => {
      if (!error.response) {
        toast.error("无法连接服务器，请检查网络");
        return Promise.reject(error);
      }

      const { status, data, config } = error.response;
      const originalRequest = config;

      if (status === 401 && typeof window !== "undefined") {
        if (isRefreshing) {
          // 等待刷新结束后重试
          return new Promise(resolve => {
            pendingQueue.push((newToken: string | null) => {
              if (newToken) {
                originalRequest.headers["access_token"] = newToken;
              }
              resolve(instance(originalRequest));
            });
          });
        }

        try {
          isRefreshing = true;
          const refreshRes = await instance.post<{ data: { token: string } }>(API.AUTH.REFRESH);
          const newToken = (refreshRes as { data?: { token?: string }; token?: string })?.data?.token || (refreshRes as { data?: { token?: string }; token?: string })?.token;
          if (newToken) {
            setCookie(null, "access_token", newToken, {
              path: "/",
              maxAge: 60 * 60 * 24 * 7,
              sameSite: "lax",
              secure: window.location.protocol === "https:",
            });
          } else {
            destroyCookie(null, "access_token", { path: "/" });
          }
          // 唤醒队列
          pendingQueue.forEach(cb => cb(newToken || null));
          pendingQueue = [];

          // 用新 token 重试
          if (newToken) {
            originalRequest.headers["access_token"] = newToken;
            return instance(originalRequest);
          }
        } catch {
          destroyCookie(null, "access_token", { path: "/" });
        } finally {
          isRefreshing = false;
        }

        // 刷新失败：本地化跳登录
        const pathname = window.location.pathname;
        const match = pathname.match(/^\/(\w{2})(\/|$)/);
        const locale = match?.[1] || "zh";
        toast.error("登录已过期，请重新登录");
        window.location.href = `/${locale}/login`;
        return Promise.reject(error);
      }

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
    }
  );

  return instance;
};

const apiClient = createApiClient();

// 定义 Empty 类型表示无返回数据的情况
export type Empty = unknown;

const apiRoute = {
  get: async <T = Empty, R = BaseResponse<T>>(url: string, config?: ApiRequestConfig): Promise<R> => {
    return apiClient.get(url, config) as Promise<R>;
  },
  post: async <T = Empty, D = unknown, R = BaseResponse<T>>(url: string, data?: D, config?: ApiRequestConfig): Promise<R> => {
    return apiClient.post(url, data, config) as Promise<R>;
  },
  put: async <T = Empty, D = unknown, R = BaseResponse<T>>(url: string, data?: D, config?: ApiRequestConfig): Promise<R> => {
    return apiClient.put(url, data, config) as Promise<R>;
  },
  delete: async <T = Empty, R = BaseResponse<T>>(url: string, config?: ApiRequestConfig): Promise<R> => {
    return apiClient.delete(url, config) as Promise<R>;
  },
  patch: async <T = Empty, D = unknown, R = BaseResponse<T>>(url: string, data?: D, config?: ApiRequestConfig): Promise<R> => {
    return apiClient.patch(url, data, config) as Promise<R>;
  },
  instance: apiClient,
};

export default apiRoute;
