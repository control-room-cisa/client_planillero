export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/api',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
    },
    EMPRESAS: {
      LIST: '/empresas',
    },
    // Aquí puedes agregar más endpoints cuando los necesites
    TIMESHEET: {
      // Endpoints futuros para planillas
    },
  },
  TIMEOUT: 10000,
} as const; 