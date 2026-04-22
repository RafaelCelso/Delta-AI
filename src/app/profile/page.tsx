"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";
import { useAuth } from "@/contexts/AuthContext";
import { UserPen } from "lucide-react";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-auto">
        <div className="flex shrink-0 items-start border-b border-border px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserPen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Gerencie suas informações pessoais e senha.
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-8">
          <ProfileForm />
        </div>
      </div>
    </AppShell>
  );
}
