"use client";

import clsx from "clsx";
import { LucideIcon, Menu } from "lucide-react";
import React, { useState, PropsWithChildren, useCallback } from "react";

export interface NavItem {
  id: string;
  title: string;
  icon: LucideIcon;
  count?: number;
}

export interface SidebarLayoutProps extends PropsWithChildren {
  navItems: NavItem[];
  defaultActiveId?: string;
  activeId?: string;
  onActiveChange?: (id: string) => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (value: boolean) => void;
  className?: string;
  renderContent?: (activeId: string) => React.ReactNode;
}

const SidebarLayout = React.forwardRef<HTMLDivElement, SidebarLayoutProps>(
  (
    {
      navItems,
      defaultActiveId,
      activeId: controlledActiveId,
      onActiveChange,
      collapsed: controlledCollapsed,
      defaultCollapsed = false,
      onCollapsedChange,
      className,
      renderContent,
      children,
      ...rest
    },
    ref
  ) => {
    // 控制当前激活的项
    const [internalActiveId, setInternalActiveId] = useState(
      controlledActiveId ?? defaultActiveId ?? navItems[0]?.id ?? ""
    );
    const isControlledActive = controlledActiveId !== undefined;
    const activeId = isControlledActive ? controlledActiveId : internalActiveId;

    // 控制右侧内容区域的展开 / 折叠
    const [internalCollapsed, setInternalCollapsed] = useState(
      controlledCollapsed ?? defaultCollapsed
    );
    const isControlledCollapsed = controlledCollapsed !== undefined;
    const collapsed = isControlledCollapsed
      ? controlledCollapsed
      : internalCollapsed;

    const toggleCollapsed = useCallback(() => {
      const next = !collapsed;
      if (!isControlledCollapsed) {
        setInternalCollapsed(next);
      }
      onCollapsedChange?.(next);
    }, [collapsed, isControlledCollapsed, onCollapsedChange]);

    const handleActiveChange = (id: string) => {
      // 如果当前是折叠状态，先展开
      if (collapsed) {
        toggleCollapsed();
      }

      // 更新激活状态
      if (!isControlledActive) {
        setInternalActiveId(id);
      }
      onActiveChange?.(id);
    };

    const bodyContent = renderContent?.(activeId) ?? children ?? null;

    React.useEffect(() => {
      // 当受控的activeId改变且处于折叠状态时，自动展开
      if (controlledActiveId !== undefined && collapsed) {
        toggleCollapsed();
      }
    }, [controlledActiveId, collapsed, toggleCollapsed]);

    return (
      <div ref={ref} {...rest} className={clsx("flex bg-white", className)}>
        {/* ───────────── Sidebar (始终显示) ───────────── */}
        <div className="w-12 flex flex-col items-center border-r">
          {/* 切换按钮 */}
          <button
            onClick={toggleCollapsed}
            className="p-2 hover:bg-gray-100 rounded mt-1"
            aria-label={collapsed ? "展开内容区" : "收起内容区"}
          >
            <Menu size={20} />
          </button>

          {/* 导航项 */}
          <nav className="flex-1 mt-2 flex flex-col items-center space-y-2 overflow-y-auto p-2">
            {navItems.map(item => {
              // 修复1: 折叠状态下不显示激活状态
              const isActive = !collapsed && item.id === activeId;
              return (
                <button
                  key={item.id}
                  onClick={() => handleActiveChange(item.id)}
                  className={clsx(
                    "flex flex-col items-center text-xs p-2 rounded-md w-full",
                    isActive
                      ? "bg-blue-100 text-blue-600 font-semibold"
                      : "text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <item.icon size={18} />
                  {/* <span className="mt-1">{item.title}</span> */}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ───────────── 主体内容区域 ───────────── */}
        {!collapsed && (
          <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out border-r min-w-[250px]">
            {bodyContent}
          </div>
        )}
      </div>
    );
  }
);

SidebarLayout.displayName = "SidebarLayout";

export default SidebarLayout;
