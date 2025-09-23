import axios, { AxiosInstance } from "axios";
import { cookies } from "next/headers";

import env from "@/config/env";

// 基础客户端创建函数
const createBaseClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: env.API_BASE_URL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // 添加请求日志
  instance.interceptors.request.use(config => {
    console.log(
      `[${new Date().toISOString()}] [Request] ${config.method?.toUpperCase()} ${config.url}`,
      {
        params: config.params,
        data: config.data,
        headers: config.headers,
        fullUrl: `${config.baseURL}${config.url}`,
      }
    );
    return config;
  });

  // 添加响应日志
  instance.interceptors.response.use(
    response => {
      console.log(
        `[${new Date().toISOString()}] [Response] ${response.config.method?.toUpperCase()} ${
          response.config.url
        }`,
        {
          status: response.status,
          data: response.data,
        }
      );
      return response;
    },
    error => {
      if (axios.isAxiosError(error) && error.response) {
        console.error(
          `[${new Date().toISOString()}] [Response] ${error.config?.method?.toUpperCase()} ${
            error.config?.url
          }`,
          {
            status: error.response.status,
            data: error.response.data,
            error: error.message,
          }
        );
      } else if (axios.isAxiosError(error)) {
        console.error(
          `[${new Date().toISOString()}] [Request Error] ${error.config?.method?.toUpperCase()} ${
            error.config?.url
          }`,
          {
            error: error.message,
          }
        );
      } else {
        console.error(`[${new Date().toISOString()}] [Unknown Error]`, error);
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// 增强客户端（添加认证拦截器）
const createServerClient = async (): Promise<AxiosInstance> => {
  const instance = createBaseClient(); // 使用基础客户端（已包含日志）

  // 在构建时跳过 cookies 访问
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.log("构建时跳过 cookies 访问");
    return instance;
  }

  try {
    const cookieStore = await cookies();

    // 请求拦截器 - 添加认证令牌
    instance.interceptors.request.use(config => {
      // 从服务端 cookies 获取 token
      const token = cookieStore.get("access_token")?.value;
      if (token) {
        // 同时保留原来的 access_token 头作为备用
        config.headers.access_token = token;
      }
      return config;
    });
  } catch (error) {
    console.warn("无法获取 cookies，将使用无认证模式:", error);
    // 如果无法获取 cookies，继续使用基础客户端
  }

  // 响应拦截器 - 统一错误处理
  instance.interceptors.response.use(
    response => {
      // 检查响应数据是否为字符串，如果是则尝试解析为JSON
      let responseData = response.data;
      if (typeof responseData === "string") {
        try {
          // 尝试修复常见的JSON格式问题
          let fixedJsonString = responseData;

          // 修复对象键没有引号的问题，如 {1:true} -> {"1":true}
          fixedJsonString = fixedJsonString.replace(
            /([{,]\s*)(\d+):/g,
            '$1"$2":'
          );

          // 修复其他可能的格式问题
          fixedJsonString = fixedJsonString.replace(
            /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*):/g,
            '$1"$2":'
          );

          responseData = JSON.parse(fixedJsonString);
        } catch (error) {
          console.error("Failed to parse response data as JSON:", error);
          return Promise.reject({
            status: 500,
            msg: "Invalid JSON response from server",
            isError: true,
          });
        }
      }

      if (responseData.code !== 200) {
        return Promise.reject({
          status: responseData.code || 500,
          msg: responseData.msg || "Unknown error",
          isError: true,
          isUnauthorized: responseData.code === 401,
        });
      }

      return responseData;
    },
    error => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const msg = error.response?.data?.msg || "Unknown error";

        // 错误信息已在基础客户端打印，这里只需转换错误格式
        return Promise.reject({
          status: status || 500,
          msg,
          isError: true,
        });
      }

      return Promise.reject({
        status: 500,
        msg: "Unknown server error",
        isError: true,
      });
    }
  );

  return instance;
};

// 类型导出
export type BaseApiClient = ReturnType<typeof createBaseClient>;
export type EnhancedApiClient = ReturnType<typeof createServerClient>;
export { createBaseClient, createServerClient };
