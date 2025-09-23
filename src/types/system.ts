// 定义API错误类型
export interface ApiError {
    message: string;
    status?: number;
    code?: string | number;
    details?: unknown;
}

// 定义基础响应数据结构
export interface BaseResponse<T = unknown> {
    code: number;
    data: T;
    msg: string;
}