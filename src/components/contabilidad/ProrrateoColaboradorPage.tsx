import * as React from "react";
import {
  Box,
  Alert,
  Button,
  CircularProgress,
  Fade,
} from "@mui/material";
import {
  useParams,
  useNavigate,
  useLocation,
  useOutletContext,
} from "react-router-dom";
import ProrrateoDashboard from "./gestion-prorrateo/ProrrateoDashboard";
import EmpleadoService from "../../services/empleadoService";
import type { Empleado } from "../../services/empleadoService";
import type { EmpleadoIndexItem, LayoutOutletCtx } from "../Layout";
import {
  isSameEmpleadosIndex,
  persistProrrateoIndexSession,
  toEmpleadoIndexItem,
} from "../../utils/nominasEmpleadosIndexSession";

type ProrrateoLocationState = {
  fromProrrateoList?: boolean;
  prorrateoNav?: boolean;
  selectedEmpresaId?: string;
  searchTerm?: string;
};

/**
 * Detalle de prorrateo por código en la URL; el backend valida acceso por empresa (accesos_contabilidad).
 */
const ProrrateoColaboradorPage: React.FC = () => {
  const { codigoEmpleado } = useParams<{ codigoEmpleado: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? {}) as ProrrateoLocationState;
  const { empleadosIndex, setEmpleadosIndex } =
    useOutletContext<LayoutOutletCtx>();

  const [empleado, setEmpleado] = React.useState<Empleado | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const empleadosIndexRef = React.useRef(empleadosIndex);
  empleadosIndexRef.current = empleadosIndex;

  const setEmpleadosIndexRef = React.useRef(setEmpleadosIndex);
  setEmpleadosIndexRef.current = setEmpleadosIndex;

  React.useLayoutEffect(() => {
    if (!codigoEmpleado) return;
    setLoading(true);
    setEmpleado((prev) => {
      if (
        prev != null &&
        String(prev.codigo ?? "") !== String(decodeURIComponent(codigoEmpleado))
      ) {
        return null;
      }
      return prev;
    });
  }, [codigoEmpleado]);

  React.useEffect(() => {
    const cargarEmpleado = async () => {
      if (!codigoEmpleado) {
        setLoadError("Código de colaborador no válido");
        setLoading(false);
        return;
      }

      setIsTransitioning(true);
      setLoading(true);
      setLoadError(null);

      const decoded = decodeURIComponent(codigoEmpleado);

      const applyEmpleadosIndexIfChanged = (next: EmpleadoIndexItem[]) => {
        if (isSameEmpleadosIndex(next, empleadosIndexRef.current)) return;
        setEmpleadosIndexRef.current(next);
        empleadosIndexRef.current = next;
        persistProrrateoIndexSession(next);
      };

      const preserveIndex =
        navState.fromProrrateoList === true ||
        navState.prorrateoNav === true;

      try {
        const currentIndex = empleadosIndexRef.current;

        if (preserveIndex && currentIndex.length > 0) {
          const empleadoEncontrado = currentIndex.find(
            (e) => e.codigo === decoded
          );
          if (empleadoEncontrado) {
            const empleadoCompleto =
              await EmpleadoService.getByCodigoForProrrateo(decoded);
            if (!empleadoCompleto.activo) {
              applyEmpleadosIndexIfChanged([
                toEmpleadoIndexItem(empleadoCompleto),
              ]);
            }
            setEmpleado(empleadoCompleto);
            setLoading(false);
            setTimeout(() => setIsTransitioning(false), 100);
            return;
          }
        }

        const empleadoCompleto =
          await EmpleadoService.getByCodigoForProrrateo(decoded);
        applyEmpleadosIndexIfChanged([toEmpleadoIndexItem(empleadoCompleto)]);
        setEmpleado(empleadoCompleto);
      } catch (e: unknown) {
        const err = e as {
          response?: { data?: { message?: string }; status?: number };
          message?: string;
        };
        setLoadError(
          err?.response?.data?.message ||
            err?.message ||
            "No se pudo cargar el colaborador"
        );
        setEmpleado(null);
      } finally {
        setLoading(false);
        setTimeout(() => setIsTransitioning(false), 100);
      }
    };

    cargarEmpleado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoEmpleado]);

  if (!codigoEmpleado) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Código de colaborador no válido
        </Alert>
        <Button variant="contained" onClick={() => navigate("/prorrateo")}>
          Volver al listado
        </Button>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError || !empleado) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError || "Colaborador no encontrado"}
        </Alert>
        <Button
          variant="contained"
          onClick={() =>
            navigate("/prorrateo", {
              state: {
                selectedEmpresaId: navState.selectedEmpresaId,
                searchTerm: navState.searchTerm,
              },
            })
          }
        >
          Volver al listado
        </Button>
      </Box>
    );
  }

  const empleadoCoincideUrl =
    String(empleado.codigo ?? "") ===
    String(decodeURIComponent(codigoEmpleado ?? ""));
  const empleadoAMostrar = empleadoCoincideUrl ? empleado : null;

  if (!empleadoAMostrar) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Fade in={!isTransitioning && !loading} timeout={300}>
      <Box
        sx={{
          opacity: isTransitioning || loading ? 0.5 : 1,
          transition: "opacity 0.3s ease-in-out",
          height: "100%",
        }}
      >
        <ProrrateoDashboard
          empleado={empleadoAMostrar}
          empleadosIndex={empleadosIndex}
        />
      </Box>
    </Fade>
  );
};

export default ProrrateoColaboradorPage;
