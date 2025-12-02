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
  const { isAuthenticated, authLoading } = useUser();

  // Persist last visited non-login route so we can resume after refresh/login
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname || pathname === "/login") return;
    window.localStorage.setItem("lastPath", pathname);
  }, [pathname]);

  useEffect(() => {
    // Don't redirect anywhere until we've finished checking auth
    if (authLoading) return;

    if (pathname === "/login") {
      if (isAuthenticated) {
        // After login, always go to Home
        router.replace("/");
      }
    } else if (!isAuthenticated) {
      router.replace("/login");
    }
    // We intentionally only depend on isAuthenticated to avoid
    // React warnings about dynamic dependency arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, pathname, router]);

  // For login route, render only login page (no ERP chrome)
  if (pathname === "/login") {
    // While redirecting away after login, avoid flicker
    if (isAuthenticated) return null;
    return <>{children}</>;
  }

  // For protected routes, wait until authenticated
  if (authLoading || !isAuthenticated) return null;

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


