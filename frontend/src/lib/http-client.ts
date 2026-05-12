import axios from "axios";
import { AUTH_STORAGE_KEY } from "../constants/auth";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  headers: {
    "Content-Type": "application/json"
  }
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_STORAGE_KEY.accessToken);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
