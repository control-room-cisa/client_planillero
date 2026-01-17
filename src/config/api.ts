// Validar y construir BASE_URL con fallback robusto
const getBaseUrl = (): string => {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  
  // Si está definida, usar directamente
  if (viteApiUrl && viteApiUrl.trim() !== "") {
    // Asegurar que termine con /api pero sin duplicar
    const cleanUrl = viteApiUrl.trim().replace(/\/+$/, "");
    return `${cleanUrl}/api`;
  }
  
  // Fallback para desarrollo: localhost por defecto
  if (import.meta.env.DEV) {
    console.warn(
      "[API_CONFIG] VITE_API_URL no definida, usando fallback de desarrollo: http://localhost:3000"
    );
    return "http://localhost:3000/api";
  }
  
  // En producción sin VITE_API_URL: usar URL relativa (asume mismo dominio)
  console.warn(
    "[API_CONFIG] VITE_API_URL no definida en producción, usando URL relativa: /api"
  );
  return "/api";
};

const BASE_URL = getBaseUrl();

// Log de configuración en desarrollo o si está habilitado el debug
if (import.meta.env.DEV || localStorage.getItem("debug_api") === "1") {
  console.log("[API_CONFIG] Configuración de API:", {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    BASE_URL,
    TIMEOUT: import.meta.env.VITE_TIMEOUT || 10000,
    MODE: import.meta.env.MODE,
  });
}

export const API_CONFIG = {
  BASE_URL,
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/auth/login",
      REGISTER: "/auth/register",
      CHANGE_PASSWORD: "/auth/change-password",
    },
    EMPRESAS: {
      LIST: "/empresas",
    },
    EMPLOYEES: {
      LIST_BY_DEPARTMENT: "/empleados/departamento",
      LIST_BY_COMPANY: "/empleados/empresa",
    },
    // Aquí puedes agregar más endpoints cuando los necesites
    TIMESHEET: {
      // Endpoints futuros para planillas
      DETAIL: (empleadoId: number, start: string, end: string) =>
        `/planillas/detalle/${empleadoId}?start=${start}&end=${end}`,
    },
  },
  TIMEOUT: Number(import.meta.env.VITE_TIMEOUT) || 10000,
} as const;
