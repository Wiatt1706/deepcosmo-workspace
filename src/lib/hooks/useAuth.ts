"use client";

import { useState, useEffect } from "react";
import { User, Profile } from "@/lib/schemas/auth";
import apiRoute from "@/lib/services/api-route";
import { API } from "@/lib/services/endpoints";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const fetchUser = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await apiRoute.get<{ user: User; profile: Profile | null }>(API.AUTH.ME);
      
      if (response.code === 200 && response.data) {
        const { user, profile } = response.data as { user: User; profile: Profile | null };
        setState({ user, profile, loading: false, error: null });
      } else {
        setState({ user: null, profile: null, loading: false, error: (response as unknown as { msg?: string }).msg || "获取用户信息失败" });
      }
    } catch (error) {
      setState({
        user: null,
        profile: null,
        loading: false,
        error: error instanceof Error ? error.message : "获取用户信息失败",
      });
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await apiRoute.put<{ user: User; profile: Profile | null }>(API.AUTH.PROFILE, data);
      
      if (response.code === 200 && response.data) {
        const { user, profile } = response.data as { user: User; profile: Profile | null };
        setState({ user, profile, loading: false, error: null });
        return { success: true };
      } else {
        const msg = (response as unknown as { msg?: string }).msg || "更新失败";
        setState(prev => ({ ...prev, loading: false, error: msg }));
        return { success: false, error: msg };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "更新失败";
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      await apiRoute.post(API.AUTH.LOGOUT);
      setState({
        user: null,
        profile: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("登出失败:", error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return {
    ...state,
    refetch: fetchUser,
    updateProfile,
    signOut,
  };
}

