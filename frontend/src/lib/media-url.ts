export function toMediaUrl(url?: string | null) {
  if (!url) {
    return "";
  }

  if (/^https?:\/\//u.test(url)) {
    return url;
  }

  const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  return `${baseUrl.replace(/\/$/u, "")}${url.startsWith("/") ? url : `/${url}`}`;
}
