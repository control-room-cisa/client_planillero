import api from "./api";
import type { ApiResponse } from "../dtos/apiResponseDto";

export type TipoSolicitudPermiso = "VACACIONES" | "PERMISO";

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

export type SolicitudEmpleado = {
  id: number;
  codigo: string | null;
  nombre: string;
  apellido: string | null;
  departamento: string | null;
  empresaId: number | null;
  empresa: string | null;
};

export type SolicitudPermiso = {
  id: number;
  tipo: TipoSolicitudPermiso;
  comentario: string | null;
  aprobacionSupervisor: boolean | null;
  aprobacionRrhh: boolean | null;
  comentarioSupervisor: string | null;
  comentarioRrhh: string | null;
  fechaAprobacionSupervisor: string | null;
  fechaAprobacionRrhh: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  empleado: SolicitudEmpleado;
  totalDias: number;
  primeraFecha: string | null;
  ultimaFecha: string | null;
  editable: boolean;
};

export type SolicitudDia = {
  id: number;
  fecha: string;
  comentarioHorario: string | null;
};

export type DiaInput = {
  fecha: string;
  comentarioHorario?: string | null;
};

export type SolicitudInput = {
  tipo: TipoSolicitudPermiso;
  comentario?: string | null;
  dias: DiaInput[];
};

export type CalendarioDia = {
  fecha: string;
  solicitados: number;
  aprobados: number;
};

export type OcupacionDia = {
  persona: SolicitudEmpleado;
  solicitudId: number;
  tipo: TipoSolicitudPermiso;
  estado: "SOLICITADO" | "APROBADO";
  comentarioHorario: string | null;
};

const base = "/solicitudes-permisos";

const cambioListeners = new Set<() => void>();

export function onSolicitudesCambiaron(listener: () => void) {
  cambioListeners.add(listener);
  return () => {
    cambioListeners.delete(listener);
  };
}

function avisarCambio() {
  cambioListeners.forEach((listener) => listener());
}

async function getData<T>(url: string, params?: object): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url, { params });
  return response.data.data;
}

export class SolicitudPermisoService {
  static listMias(page: number, limit: number) {
    return getData<Paginated<SolicitudPermiso>>(`${base}/mias`, { page, limit });
  }

  static getMia(id: number) {
    return getData<SolicitudPermiso>(`${base}/mias/${id}`);
  }

  static listDiasMias(id: number, page: number, limit: number) {
    return getData<Paginated<SolicitudDia>>(`${base}/mias/${id}/dias`, {
      page,
      limit,
    });
  }

  static async create(body: SolicitudInput) {
    const response = await api.post<ApiResponse<SolicitudPermiso>>(
      `${base}/mias`,
      body
    );
    avisarCambio();
    return response.data.data;
  }

  static async update(id: number, body: SolicitudInput) {
    const response = await api.patch<ApiResponse<SolicitudPermiso>>(
      `${base}/mias/${id}`,
      body
    );
    avisarCambio();
    return response.data.data;
  }

  static async remove(id: number) {
    await api.delete<ApiResponse<null>>(`${base}/mias/${id}`);
    avisarCambio();
  }

  static listSupervision(page: number, limit: number) {
    return getData<Paginated<SolicitudPermiso>>(`${base}/supervision`, {
      page,
      limit,
    });
  }

  static getSupervision(id: number) {
    return getData<SolicitudPermiso>(`${base}/supervision/${id}`);
  }

  static listDiasSupervision(id: number, page: number, limit: number) {
    return getData<Paginated<SolicitudDia>>(`${base}/supervision/${id}/dias`, {
      page,
      limit,
    });
  }

  static calendario(desde: string, hasta: string) {
    return getData<CalendarioDia[]>(`${base}/supervision/calendario`, {
      desde,
      hasta,
    });
  }

  static ocupacionDia(fecha: string, page: number, limit: number) {
    return getData<Paginated<OcupacionDia>>(
      `${base}/supervision/calendario/dia`,
      { fecha, page, limit }
    );
  }

  static async decidirSupervision(
    id: number,
    aprobado: boolean,
    comentario?: string | null
  ) {
    const response = await api.patch<ApiResponse<SolicitudPermiso>>(
      `${base}/supervision/${id}/decision`,
      { aprobado, comentario }
    );
    avisarCambio();
    return response.data.data;
  }

  static pendientesSupervision() {
    return getData<{ count: number }>(`${base}/supervision/pendientes`).then(
      (data) => data.count
    );
  }

  static listRrhh(empresaId: number, page: number, limit: number) {
    return getData<Paginated<SolicitudPermiso>>(`${base}/rrhh`, {
      empresaId,
      page,
      limit,
    });
  }

  static getRrhh(id: number) {
    return getData<SolicitudPermiso>(`${base}/rrhh/${id}`);
  }

  static listDiasRrhh(id: number, page: number, limit: number) {
    return getData<Paginated<SolicitudDia>>(`${base}/rrhh/${id}/dias`, {
      page,
      limit,
    });
  }

  static async decidirRrhh(
    id: number,
    aprobado: boolean,
    comentario?: string | null
  ) {
    const response = await api.patch<ApiResponse<SolicitudPermiso>>(
      `${base}/rrhh/${id}/decision`,
      { aprobado, comentario }
    );
    avisarCambio();
    return response.data.data;
  }

  static pendientesRrhh() {
    return getData<{ count: number }>(`${base}/rrhh/pendientes`).then(
      (data) => data.count
    );
  }
}

export function solicitudErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string; errors?: { message: string }[] } } })
    ?.response?.data;
  if (data?.errors?.length) {
    return data.errors.map((item) => item.message).join(". ");
  }
  if (data?.message) return data.message;
  return fallback;
}
