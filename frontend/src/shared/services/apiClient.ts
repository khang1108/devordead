export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(/\/+$/, "");

export const WS_BASE_URL: string =
  (import.meta.env.VITE_WS_BASE_URL ??
    `${typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:"}//${
      typeof window !== "undefined" ? window.location.host : "localhost:8000"
    }/ws`).replace(/\/+$/, "");

const TOKEN_KEY = "devordead.auth.token";

export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly isNetworkError: boolean;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: string; isNetworkError?: boolean; details?: unknown } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.code = options.code ?? "API_ERROR";
    this.isNetworkError = Boolean(options.isNetworkError);
    this.details = options.details;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, signal, timeoutMs = 10_000 } = options;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  const token = getAuthToken();
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    if (!response.ok) {
      let message = `Yêu cầu thất bại (HTTP ${response.status}).`;
      let code = `HTTP_${response.status}`;
      let details: unknown;

      if (isJson) {
        try {
          const errPayload = (await response.json()) as {
            message?: string;
            detail?: string;
            code?: string;
          };
          if (errPayload.message) message = errPayload.message;
          else if (errPayload.detail) message = errPayload.detail;
          if (errPayload.code) code = errPayload.code;
          details = errPayload;
        } catch {
          // Keep default HTTP message
        }
      } else if (response.status === 404 || response.status >= 500) {
        message = `Chưa kết nối được máy chủ API (${API_BASE_URL}${normalizedPath}). Hãy khởi động Backend hoặc kiểm tra cấu hình VITE_API_BASE_URL.`;
        code = "BACKEND_UNAVAILABLE";
      }

      throw new ApiError(message, { status: response.status, code, details });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (!isJson) {
      throw new ApiError(
        `Máy chủ tại ${API_BASE_URL} không trả về JSON hợp lệ. Hãy khởi động Backend và cấu hình đúng VITE_API_BASE_URL.`,
        { status: response.status, code: "INVALID_API_RESPONSE", isNetworkError: true },
      );
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Hết thời gian kết nối tới máy chủ API. Vui lòng thử lại.", {
        code: "TIMEOUT",
        isNetworkError: true,
      });
    }
    throw new ApiError(
      `Không thể kết nối tới máy chủ API (${API_BASE_URL}). Hãy đảm bảo dịch vụ Backend đang chạy.`,
      { code: "NETWORK_ERROR", isNetworkError: true },
    );
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { method: "GET", signal });
}

export function apiPost<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body, signal });
}

export function apiPut<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { method: "PUT", body, signal });
}

export function apiPatch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { method: "PATCH", body, signal });
}

export function apiDelete<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE", signal });
}

export function buildWsUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${WS_BASE_URL}${normalized}`;
}

export function getErrorMessage(err: unknown, fallback = "Đã xảy ra lỗi không xác định."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
