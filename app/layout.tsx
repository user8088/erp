import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { SidebarProvider } from "./components/Sidebar/SidebarContext";
import { UserProvider } from "./components/User/UserContext";
import MainContent from "./components/MainContent";

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
          <SidebarProvider>
            <Sidebar />
            <div className="flex flex-col h-screen overflow-hidden bg-white">
              <Header />
              <MainContent>{children}</MainContent>
            </div>
          </SidebarProvider>
        </UserProvider>
      </body>
    </html>
  );
}
