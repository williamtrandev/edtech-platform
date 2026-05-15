import axios from "axios";
import { supabase } from "./supabase";

let cachedAccessToken: string | null = null;

void supabase.auth.getSession().then(({ data }) => {
  cachedAccessToken = data.session?.access_token ?? null;
});

supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
});

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  headers: {
    "Content-Type": "application/json"
  }
});

httpClient.interceptors.request.use((config) => {
  if (cachedAccessToken) {
    config.headers.Authorization = `Bearer ${cachedAccessToken}`;
  }

  return config;
});
