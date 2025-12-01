"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import MainContent from "./components/MainContent";
import { useUser } from "./components/User/UserContext";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useUser();

  // Persist last visited non-login route so we can resume after refresh/login
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname || pathname === "/login") return;
    window.localStorage.setItem("lastPath", pathname);
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/login") {
      if (isAuthenticated) {
        // After login, prefer last visited path if available
        if (typeof window !== "undefined") {
          const last = window.localStorage.getItem("lastPath");
          if (last && last !== "/login") {
            router.replace(last);
            return;
          }
        }
        router.replace("/");
      }
    } else if (!isAuthenticated) {
      router.replace("/login");
    }
    // We intentionally only depend on isAuthenticated to avoid
    // React warnings about dynamic dependency arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // For login route, render only login page (no ERP chrome)
  if (pathname === "/login") {
    // While redirecting away after login, avoid flicker
    if (isAuthenticated) return null;
    return <>{children}</>;
  }

  // For protected routes, wait until authenticated
  if (!isAuthenticated) return null;

  return (
    <>
      <Sidebar />
      <div className="flex flex-col h-screen overflow-hidden bg-white">
        <Header />
        <MainContent>{children}</MainContent>
      </div>
    </>
  );
}


