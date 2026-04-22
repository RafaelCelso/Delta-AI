"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, User, Lock, Eye, EyeOff } from "lucide-react";
import {
  validateFullName,
  validateCurrentPassword,
  validateNewPassword,
  validatePasswordConfirmation,
} from "@/lib/validators/profile";

export function ProfileForm() {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Name section state
  const [fullName, setFullName] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Password section state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | null
  >(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | null
  >(null);

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch full_name from profiles table on mount
  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setFullName(data.full_name ?? "");
        }
      } catch {
        // Silently fail — user can still type a name
      } finally {
        setIsLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [user]);

  // Handle name update
  async function handleSaveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameError(null);

    const validation = validateFullName(fullName);
    if (!validation.valid) {
      setNameError(validation.error);
      return;
    }

    setIsSavingName(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(
          "error",
          data.error ?? "Erro ao atualizar perfil. Tente novamente.",
        );
        return;
      }

      setFullName(data.full_name);
      addToast("success", "Nome atualizado com sucesso.");
    } catch {
      addToast("error", "Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setIsSavingName(false);
    }
  }

  // Handle password change
  async function handleChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setConfirmPasswordError(null);

    // Validate all password fields
    const currentValidation = validateCurrentPassword(currentPassword);
    const newValidation = validateNewPassword(newPassword);
    const confirmValidation = validatePasswordConfirmation(
      newPassword,
      confirmPassword,
    );

    let hasError = false;

    if (!currentValidation.valid) {
      setCurrentPasswordError(currentValidation.error);
      hasError = true;
    }

    if (!newValidation.valid) {
      setNewPasswordError(newValidation.error);
      hasError = true;
    }

    if (!confirmValidation.valid) {
      setConfirmPasswordError(confirmValidation.error);
      hasError = true;
    }

    if (hasError) return;

    setIsSavingPassword(true);

    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(
          "error",
          data.error ?? "Erro ao alterar senha. Tente novamente.",
        );
        return;
      }

      // Refresh the browser session so the token stays valid with the
      // new password. signInWithPassword re-establishes the session
      // without navigating away from the page.
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: newPassword,
      });

      // Clear password fields on success
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      addToast("success", "Senha alterada com sucesso.");
    } catch {
      addToast("error", "Erro ao alterar senha. Tente novamente.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  const inputClasses =
    "w-full rounded-lg border border-neutral-700 bg-[#1a1a1a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50";

  const disabledInputClasses =
    "w-full rounded-lg border border-neutral-700 bg-[#1a1a1a] px-3.5 py-2.5 text-sm text-neutral-400 placeholder-neutral-500 outline-none opacity-50 cursor-not-allowed";

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5">
      {/* Email Section (read-only) */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">E-mail</h2>
        </div>
        <div className="p-5">
          <label
            htmlFor="profile-email"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Endereço de e-mail
          </label>
          <input
            id="profile-email"
            type="email"
            value={user?.email ?? ""}
            disabled
            className={disabledInputClasses}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            O e-mail não pode ser alterado.
          </p>
        </div>
      </div>

      {/* Name Section */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Informações Pessoais
          </h2>
        </div>
        <div className="p-5">
          <form onSubmit={handleSaveName}>
            <div className="mb-5">
              <label
                htmlFor="profile-name"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Nome completo
              </label>
              <input
                id="profile-name"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                placeholder="Seu nome completo"
                disabled={isSavingName}
                className={inputClasses}
              />
              {nameError && (
                <p className="mt-1.5 text-sm text-red-400">{nameError}</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingName} size="sm">
                {isSavingName ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Password Section */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Alterar Senha
          </h2>
        </div>
        <div className="p-5">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label
                htmlFor="profile-current-password"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Senha atual
              </label>
              <div className="relative">
                <input
                  id="profile-current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (currentPasswordError) setCurrentPasswordError(null);
                  }}
                  placeholder="Sua senha atual"
                  disabled={isSavingPassword}
                  className={`${inputClasses} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-300"
                  tabIndex={-1}
                  aria-label={
                    showCurrentPassword ? "Ocultar senha" : "Mostrar senha"
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {currentPasswordError && (
                <p className="mt-1.5 text-sm text-red-400">
                  {currentPasswordError}
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="profile-new-password"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      id="profile-new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (newPasswordError) setNewPasswordError(null);
                      }}
                      placeholder="Mínimo 6 caracteres"
                      disabled={isSavingPassword}
                      className={`${inputClasses} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-300"
                      tabIndex={-1}
                      aria-label={
                        showNewPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {newPasswordError && (
                    <p className="mt-1.5 text-sm text-red-400">
                      {newPasswordError}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="profile-confirm-password"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <input
                      id="profile-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError(null);
                      }}
                      placeholder="Repita a nova senha"
                      disabled={isSavingPassword}
                      className={`${inputClasses} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-300"
                      tabIndex={-1}
                      aria-label={
                        showConfirmPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <p className="mt-1.5 text-sm text-red-400">
                      {confirmPasswordError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={isSavingPassword} size="sm">
                {isSavingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
