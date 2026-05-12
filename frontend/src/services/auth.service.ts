import { AUTH_STORAGE_KEY } from "../constants/auth";
import { httpClient } from "../lib/http-client";
import { supabase } from "../lib/supabase";

export const authService = {
  async signIn(email: string, password: string) {
    const response = await supabase.auth.signInWithPassword({ email, password });
    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },

  async signUp(email: string, password: string) {
    const response = await supabase.auth.signUp({ email, password });
    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },

  async signOut() {
    const response = await supabase.auth.signOut();
    if (response.error) {
      throw new Error(response.error.message);
    }
  },

  async getSession() {
    const response = await supabase.auth.getSession();
    if (response.error) {
      throw new Error(response.error.message);
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
