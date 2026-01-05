import axios from 'axios';
import { API_CONFIG } from '../config/api';

type ApiTraceLevel = "debug" | "info" | "warn" | "error";

function apiTraceEnabled(): boolean {
  // Always log errors. Verbose logs are enabled via localStorage flag.
  return localStorage.getItem("debug_api") === "1" || import.meta.env.DEV;
}

function genRequestId(): string {
  // Browser-safe UUID
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeJson(obj: any) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return undefined;
  }
}

function trace(level: ApiTraceLevel, payload: any) {
  const enabled = apiTraceEnabled();
  if (!enabled && level !== "error") return;
  const fn =
    level === "error"
      ? console.error
      : level === "warn"
      ? console.warn
      : console.log;
  fn("[api-trace]", payload);
}

// Configuración base de Axios
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use(
  (config) => {
    const requestId = genRequestId();
    (config as any).metadata = { startMs: Date.now(), requestId };
    config.headers = config.headers ?? {};
    (config.headers as any)["X-Request-Id"] = requestId;

    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    trace("info", {
      phase: "request",
      requestId,
      method: config.method,
      baseURL: config.baseURL,
      url: config.url,
      timeout: config.timeout,
    });
    return config;
  },
  (error) => {
    trace("error", { phase: "request_error", error: safeJson(error) });
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    const meta = (response.config as any).metadata;
    const durationMs =
      meta?.startMs != null ? Date.now() - Number(meta.startMs) : undefined;
    const requestId =
      response.headers?.["x-request-id"] ||
      meta?.requestId ||
      (response.config.headers as any)?.["X-Request-Id"];

    trace("info", {
      phase: "response",
      requestId,
      status: response.status,
      method: response.config.method,
      url: response.config.url,
      durationMs,
      message: (response.data as any)?.message,
      success: (response.data as any)?.success,
    });
    return response;
  },
  (error) => {
    const cfg = error?.config;
    const meta = cfg?.metadata;
    const durationMs =
      meta?.startMs != null ? Date.now() - Number(meta.startMs) : undefined;
    const requestId =
      error?.response?.headers?.["x-request-id"] ||
      meta?.requestId ||
      cfg?.headers?.["X-Request-Id"];

    trace("error", {
      phase: "response_error",
      requestId,
      status: error?.response?.status,
      method: cfg?.method,
      url: cfg?.url,
      baseURL: cfg?.baseURL,
      durationMs,
      message: error?.message,
      responseMessage: error?.response?.data?.message,
      responseBody: safeJson(error?.response?.data),
    });

    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 