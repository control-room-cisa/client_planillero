import * as React from "react";
import {
  Box,
  Alert,
  Button,
  CircularProgress,
} from "@mui/material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ProrrateoDashboard from "./gestion-prorrateo/ProrrateoDashboard";
import EmpleadoService from "../../services/empleadoService";
import type { Empleado } from "../../services/empleadoService";

import type { EmpleadoIndexItem } from "../Layout";

/**
 * Detalle de prorrateo por código en la URL; el backend valida acceso por empresa (accesos_contabilidad).
 */
const ProrrateoColaboradorPage: React.FC = () => {
  const { codigoEmpleado } = useParams<{ codigoEmpleado: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [empleado, setEmpleado] = React.useState<Empleado | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const empleadosIndexFromNav = (location.state?.empleadosIndex ??
    []) as EmpleadoIndexItem[];

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!codigoEmpleado) {
        setLoadError("Código de colaborador no válido");
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const decoded = decodeURIComponent(codigoEmpleado);
        const data = await EmpleadoService.getByCodigoForProrrateo(decoded);
        if (!cancelled) setEmpleado(data);
      } catch (e: unknown) {
        if (!cancelled) {
          const err = e as {
            response?: { data?: { message?: string }; status?: number };
            message?: string;
          };
          setLoadError(
            err?.response?.data?.message ||
              err?.message ||
              "No se pudo cargar el colaborador"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [codigoEmpleado]);

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
          onClick={() => navigate("/prorrateo", { state: location.state })}
        >
          Volver al listado
        </Button>
      </Box>
    );
  }

  return (
    <ProrrateoDashboard
      empleado={empleado}
      empleadosIndex={empleadosIndexFromNav}
      hasPrevious={false}
      hasNext={false}
    />
  );
};

export default ProrrateoColaboradorPage;
