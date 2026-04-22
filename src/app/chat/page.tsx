"use client";

import { AppShell } from "@/components/AppShell";
import { ChatInterface } from "@/components/ChatInterface";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <AppShell>
      <ChatInterface />
    </AppShell>
  );
}
