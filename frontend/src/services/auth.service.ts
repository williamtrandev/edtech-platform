import type { AuthError } from "@supabase/supabase-js";
import { AUTH_STORAGE_KEY } from "../constants/auth";
import { SUPABASE_AUTH_USER_MESSAGE } from "../constants/supabase-auth";
import { mapSupabaseAuthErrorToMessage } from "../lib/map-supabase-auth-error";
import { httpClient } from "../lib/http-client";
import { supabase } from "../lib/supabase";

export type SignUpResult = {
  needsEmailConfirmation: boolean;
  hasSession: boolean;
};

function throwMappedAuthError(error: AuthError): never {
  throw new Error(mapSupabaseAuthErrorToMessage(error));
}

export const authService = {
  async signIn(email: string, password: string) {
    const response = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (response.error) {
      throwMappedAuthError(response.error);
    }

    return response.data;
  },

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const response = await supabase.auth.signUp({ email: email.trim(), password });
    if (response.error) {
      throwMappedAuthError(response.error);
    }

    const { user, session } = response.data;
    if (user && Array.isArray(user.identities) && user.identities.length === 0) {
      throw new Error(SUPABASE_AUTH_USER_MESSAGE.duplicateSignup);
    }

    return {
      needsEmailConfirmation: Boolean(user) && !session,
      hasSession: Boolean(session)
    };
  },

  async signOut() {
    const response = await supabase.auth.signOut();
    if (response.error) {
      throwMappedAuthError(response.error);
    }
  },

  async getSession() {
    const response = await supabase.auth.getSession();
    if (response.error) {
      throwMappedAuthError(response.error);
    }

    return response.data.session;
  },

  async syncBackendSession() {
    try {
      await httpClient.post("/auth-sessions", {});
    } catch {
      // Best-effort sync to keep UX smooth even if backend is down.
    }
  },

  persistAccessToken(accessToken?: string | null) {
    if (!accessToken) {
      localStorage.removeItem(AUTH_STORAGE_KEY.accessToken);
      return;
    }

    localStorage.setItem(AUTH_STORAGE_KEY.accessToken, accessToken);
  }
};
