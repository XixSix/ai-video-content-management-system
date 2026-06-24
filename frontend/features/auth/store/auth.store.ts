"use client";

import { create } from "zustand";

import type { AuthStatus } from "../types/auth.types";

type AuthState = {
  status: AuthStatus;
  accessToken: string | null;
  setAccessToken: (accessToken: string) => void;
  setAuthenticated: (accessToken: string) => void;
  setAnonymous: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: "initializing",
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setAuthenticated: (accessToken) =>
    set({
      status: "authenticated",
      accessToken,
    }),
  setAnonymous: () =>
    set({
      status: "anonymous",
      accessToken: null,
    }),
}));
