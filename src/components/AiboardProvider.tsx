"use client";
import React, { createContext, useReducer } from "react";
import { z } from "zod";

type ActionMethod = (params: Record<string, unknown>) => Promise<unknown>;

export interface AvailableAction {
  name: string; // 操作名称（供 AI 调用）
  description: string; // 描述（供 AI 理解）
  method: ActionMethod; // 操作实现
  schema?: z.ZodSchema<unknown>; // 输入验证规则
  autoExecute?: boolean; // 是否自动执行
}


export interface AiboardState {
  pageInfo: {
    route: string;
    pageId: string;
    description: string;
  };
  query: {
    currentFilters: Record<string, unknown>;
    filterFields: unknown[];
  };
  pagination: {
    currentPage: number;
    pageSize: number;
    totalRecords: number;
  };
  tableData: {
    data: unknown[];
    rowChildren?: (row: unknown) => unknown[];
  };
  actions: {
    availableActions: AvailableAction[];
    selectedRows: unknown[];
  };
  selectedRow: unknown | null; // Add selectedRow to the state
  isVisible: boolean;
}

export type AiboardAction =
  | { type: "SET_PAGE_INFO"; payload: AiboardState["pageInfo"] }
  | { type: "SET_QUERY"; payload: Partial<AiboardState["query"]> }
  | { type: "SET_PAGINATION"; payload: Partial<AiboardState["pagination"]> }
  | { type: "SET_TABLE_DATA"; payload: Partial<AiboardState["tableData"]> }
  | { type: "REGISTER_ACTION"; payload: { availableActions: AvailableAction[] } }
  | { type: "SET_VISIBILITY"; payload: boolean }
  | { type: "SET_SELECTED_ROW"; payload: unknown };

const initialState: AiboardState = {
  pageInfo: {
    route: "/",
    pageId: "dashboard",
    description: "",
  },
  query: {
    currentFilters: {},
    filterFields: [],
  },
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalRecords: 0,
  },
  tableData: {
    data: [],
  },
  actions: {
    availableActions: [],
    selectedRows: [],
  },
  selectedRow: null, // Initialize selectedRow
  isVisible: true,
};

export const AiboardContext = createContext<{
  state: AiboardState;
  dispatch: React.Dispatch<AiboardAction>;
} | null>(null);

export const AiboardProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(
    (state: AiboardState, action: AiboardAction): AiboardState => {
      switch (action.type) {
        case "SET_PAGE_INFO":
          return { ...state, pageInfo: action.payload };
        case "SET_QUERY":
          return { ...state, query: { ...state.query, ...action.payload } };
        case "SET_PAGINATION":
          return {
            ...state,
            pagination: { ...state.pagination, ...action.payload },
          };
        case "SET_TABLE_DATA":
          return {
            ...state,
            tableData: { ...state.tableData, ...action.payload },
          };
        case "REGISTER_ACTION":
          return {
            ...state,
            actions: {
              ...state.actions,
              availableActions: action.payload.availableActions,
            },
          };
        case "SET_VISIBILITY":
          return { ...state, isVisible: action.payload };
        case "SET_SELECTED_ROW": // Handle SET_SELECTED_ROW
          return { ...state, selectedRow: action.payload };
        default:
          return state;
      }
    },
    initialState
  );

  return (
    <AiboardContext.Provider value={{ state, dispatch }}>
      {children}
    </AiboardContext.Provider>
  );
};
