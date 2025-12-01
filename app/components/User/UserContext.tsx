"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from "react";
import { apiClient } from "../../lib/apiClient";
import type { User as ApiUser } from "../../lib/types";

type User = ApiUser;

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  authLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize from backend session
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const me = await apiClient.get<User>("/auth/me", {
          authRequired: false,
        });
        if (isMounted) {
          setUserState(me);
          if (typeof window !== "undefined") {
            localStorage.setItem("user", JSON.stringify(me));
          }
        }
      } catch {
        if (isMounted && typeof window !== "undefined") {
          localStorage.removeItem("user");
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (typeof window !== "undefined") {
      if (newUser) {
        localStorage.setItem("user", JSON.stringify(newUser));
      } else {
        localStorage.removeItem("user");
      }
    }
  };

  const login = async (email: string, password: string) => {
    // Backend expects `login` field (can be email or username)
    const result = await apiClient.post<{ user: User }>("/auth/login", {
      login: email,
      password,
    });
    setUser(result.user);
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      login,
      logout,
      isAuthenticated: !!user,
      authLoading,
    }),
    [authLoading, user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

