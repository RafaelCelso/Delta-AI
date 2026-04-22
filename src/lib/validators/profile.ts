export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateFullName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "O nome é obrigatório." };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: "O nome deve ter no máximo 255 caracteres." };
  }

  return { valid: true, error: null };
}

export function validateCurrentPassword(password: string): ValidationResult {
  if (password.length === 0) {
    return { valid: false, error: "A senha atual é obrigatória." };
  }

  return { valid: true, error: null };
}

export function validateNewPassword(password: string): ValidationResult {
  if (password.length === 0) {
    return { valid: false, error: "A nova senha é obrigatória." };
  }

  if (password.length < 6) {
    return {
      valid: false,
      error: "A nova senha deve ter no mínimo 6 caracteres.",
    };
  }

  return { valid: true, error: null };
}

export function validatePasswordConfirmation(
  newPassword: string,
  confirmPassword: string,
): ValidationResult {
  if (newPassword !== confirmPassword) {
    return { valid: false, error: "As senhas não coincidem." };
  }

  return { valid: true, error: null };
}
