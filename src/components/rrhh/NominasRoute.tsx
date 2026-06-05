// src/routes/NominasRoute.tsx (o donde prefieras)
import * as React from "react";
import {
  Navigate,
  useLocation,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { Fade, Box, CircularProgress } from "@mui/material";
import type { LayoutOutletCtx } from "../Layout";
import {
  isSameEmpleadosIndex,
  persistEmpleadosIndexSession,
  toEmpleadoIndexItem,
} from "../../utils/nominasEmpleadosIndexSession";
import type { EmpleadoIndexItem } from "../Layout";
import CalculoNominas from "./gestion-empleados/calculo-nominas/CalculoNominasDashboard";
import { useNominaPeriodos } from "./gestion-empleados/calculo-nominas/hooks/useNominaPeriodos";
import EmpleadoService from "../../services/empleadoService";
import type { Empleado } from "../../services/empleadoService";

type NominasLocationState = {
  fromColaboradoresList?: boolean;
  nominaNav?: boolean;
  selectedEmpresaId?: string;
  searchTerm?: string;
};

const NominasRoute: React.FC = () => {
  const { codigoEmpleado } = useParams<{ codigoEmpleado: string }>();
  const location = useLocation();
  const navState = (location.state ?? {}) as NominasLocationState;
  const { empleadosIndex, setEmpleadosIndex } =
    useOutletContext<LayoutOutletCtx>();

  const [empleado, setEmpleado] = React.useState<Empleado | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const empleadosIndexRef = React.useRef(empleadosIndex);
  empleadosIndexRef.current = empleadosIndex;

  const setEmpleadosIndexRef = React.useRef(setEmpleadosIndex);
  setEmpleadosIndexRef.current = setEmpleadosIndex;

  const nominaPeriodos = useNominaPeriodos();

  React.useLayoutEffect(() => {
    if (!codigoEmpleado) return;
    setLoading(true);
    setEmpleado((prev) => {
      if (
        prev != null &&
        String(prev.codigo ?? "") !== String(codigoEmpleado)
      ) {
        return null;
      }
      return prev;
    });
  }, [codigoEmpleado]);

  React.useEffect(() => {
    const cargarEmpleado = async () => {
      if (!codigoEmpleado) {
        setLoading(false);
        return;
      }

      setIsTransitioning(true);
      setLoading(true);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const applyEmpleadosIndexIfChanged = (next: EmpleadoIndexItem[]) => {
        if (isSameEmpleadosIndex(next, empleadosIndexRef.current)) return;
        setEmpleadosIndexRef.current(next);
        empleadosIndexRef.current = next;
        persistEmpleadosIndexSession(next);
      };

      const preserveIndex =
        navState.fromColaboradoresList === true ||
        navState.nominaNav === true;

      try {
        const currentIndex = empleadosIndexRef.current;

        if (preserveIndex && currentIndex.length > 0) {
          const empleadoEncontrado = currentIndex.find(
            (e) => e.codigo === codigoEmpleado
          );
          if (empleadoEncontrado) {
            const empleadoCompleto = await EmpleadoService.getById(
              empleadoEncontrado.id
            );
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

        // Acceso directo por URL: solo el colaborador de la ruta (sin lista de navegación)
        const empleadoCompleto =
          await EmpleadoService.getByCodigo(codigoEmpleado);
        applyEmpleadosIndexIfChanged([toEmpleadoIndexItem(empleadoCompleto)]);
        setEmpleado(empleadoCompleto);
      } catch (error) {
        console.error("Error al cargar empleado:", error);
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
    return <Navigate to="/rrhh/colaboradores" replace />;
  }

  if (!empleado && !loading) {
    return <Navigate to="/rrhh/colaboradores" replace />;
  }

  const empleadoCoincideUrl =
    empleado != null &&
    String(empleado.codigo ?? "") === String(codigoEmpleado ?? "");
  const empleadoAMostrar = empleadoCoincideUrl ? empleado : null;

  return (
    <>
      {loading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            zIndex: 1000,
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
          }}
        >
          <CircularProgress size={48} />
        </Box>
      )}

      {empleadoAMostrar && (
        <Fade in={!isTransitioning && !loading} timeout={300}>
          <Box
            sx={{
              opacity: isTransitioning || loading ? 0.5 : 1,
              transition: "opacity 0.3s ease-in-out",
              height: "100%",
            }}
          >
            <CalculoNominas
              empleado={empleadoAMostrar}
              empleadosIndex={empleadosIndex}
              nominaPeriodos={nominaPeriodos}
            />
          </Box>
        </Fade>
      )}
    </>
  );
};

export default NominasRoute;
