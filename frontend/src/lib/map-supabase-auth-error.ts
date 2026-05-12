import type { AuthError } from "@supabase/supabase-js";
import { SUPABASE_AUTH_ERROR_CODE, SUPABASE_AUTH_USER_MESSAGE } from "../constants/supabase-auth";

function messageLooksLikeNetwork(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("fetch") ||
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("load failed")
  );
}

export function mapSupabaseAuthErrorToMessage(error: AuthError): string {
  const code = "code" in error && typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : undefined;
  const message = typeof error.message === "string" ? error.message : "";

  if (code === SUPABASE_AUTH_ERROR_CODE.USER_ALREADY_EXISTS) {
    return SUPABASE_AUTH_USER_MESSAGE.duplicateSignup;
  }
  if (code === SUPABASE_AUTH_ERROR_CODE.EMAIL_ADDRESS_INVALID) {
    return SUPABASE_AUTH_USER_MESSAGE.invalidEmail;
  }
  if (code === SUPABASE_AUTH_ERROR_CODE.SIGNUP_DISABLED) {
    return SUPABASE_AUTH_USER_MESSAGE.signupDisabled;
  }
  if (code === SUPABASE_AUTH_ERROR_CODE.WEAK_PASSWORD || code === SUPABASE_AUTH_ERROR_CODE.SAME_PASSWORD) {
    return SUPABASE_AUTH_USER_MESSAGE.weakPassword;
  }
  if (code === SUPABASE_AUTH_ERROR_CODE.OVER_REQUEST_RATE_LIMIT) {
    return SUPABASE_AUTH_USER_MESSAGE.rateLimited;
  }
  if (code === SUPABASE_AUTH_ERROR_CODE.INVALID_CREDENTIALS || code === SUPABASE_AUTH_ERROR_CODE.SESSION_NOT_FOUND) {
    return SUPABASE_AUTH_USER_MESSAGE.invalidCredentials;
  }

  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return SUPABASE_AUTH_USER_MESSAGE.duplicateSignup;
  }
  if (lower.includes("password")) {
    return SUPABASE_AUTH_USER_MESSAGE.weakPassword;
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return SUPABASE_AUTH_USER_MESSAGE.rateLimited;
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return SUPABASE_AUTH_USER_MESSAGE.invalidCredentials;
  }
  if (messageLooksLikeNetwork(message)) {
    return SUPABASE_AUTH_USER_MESSAGE.network;
  }

  return message.trim().length > 0 ? message : SUPABASE_AUTH_USER_MESSAGE.generic;
}
