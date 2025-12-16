/**
 * 统一 Schema 导出入口
 * Drizzle 配置会指向此文件来收集所有表和关系定义
 */

// 认证相关表
export * from "./schema/auth";

// 像素艺术表
export * from "./schema/pixel";

// 社交功能表（点赞、评论）
export * from "./schema/social";

// 通用工具（时间戳等）
export * from "./schema/_utils";
