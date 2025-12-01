import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "./components/Sidebar/SidebarContext";
import { UserProvider } from "./components/User/UserContext";
import { ToastProvider } from "./components/ui/ToastProvider";
import AuthShell from "./AuthShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ERP System",
  description: "Enterprise Resource Planning System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserProvider>
          <ToastProvider>
            <SidebarProvider>
              <AuthShell>{children}</AuthShell>
            </SidebarProvider>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
