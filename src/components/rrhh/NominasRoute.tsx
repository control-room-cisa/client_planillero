// src/routes/NominasRoute.tsx (o donde prefieras)
import * as React from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import { Fade, Box, CircularProgress } from "@mui/material";
import type { LayoutOutletCtx } from "../Layout";
import NominasDashboard from "./gestion-empleados/NominasDashboard";
import EmpleadoService from "../../services/empleadoService";
import type { Empleado } from "../../services/empleadoService";

const NominasRoute: React.FC = () => {
  const { codigoEmpleado } = useParams<{ codigoEmpleado: string }>();
  const { selectedEmpleado, empleadosIndex } = useOutletContext<LayoutOutletCtx>();
  const [empleado, setEmpleado] = React.useState<Empleado | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const empleadoAnteriorRef = React.useRef<Empleado | null>(null);

  React.useEffect(() => {
    const cargarEmpleado = async () => {
      if (!codigoEmpleado) {
        setLoading(false);
        return;
      }

      // Si hay un empleado anterior, guardarlo para la transición
      if (empleado) {
        empleadoAnteriorRef.current = empleado;
      }

      setIsTransitioning(true);
      setLoading(true);

      // Pequeño delay para permitir que la transición se vea
      await new Promise((resolve) => setTimeout(resolve, 150));

      try {
        // Primero intentar buscar en el índice si está disponible
        if (empleadosIndex && empleadosIndex.length > 0) {
          const empleadoEncontrado = empleadosIndex.find(
            (e) => e.codigo === codigoEmpleado
          );
          if (empleadoEncontrado) {
            // Cargar empleado completo por ID
            const empleadoCompleto = await EmpleadoService.getById(empleadoEncontrado.id);
            setEmpleado(empleadoCompleto);
            setLoading(false);
            // Delay adicional para suavizar la transición
            setTimeout(() => setIsTransitioning(false), 100);
            return;
          }
        }

        // Si no está en el índice, intentar buscar por código
        // Necesitamos listar empleados y buscar por código
        const empleados = await EmpleadoService.list();
        const empleadoEncontrado = empleados.find(
          (e) => e.codigo === codigoEmpleado
        );
        
        if (empleadoEncontrado) {
          // Cargar empleado completo por ID
          const empleadoCompleto = await EmpleadoService.getById(empleadoEncontrado.id);
          setEmpleado(empleadoCompleto);
        } else {
          setEmpleado(null);
        }
      } catch (error) {
        console.error("Error al cargar empleado:", error);
        setEmpleado(null);
      } finally {
        setLoading(false);
        // Delay adicional para suavizar la transición
        setTimeout(() => setIsTransitioning(false), 100);
      }
    };

    cargarEmpleado();
  }, [codigoEmpleado, empleadosIndex]);

  // Si no hay código en la URL, redirigir a la lista
  if (!codigoEmpleado) {
    return <Navigate to="/rrhh/colaboradores" replace />;
  }

  // Si no se encontró el empleado, redirigir a la lista
  if (!empleado && !loading) {
    return <Navigate to="/rrhh/colaboradores" replace />;
  }

  // Mostrar empleado anterior durante la transición si existe
  const empleadoAMostrar = empleado || empleadoAnteriorRef.current;

  return (
    <>
      {/* Overlay de carga sutil */}
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
            pointerEvents: "none", // Permitir scroll a través del overlay
          }}
        >
          <CircularProgress size={48} />
        </Box>
      )}

      {/* Contenido con transición suave */}
      {empleadoAMostrar && (
        <Fade in={!isTransitioning && !loading} timeout={300}>
          <Box
            sx={{
              opacity: isTransitioning || loading ? 0.5 : 1,
              transition: "opacity 0.3s ease-in-out",
              height: "100%", // Permitir que el Container interno maneje el scroll
            }}
          >
            <NominasDashboard
              empleado={empleadoAMostrar}
              empleadosIndex={empleadosIndex}
            />
          </Box>
        </Fade>
      )}
    </>
  );
};

export default NominasRoute;
