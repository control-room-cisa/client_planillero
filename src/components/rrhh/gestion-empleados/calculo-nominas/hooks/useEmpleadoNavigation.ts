import * as React from "react";
import {
  useNavigate,
  useOutletContext,
  useLocation,
  useParams,
} from "react-router-dom";
import type { Empleado } from "../../../../../services/empleadoService";
import EmpleadoService from "../../../../../services/empleadoService";
import type {
  EmpleadoIndexItem,
  LayoutOutletCtx,
} from "../../../../Layout";

const DEBUG = true;

export interface UseEmpleadoNavigationParams {
  empleadoProp?: Empleado;
  empleadosIndexProp?: EmpleadoIndexItem[];
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export interface UseEmpleadoNavigationReturn {
  empleado: Empleado | null;
  setEmpleado: React.Dispatch<React.SetStateAction<Empleado | null>>;
  empleadosIndex: EmpleadoIndexItem[];
  idx: number;
  hayPrev: boolean;
  hayNext: boolean;
  goPrev: () => void;
  goNext: () => void;
  goBackToList: () => void;
  selectedEmpresaId: any;
  searchTerm: any;
}

/**
 * Hook que centraliza navegación entre empleados en el dashboard de nóminas:
 *  - Obtiene empleado inicial desde props / outlet context / location state.
 *  - Expone `goPrev`, `goNext`, `goBackToList`.
 *  - Realiza auto-realineamiento cuando el empleado actual no está en el índice.
 *  - Carga datos completos del colaborador cuando faltan campos clave.
 */
export function useEmpleadoNavigation({
  empleadoProp,
  empleadosIndexProp,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: UseEmpleadoNavigationParams): UseEmpleadoNavigationReturn {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { codigoEmpleado } = useParams<{ codigoEmpleado?: string }>();
  const { selectedEmpleado, empleadosIndex: empleadosIndexCtx } =
    useOutletContext<LayoutOutletCtx>();

  // Leer filtros previos si existen
  const { selectedEmpresaId, searchTerm } = location.state ?? {};

  const goBackToList = () => {
    navigate("/rrhh/colaboradores", {
      state: {
        selectedEmpresaId,
        searchTerm,
      },
    });
  };

  // Orígenes
  const empleadoInicial =
    empleadoProp ?? selectedEmpleado ?? location?.state?.empleado ?? null;

  const indiceEntrante: EmpleadoIndexItem[] =
    empleadosIndexProp ??
    empleadosIndexCtx ??
    location?.state?.empleadosIndex ??
    [];

  // Empleado actual navegable
  const [empleado, setEmpleado] = React.useState<Empleado | null>(
    empleadoInicial,
  );

  // Derivar índice (no se congela)
  const empleadosIndex: EmpleadoIndexItem[] = React.useMemo(
    () => indiceEntrante ?? [],
    [indiceEntrante],
  );

  // Sincronizar empleado cuando cambia empleadoProp
  React.useEffect(() => {
    if (empleadoProp) {
      // Verificar si el empleado realmente cambió para evitar actualizaciones innecesarias
      const empleadoActualCodigo = (empleado as any)?.codigo;
      const nuevoEmpleadoCodigo = (empleadoProp as any)?.codigo;

      if (
        empleadoActualCodigo !== nuevoEmpleadoCodigo ||
        empleado?.id !== empleadoProp.id
      ) {
        if (DEBUG) {
          console.debug(
            "[CalculoNominas] empleadoProp cambió, actualizando estado",
            {
              empleadoIdAnterior: empleado?.id,
              empleadoIdNuevo: empleadoProp.id,
              codigoEmpleadoAnterior: empleadoActualCodigo,
              codigoEmpleadoNuevo: nuevoEmpleadoCodigo,
              codigoEmpleadoUrl: codigoEmpleado,
            },
          );
        }
        setEmpleado(empleadoProp);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoProp?.id, (empleadoProp as any)?.codigo]); // Solo dependencias del empleadoProp, no del estado interno

  React.useEffect(() => {
    if (DEBUG) {
      console.debug("[CalculoNominas] mount", {
        empleadoInicialId: empleadoInicial?.id,
        indiceEntranteLen: indiceEntrante?.length ?? 0,
        empleadosIndexCtxLen: empleadosIndexCtx?.length ?? 0,
        empleadosIndexPropLen: empleadosIndexProp?.length ?? 0,
        locationState: location?.state,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount

  // Utils
  const eq = (a: any, b: any) =>
    a != null && b != null && String(a) === String(b);

  const splitNombre = (nombreCompleto?: string) => {
    const parts = (nombreCompleto || "").trim().split(/\s+/);
    const nombre = parts[0] || "";
    const apellido = parts.slice(1).join(" ");
    return { nombre, apellido };
  };

  // Índice actual robusto
  const getCurrentIdx = React.useCallback(() => {
    if (DEBUG) {
      console.debug("[CalculoNominas] getCurrentIdx llamado", {
        empleadoId: empleado?.id,
        empleadoCodigo: (empleado as any)?.codigo,
        empleadosIndexLength: empleadosIndex?.length,
        empleadosIndex: empleadosIndex,
      });
    }

    if (!empleado || !empleadosIndex?.length) return -1;

    let i = empleadosIndex.findIndex((x) => eq(x.id, (empleado as any).id));
    if (DEBUG)
      console.debug("[CalculoNominas] búsqueda por ID:", {
        i,
        empleadoId: empleado.id,
      });
    if (i >= 0) return i;

    if ((empleado as any).codigo) {
      i = empleadosIndex.findIndex((x) =>
        x.codigo ? eq(x.codigo, (empleado as any).codigo) : false,
      );
      if (DEBUG)
        console.debug("[CalculoNominas] búsqueda por código:", {
          i,
          empleadoCodigo: (empleado as any).codigo,
        });
      if (i >= 0) return i;
    }

    const nombreCompletoActual = `${empleado.nombre ?? ""} ${
      empleado.apellido ?? ""
    }`.trim();
    i = empleadosIndex.findIndex(
      (x) => (x.nombreCompleto || "").trim() === nombreCompletoActual,
    );
    if (DEBUG)
      console.debug("[CalculoNominas] búsqueda por nombre:", {
        i,
        nombreCompletoActual,
      });

    return i;
  }, [empleado, empleadosIndex]);

  const idx = getCurrentIdx();
  const hayPrev = idx > 0;
  const hayNext = idx >= 0 && idx < empleadosIndex.length - 1;

  // Función para cargar empleado completo por ID
  const cargarEmpleadoCompleto = React.useCallback(
    async (empleadoId: number) => {
      try {
        if (DEBUG)
          console.debug(
            "[CalculoNominas] Cargando empleado completo:",
            empleadoId,
          );
        const empleadoCompleto = await EmpleadoService.getById(empleadoId);
        setEmpleado(empleadoCompleto);
        if (DEBUG)
          console.debug("[CalculoNominas] Empleado cargado:", empleadoCompleto);
      } catch (error) {
        console.error("[CalculoNominas] Error al cargar empleado:", error);
        const empleadoIndex = empleadosIndex.find((e) => e.id === empleadoId);
        if (empleadoIndex) {
          const { nombre, apellido } = splitNombre(
            empleadoIndex.nombreCompleto,
          );
          setEmpleado(
            (prev) =>
              ({
                ...prev,
                id: empleadoIndex.id as any,
                codigo: empleadoIndex.codigo,
                nombre,
                apellido,
              }) as Empleado,
          );
        }
      }
    },
    [empleadosIndex],
  );

  // 🔧 Alineación automática si llega índice pero el actual no está
  React.useEffect(() => {
    if (!empleado || !empleadosIndex.length) return;
    if (idx !== -1) return;

    if ((empleado as any).codigo) {
      const j = empleadosIndex.findIndex(
        (x) => x.codigo && eq(x.codigo, (empleado as any).codigo),
      );
      if (j >= 0) {
        const target = empleadosIndex[j];
        const { nombre, apellido } = splitNombre(target.nombreCompleto);
        if (DEBUG)
          console.debug("[CalculoNominas] realineado por código →", target);
        setEmpleado(
          (prevEmp) =>
            ({
              ...(prevEmp ?? ({} as any)),
              id: target.id as any,
              codigo: target.codigo ?? (prevEmp as any)?.codigo ?? null,
              nombre,
              apellido,
            }) as Empleado,
        );
        return;
      }
    }

    const first = empleadosIndex[0];
    const { nombre, apellido } = splitNombre(first.nombreCompleto);
    if (DEBUG)
      console.debug(
        "[CalculoNominas] realineado al primero del índice →",
        first,
      );
    setEmpleado(
      (prevEmp) =>
        ({
          ...(prevEmp ?? ({} as any)),
          id: first.id as any,
          codigo: first.codigo ?? (prevEmp as any)?.codigo ?? null,
          nombre,
          apellido,
        }) as Empleado,
    );
  }, [idx, empleado, empleadosIndex]);

  React.useEffect(() => {
    if (DEBUG) {
      const prevDisabled = !(empleadosIndex?.length ? hayPrev : hasPrevious);
      const nextDisabled = !(empleadosIndex?.length ? hayNext : hasNext);
      console.debug("[CalculoNominas] estado navegación", {
        empleadosIndexLen: empleadosIndex.length,
        empleadoId: empleado?.id,
        idx,
        hayPrev,
        hayNext,
        prevDisabled,
        nextDisabled,
        empleadosIndex: empleadosIndex,
        empleado: empleado,
      });
    }
  }, [
    empleadosIndex.length,
    empleado?.id,
    idx,
    hayPrev,
    hayNext,
    hasPrevious,
    hasNext,
    empleadosIndex,
    empleado,
  ]);

  const goPrev = () => {
    if (DEBUG) {
      console.debug("[CalculoNominas] goPrev llamado", {
        empleadosIndexLength: empleadosIndex?.length,
        hayPrev,
        idx,
        empleadoId: empleado?.id,
      });
    }

    if (empleadosIndex?.length && hayPrev) {
      const prev = empleadosIndex[idx - 1];
      if (DEBUG) console.debug("[CalculoNominas] goPrev ->", prev);
      // Si hay código, navegar a la nueva ruta; si no, cargar directamente
      if (prev.codigo) {
        navigate(`/rrhh/colaboradores/nomina/${prev.codigo}`, {
          state: {
            selectedEmpresaId,
            searchTerm,
          },
        });
      } else {
        cargarEmpleadoCompleto(prev.id);
      }
    } else if (onPrevious) {
      if (DEBUG) console.debug("[CalculoNominas] goPrev -> onPrevious()");
      onPrevious();
    } else if (DEBUG) {
      console.debug("[CalculoNominas] goPrev disabled");
    }
  };

  const goNext = () => {
    if (DEBUG) {
      console.debug("[CalculoNominas] goNext llamado", {
        empleadosIndexLength: empleadosIndex?.length,
        hayNext,
        idx,
        empleadoId: empleado?.id,
      });
    }

    if (empleadosIndex?.length && hayNext) {
      const next = empleadosIndex[idx + 1];
      if (DEBUG) console.debug("[CalculoNominas] goNext ->", next);
      // Si hay código, navegar a la nueva ruta; si no, cargar directamente
      if (next.codigo) {
        navigate(`/rrhh/colaboradores/nomina/${next.codigo}`, {
          state: {
            selectedEmpresaId,
            searchTerm,
          },
        });
      } else {
        cargarEmpleadoCompleto(next.id);
      }
    } else if (onNext) {
      if (DEBUG) console.debug("[CalculoNominas] goNext -> onNext()");
      onNext();
    } else if (DEBUG) {
      console.debug("[CalculoNominas] goNext disabled");
    }
  };

  // Asegurar datos completos del colaborador (contacto/banco/salario)
  const fullLoadedRef = React.useRef<Set<number>>(new Set());
  React.useEffect(() => {
    if (!empleado || !empleado.id) return;
    const id = empleado.id as number;
    const needsFull =
      empleado.sueldoMensual == null ||
      empleado.banco == null ||
      empleado.tipoCuenta == null ||
      empleado.numeroCuenta == null ||
      empleado.correoElectronico == null ||
      empleado.telefono == null ||
      empleado.direccion == null;
    if (needsFull && !fullLoadedRef.current.has(id)) {
      cargarEmpleadoCompleto(id);
      fullLoadedRef.current.add(id);
    }
  }, [empleado, cargarEmpleadoCompleto]);

  return {
    empleado,
    setEmpleado,
    empleadosIndex,
    idx,
    hayPrev,
    hayNext,
    goPrev,
    goNext,
    goBackToList,
    selectedEmpresaId,
    searchTerm,
  };
}
