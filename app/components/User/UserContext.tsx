"use client";

import React, { createContext, useContext, useState, useMemo, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  role?: string;
  avatar?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  // Initialize user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUserState(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
      }
    } else {
      // Set default user if no user in localStorage
      const defaultUser: User = {
        id: "1",
        name: "Ahmed Mughal",
        email: "ahmed.mughal@example.com",
        initials: "AM",
        role: "Administrator",
      };
      setUserState(defaultUser);
      localStorage.setItem("user", JSON.stringify(defaultUser));
    }
  }, []);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("user");
    }
  };

  const logout = () => {
    setUserState(null);
    localStorage.removeItem("user");
    // Redirect to home page after logout
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      logout,
      isAuthenticated: !!user,
    }),
    [user]
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

