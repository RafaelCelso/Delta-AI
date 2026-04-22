"use client";

import { AppSidebar } from "@/components/ui/sidebar";

export function SidebarDemo() {
  return (
    <div className="flex h-screen w-screen flex-row">
      <AppSidebar />
      <main className="ml-[3.05rem] flex h-screen grow flex-col overflow-auto"></main>
    </div>
  );
}
