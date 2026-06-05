import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Box, Typography, Snackbar, Alert, Divider } from "@mui/material";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import EmpleadoService from "../../services/empleadoService";
import { empresaService } from "../../services/empresaService";
import type { Empleado } from "../../services/empleadoService";
import type { Empresa } from "../../types/auth";
import EmpleadosList from "./gestion-prorrateo/EmpleadosList";
import EmpleadosFilters from "./gestion-prorrateo/EmpleadosFilters";
import type { LayoutOutletCtx } from "../Layout";
import {
  persistProrrateoIndexSession,
  resolveEmpleadosIndexForNomina,
} from "../../utils/nominasEmpleadosIndexSession";

const ProrrateoManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { setSelectedEmpleado, setEmpleadosIndex } =
    useOutletContext<LayoutOutletCtx>();

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [showInactivos, setShowInactivos] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error") => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  const fetchEmpleados = useCallback(async () => {
    if (!selectedEmpresaId) {
      setEmpleados([]);
      return;
    }
    setLoading(true);
    try {
      const empresaId = parseInt(selectedEmpresaId);
      const data = await EmpleadoService.getAll(empresaId);
      setEmpleados(data);
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      showSnackbar("Error al cargar los colaboradores", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedEmpresaId, showSnackbar]);

  const fetchEmpresas = useCallback(async () => {
    try {
      const response = await empresaService.getEmpresas();
      if (response.success) setEmpresas(response.data);
    } catch (err) {
      console.error("Error al cargar empresas:", err);
      showSnackbar("Error al cargar las empresas", "error");
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  useEffect(() => {
    if (location.state?.selectedEmpresaId) {
      setSelectedEmpresaId(location.state.selectedEmpresaId);
    }
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  const filteredEmpleados = empleados.filter((empleado) => {
    if (!showInactivos && !empleado.activo) return false;
    const q = searchTerm.toLowerCase();
    return (
      empleado.nombre?.toLowerCase().includes(q) ||
      empleado.apellido?.toLowerCase().includes(q) ||
      empleado.codigo?.toLowerCase().includes(q) ||
      empleado.correoElectronico?.toLowerCase().includes(q) ||
      empleado.cargo?.toLowerCase().includes(q)
    );
  });

  const empleadosActivosIndexList = React.useMemo(() => {
    return empleados
      .filter((e) => e.activo)
      .map((e) => ({
        id: e.id,
        codigo: e.codigo ?? null,
        nombreCompleto: `${e.nombre ?? ""} ${e.apellido ?? ""}`.trim(),
      }))
      .sort((a, b) =>
        a.nombreCompleto
          .toLowerCase()
          .localeCompare(b.nombreCompleto.toLowerCase())
      );
  }, [empleados]);

  const handleProrrateoClick = (empleado: Empleado) => {
    const codigo = empleado.codigo?.trim();
    if (!codigo) {
      showSnackbar(
        "Este colaborador no tiene código asignado; no se puede abrir el prorrateo por enlace.",
        "error"
      );
      return;
    }

    const indexForNavigation = resolveEmpleadosIndexForNomina(
      empleado,
      empleadosActivosIndexList
    );
    setEmpleadosIndex(indexForNavigation);
    persistProrrateoIndexSession(indexForNavigation);
    setSelectedEmpleado(empleado);

    navigate(`/prorrateo/${encodeURIComponent(codigo)}`, {
      state: {
        fromProrrateoList: true,
        selectedEmpresaId,
        searchTerm,
      },
    });
  };

  const handleCloseSnackbar = (): void => {
    setSnackbar((s) => ({ ...s, open: false }));
  };

  return (
    <Box
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Typography
        variant="h5"
        component="h1"
        sx={{ fontWeight: "bold", minWidth: 0 }}
      >
        Gestión de Prorrateo
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ mb: 3, flexShrink: 0 }}>
        <EmpleadosFilters
          searchTerm={searchTerm}
          selectedEmpresaId={selectedEmpresaId}
          empresas={empresas}
          showInactivos={showInactivos}
          onSearchChange={setSearchTerm}
          onEmpresaChange={setSelectedEmpresaId}
          onShowInactivosChange={setShowInactivos}
        />
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <EmpleadosList
          empleados={filteredEmpleados}
          loading={loading}
          onProrrateoClick={handleProrrateoClick}
        />
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProrrateoManagement;
