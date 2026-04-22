"use client";

import { type ReactNode } from "react";
import { AppSidebar } from "@/components/ui/sidebar";

interface AppShellProps {
  children: ReactNode;
}

/**
 * Main application shell that wraps authenticated pages with the
 * collapsible sidebar navigation.
 *
 * Requisitos: 1.1, 1.4, 2.5, 2.6
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen flex-row">
      <AppSidebar />
      <main className="ml-[3.5rem] flex h-screen grow flex-col overflow-auto">
        {children}
      </main>
    </div>
  );
}
