import { SUPABASE_AUTH_REDIRECT_PARAM, SUPABASE_AUTH_REDIRECT_TYPE } from "../constants/supabase-auth";
import { supabase } from "./supabase";

type RecoveryCallbackResult =
  | { status: "ready" }
  | { status: "missing" }
  | { status: "expired"; detail?: string }
  | { status: "error"; detail?: string };

let inFlightRecovery:
  | {
      href: string;
      promise: Promise<RecoveryCallbackResult>;
    }
  | null = null;

function readCallbackParams() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#\??/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => params.set(key, value));
  }
  return params;
}

function clearCallbackUrl() {
  window.history.replaceState({}, "", window.location.pathname);
}

function decodeDetail(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

async function hasSession() {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session?.access_token);
}

async function resolveRecoveryCallbackOnce(): Promise<RecoveryCallbackResult> {
  if (typeof window === "undefined") {
    return { status: "missing" };
  }

  const params = readCallbackParams();
  const callbackError = params.get(SUPABASE_AUTH_REDIRECT_PARAM.error);
  const callbackErrorCode = params.get(SUPABASE_AUTH_REDIRECT_PARAM.errorCode);
  const callbackErrorDetail = decodeDetail(params.get(SUPABASE_AUTH_REDIRECT_PARAM.errorDescription));

  if (callbackError || callbackErrorCode) {
    clearCallbackUrl();
    return callbackErrorCode === "otp_expired" || callbackError === "access_denied"
      ? { status: "expired", detail: callbackErrorDetail }
      : { status: "error", detail: callbackErrorDetail };
  }

  if (await hasSession()) {
    clearCallbackUrl();
    return { status: "ready" };
  }

  const tokenHash = params.get(SUPABASE_AUTH_REDIRECT_PARAM.tokenHash);
  const type = params.get(SUPABASE_AUTH_REDIRECT_PARAM.type);
  if (tokenHash && type === SUPABASE_AUTH_REDIRECT_TYPE.recovery) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: SUPABASE_AUTH_REDIRECT_TYPE.recovery
    });
    clearCallbackUrl();
    if (error) {
      return error.message.toLowerCase().includes("expired")
        ? { status: "expired", detail: error.message }
        : { status: "error", detail: error.message };
    }
    return (await hasSession()) ? { status: "ready" } : { status: "missing" };
  }

  const code = params.get(SUPABASE_AUTH_REDIRECT_PARAM.code);
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    clearCallbackUrl();
    if (error) {
      return error.message.toLowerCase().includes("expired")
        ? { status: "expired", detail: error.message }
        : { status: "error", detail: error.message };
    }
    return (await hasSession()) ? { status: "ready" } : { status: "missing" };
  }

  return { status: "missing" };
}

export function resolveRecoveryCallback() {
  const href = typeof window === "undefined" ? "" : window.location.href;
  if (!inFlightRecovery || inFlightRecovery.href !== href) {
    inFlightRecovery = {
      href,
      promise: resolveRecoveryCallbackOnce()
    };
  }
  return inFlightRecovery.promise;
}
