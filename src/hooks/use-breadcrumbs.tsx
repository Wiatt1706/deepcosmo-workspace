'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// 多语言标题映射
const titleMap: Record<string, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    overview: 'Overview',
    workspace: 'Workspace',
    edit: 'Edit',
    home: 'Home',
    add: 'Add',
    widgets: 'Widgets',
  },
  zh: {
    dashboard: '仪表盘',
    overview: '概览',
    workspace: '工作区',
    edit: '编辑',
    home: '首页',
    add: '添加',
    widgets: '组件库',
  },
};

// 动态路由处理器
const dynamicRouteHandlers: Record<string, (id: string) => string> = {
  'workspace': (id) => `工作区 ${id.substring(0, 4)}...`,
  'product': (id) => `产品 ${id.substring(0, 4)}...`,
};

// 固定子路由列表
const fixedSubroutes: Record<string, string[]> = {
  'workspace': ['add', 'widgets', 'edit'],
};

// 自定义路由映射
type RouteMapping = {
  pattern: string;
  handler: (lang: string, params: Record<string, string>) => BreadcrumbItem[];
};

const routeMappings: RouteMapping[] = [
  // 根路径
  {
    pattern: '/:lang',
    handler: (lang) => [
      { title: titleMap[lang]?.home || 'Home', link: `/${lang}/dashboard` }
    ]
  },
  // 仪表盘概览
  {
    pattern: '/:lang/dashboard/overview',
    handler: (lang) => [
      { title: titleMap[lang]?.home || 'Home', link: `/${lang}/dashboard` },
      { title: titleMap[lang]?.overview || 'Overview', link: `/${lang}/dashboard/overview` }
    ]
  },
  // 工作区列表
  {
    pattern: '/:lang/dashboard/workspace',
    handler: (lang) => [
      { title: titleMap[lang]?.home || 'Home', link: `/${lang}/dashboard` },
      { title: titleMap[lang]?.workspace || 'Workspace', link: `/${lang}/dashboard/workspace` }
    ]
  },
  // 添加工作区
  {
    pattern: '/:lang/dashboard/workspace/add',
    handler: (lang) => [
      { title: titleMap[lang]?.home || 'Home', link: `/${lang}/dashboard` },
      { title: titleMap[lang]?.workspace || 'Workspace', link: `/${lang}/dashboard/workspace` },
      { title: titleMap[lang]?.add || 'Add', link: '' }
    ]
  },
  // 组件商城
  {
    pattern: '/:lang/dashboard/workspace/widgets',
    handler: (lang) => [
      { title: titleMap[lang]?.home || 'Home', link: `/${lang}/dashboard` },
      { title: titleMap[lang]?.workspace || 'Workspace', link: `/${lang}/dashboard/workspace` },
      { title: titleMap[lang]?.widgets || 'Widgets', link: '' }
    ]
  },
  // 工作区详情（动态路由）
  {
    pattern: '/:lang/dashboard/workspace/:id',
    handler: (lang, params) => {
      const id = params?.id || '';
      return [
        { title: titleMap[lang]?.home || 'Home', link: `/${lang}/dashboard` },
        { 
          title: dynamicRouteHandlers.workspace?.(id) || titleMap[lang]?.workspace || 'Workspace', 
          link: `/${lang}/dashboard/workspace/${id}` 
        }
      ];
    }
  },
  // 编辑工作区（动态路由）
  {
    pattern: '/:lang/dashboard/workspace/:id/edit',
    handler: (lang, params) => {
      const id = params?.id || '';
      return [
        { title: titleMap[lang]?.home || 'Home', link: `/${lang}/dashboard` },
        { 
          title: dynamicRouteHandlers.workspace?.(id) || titleMap[lang]?.workspace || 'Workspace', 
          link: `/${lang}/dashboard/workspace/${id}` 
        },
        { title: titleMap[lang]?.edit || 'Edit', link: '' }
      ];
    }
  },
];

