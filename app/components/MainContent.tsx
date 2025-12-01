"use client";

import { useSidebar } from "./Sidebar/SidebarContext";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { sidebarWidth } = useSidebar();
  
  return (
    <main
      className="flex-1 overflow-y-auto bg-white transition-all duration-300"
      style={{ 
        paddingTop: '56px', // Header height
        paddingLeft: `${sidebarWidth}px`,
        width: '100%',
        boxSizing: 'border-box',
        minHeight: '100vh'
      }}
    >
      <div className="px-8 py-6">
        {children}
      </div>
    </main>
  );
}

