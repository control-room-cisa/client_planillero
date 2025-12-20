export const API_CONFIG = {
  BASE_URL: `${import.meta.env.VITE_API_URL}/api`,
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
  TIMEOUT: import.meta.env.VITE_TIMEOUT || 10000,
} as const;