export function useBreadcrumbs() {
  const pathname = usePathname();
  
  const breadcrumbs = useMemo(() => {
    if (!pathname) return [];
    
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [];
    
    const lang = parts[0];
    const segments = parts.slice(1);
    const fullPath = `/${lang}/${segments.join('/')}`;
    
    // 1. 尝试匹配自定义路由映射
    for (const mapping of routeMappings) {
      // 修复：构建正则表达式时只替换参数占位符，不替换语言段
      const regexPattern = mapping.pattern
        .replace(/\/:(\w+)/g, '/([^/]+)');
      
      const regex = new RegExp(`^${regexPattern}$`);
      const match = fullPath.match(regex);
      
      if (match) {
        // 提取参数键（从模式中获取）
        const paramKeys = Array.from(mapping.pattern.matchAll(/\/:(\w+)/g)).map(m => m[1]);
        const params: Record<string, string> = {};
        
        // 修复：正确分配匹配值到参数
        paramKeys.forEach((key, index) => {
          params[key] = match[index + 1];
        });
        
        // 修复：确保 lang 参数被正确设置
        const handlerLang = params.lang || lang;
        
        return mapping.handler(handlerLang, params);
      }
    }

    // 2. 通用回退方案
    const breadcrumbItems: BreadcrumbItem[] = [];
    let accumulatedPath = `/${lang}`;
    
    // 处理根路径
    if (segments.length === 0) {
      return [
        { 
          title: titleMap[lang]?.home || 'Home', 
          link: `/${lang}/dashboard` 
        }
      ];
    }

    // 处理仪表盘路径
    if (segments[0] === 'dashboard') {
      accumulatedPath += '/dashboard';
      
      // 首页项
      breadcrumbItems.push({
        title: titleMap[lang]?.home || 'Home',
        link: accumulatedPath
      });

      // 遍历路径段（跳过dashboard段）
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        
        // 检查是否是动态段且不是固定子路由
        const isDynamicSegment = dynamicRouteHandlers[segment] && 
                                i + 1 < segments.length &&
                                !fixedSubroutes[segment]?.includes(segments[i + 1]);
        
        if (isDynamicSegment) {
          const id = segments[i + 1];
          const dynamicPath = `${accumulatedPath}/${segment}/${id}`;
          
          breadcrumbItems.push({
            title: dynamicRouteHandlers[segment](id),
            link: dynamicPath
          });
          
          // 更新累计路径并跳过ID段
          accumulatedPath = dynamicPath;
          i++; // 跳过ID段
          continue;
        }

        // 普通路径段处理
        accumulatedPath += `/${segment}`;
        
        const normalizedTitle = titleMap[lang]?.[segment] || 
          segment.charAt(0).toUpperCase() + segment.slice(1);
        
        breadcrumbItems.push({
          title: normalizedTitle,
          link: i === segments.length - 1 ? '' : accumulatedPath
        });
      }
    } else {
      // 非仪表盘路径的处理
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        accumulatedPath += `/${segment}`;
        
        // 检查是否是动态段且不是固定子路由
        const isDynamicSegment = dynamicRouteHandlers[segment] && 
                                i + 1 < segments.length &&
                                !fixedSubroutes[segment]?.includes(segments[i + 1]);
        
        if (isDynamicSegment) {
          const id = segments[i + 1];
          const dynamicPath = `${accumulatedPath}/${id}`;
          
          breadcrumbItems.push({
            title: dynamicRouteHandlers[segment](id),
            link: dynamicPath
          });
          
          // 更新累计路径并跳过ID段
          accumulatedPath = dynamicPath;
          i++;
          continue;
        }

        const normalizedTitle = titleMap[lang]?.[segment] || 
          segment.charAt(0).toUpperCase() + segment.slice(1);
        
        breadcrumbItems.push({
          title: normalizedTitle,
          link: i === segments.length - 1 ? '' : accumulatedPath
        });
      }
    }

    return breadcrumbItems;
  }, [pathname]);

  return breadcrumbs;
}