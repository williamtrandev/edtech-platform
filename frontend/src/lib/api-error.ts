import axios, { type AxiosError } from "axios";

export type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
};

export type ApiErrorResponse = {
  success?: false;
  error?: ApiErrorPayload;
};

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly details?: unknown;

  constructor(message: string, code = "APP_ERROR", statusCode?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isOpaqueHttpErrorMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return true;
  }

  return (
    /^Request failed with status code \d+$/i.test(trimmed) ||
    trimmed === "Network Error" ||
    /^timeout of \d+ms exceeded$/i.test(trimmed) ||
    trimmed === "ERR_NETWORK"
  );
}

export function fromAxiosError(error: AxiosError<ApiErrorResponse>): ApiError {
  const statusCode = error.response?.status;
  const payload = error.response?.data?.error;

  if (payload?.message?.trim()) {
    return new ApiError(payload.message.trim(), payload.code ?? "APP_ERROR", statusCode, payload.details);
  }

  if (payload?.code) {
    return new ApiError("", payload.code, statusCode, payload.details);
  }

  if (error.code === "ECONNABORTED") {
    return new ApiError("", "TIMEOUT", statusCode);
  }

  if (!error.response) {
    return new ApiError("", "NETWORK_ERROR");
  }

  return new ApiError("", "HTTP_ERROR", statusCode);
}

export function resolveErrorMessage(
  error: unknown,
  fallback: string,
  translateCode?: (code: string, statusCode?: number) => string | null
): string {
  if (isApiError(error)) {
    const translated = translateCode?.(error.code, error.statusCode);
    if (translated) {
      return translated;
    }

    if (error.message.trim()) {
      return error.message.trim();
    }

    const statusTranslated = error.statusCode ? translateCode?.(`HTTP_${error.statusCode}`, error.statusCode) : null;
    if (statusTranslated) {
      return statusTranslated;
    }
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message && !isOpaqueHttpErrorMessage(message)) {
      return message;
    }
  }

  return fallback;
}
