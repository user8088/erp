"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { apiClient, ApiError } from "../../lib/apiClient";
import type { User as ApiUser, PermissionsMap, AccessLevel } from "../../lib/types";
import { hasAtLeast as baseHasAtLeast } from "../../lib/permissions";

type User = ApiUser;

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  authLoading: boolean;
  permissions: PermissionsMap;
  hasAtLeast: (code: string, required: AccessLevel) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionsMap>({});

  // Initialize from backend session
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        type MeResponse = { user: User; permissions?: PermissionsMap } | User;
        const me = await apiClient.get<MeResponse>("/auth/me", {
          authRequired: false,
        });
        if (isMounted) {
          if ("user" in (me as MeResponse)) {
            const payload = me as { user: User; permissions?: PermissionsMap };
            setUserState(payload.user);
            setPermissions(payload.permissions ?? {});
          } else {
            setUserState(me as User);
            setPermissions({});
          }
          if (typeof window !== "undefined") {
            const storedUser: User =
              "user" in (me as MeResponse)
                ? (me as { user: User }).user
                : (me as User);
            localStorage.setItem("user", JSON.stringify(storedUser));
          }
        }
      } catch (e) {
        // Only clear stored user on explicit auth errors; for other failures
        // (e.g. network, misconfigured route) keep the last known session so
        // refresh doesn't bounce the user back to login unnecessarily.
        if (
          isMounted &&
          e instanceof ApiError &&
          (e.status === 401 || e.status === 419)
        ) {
          setUserState(null);
          setPermissions({});
          if (typeof window !== "undefined") {
            localStorage.removeItem("user");
          }
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

  const setUser = useCallback(
    (newUser: User | null) => {
      setUserState(newUser);
      if (!newUser) {
        setPermissions({});
      }
      if (typeof window !== "undefined") {
        if (newUser) {
          localStorage.setItem("user", JSON.stringify(newUser));
        } else {
          localStorage.removeItem("user");
        }
      }
    },
    [setUserState]
  );

  const login = useCallback(async (email: string, password: string) => {
    // Backend expects `login` field (can be email or username)
    const result = await apiClient.post<{
      user: User;
      permissions?: PermissionsMap;
    }>("/auth/login", {
      login: email,
      password,
    });
    setUser(result.user);
    setPermissions(result.permissions ?? {});

    // Immediately refresh from /auth/me so we pick up roles and
    // any additional fields that login might not include.
    try {
      type MeResponse = { user: User; permissions?: PermissionsMap } | User;
      const me = await apiClient.get<MeResponse>("/auth/me", {
        authRequired: false,
      });
      if ("user" in (me as MeResponse)) {
        const payload = me as { user: User; permissions?: PermissionsMap };
        setUser(payload.user);
        setPermissions(payload.permissions ?? result.permissions ?? {});
      } else {
        setUser(me as User);
      }
    } catch {
      // If /auth/me fails, we still have the login response user
    }
  }, [setUser, setPermissions]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      setUser(null);
      setPermissions({});
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("lastPath");
        window.location.href = "/login";
      }
    }
  }, [setUser, setPermissions]);

  const hasAtLeast = useCallback(
    (code: string, required: AccessLevel) => {
      const current = permissions[code];
      // If backend did not specify a permission code at all, treat it as allowed
      // so we only hide things when access is explicitly "no-access".
      if (!current) {
        return true;
      }
      return baseHasAtLeast(permissions, code, required);
    },
    [permissions]
  );

  const value = useMemo(
    () => ({
      user,
      setUser,
      login,
      logout,
      isAuthenticated: !!user,
      authLoading,
      permissions,
      hasAtLeast,
    }),
    [authLoading, user, permissions, login, logout, hasAtLeast, setUser]
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

