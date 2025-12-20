import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Box, Typography, Snackbar, Alert } from "@mui/material";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import EmpleadoService from "../../services/empleadoService";
import { empresaService } from "../../services/empresaService";
import type { Empleado } from "../../services/empleadoService";
import type { Empresa } from "../../types/auth";
import EmpleadosList from "./gestion-empleados/EmpleadosList";
import EmpleadoFormModal from "./gestion-empleados/EmpleadoFormModal";
import EmpleadoDetailModal from "./gestion-empleados/EmpleadoDetailModal";
import EmpleadosFilters from "./gestion-empleados/EmpleadosFilters";
import type { LayoutOutletCtx } from "../Layout";
import ConfirmDialog from "../common/ConfirmDialog";

const EmpleadosManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;

  // 👉 Trae setters/estado compartido desde el Layout (Outlet Context)
  const { setSelectedEmpleado, setEmpleadosIndex } =
    useOutletContext<LayoutOutletCtx>();

  // Estados principales
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");

  // Estados para modales
  const [openFormModal, setOpenFormModal] = useState(false);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [currentEmpleado, setCurrentEmpleado] = useState<Empleado | null>(null);

  // Estado para notificaciones
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Estado para diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    empleadoId: number | null;
  }>({
    open: false,
    empleadoId: null,
  });

  // Función para mostrar notificaciones
  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error") => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  // Funciones para cargar datos
  const fetchEmpleados = useCallback(async () => {
    // No cargar empleados hasta seleccionar una empresa
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

  // Cargar datos iniciales
  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  // Restaurar filtros si se regresa desde nominas
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

  // Modales
  const handleOpenCreateModal = () => {
    setCurrentEmpleado(null);
    setOpenFormModal(true);
  };

  const handleOpenEditModal = (empleado: Empleado) => {
    setCurrentEmpleado(empleado);
    setOpenFormModal(true);
  };

  const handleCloseFormModal = () => {
    setOpenFormModal(false);
    setCurrentEmpleado(null);
  };

  const handleOpenDetailModal = async (empleado: Empleado) => {
    try {
      const empleadoCompleto = await EmpleadoService.getById(empleado.id);
      setCurrentEmpleado(empleadoCompleto);
      setOpenDetailModal(true);
    } catch (err) {
      console.error("Error al cargar detalles del colaborador:", err);
      showSnackbar("Error al cargar los detalles del colaborador", "error");
    }
  };

  const handleCloseDetailModal = () => {
    setOpenDetailModal(false);
    setCurrentEmpleado(null);
  };

  const handleEditFromDetail = () => {
    setOpenDetailModal(false);
    setOpenFormModal(true);
  };

  // Abrir diálogo de confirmación para eliminar
  const handleDeleteEmpleado = (id: number) => {
    setConfirmDialog({
      open: true,
      empleadoId: id,
    });
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!confirmDialog.empleadoId) return;

    try {
      await EmpleadoService.delete(confirmDialog.empleadoId);
      showSnackbar("Colaborador eliminado exitosamente", "success");
      fetchEmpleados();
      setConfirmDialog({ open: false, empleadoId: null });
    } catch (err) {
      console.error("Error al eliminar empleado:", err);
      showSnackbar("Error al eliminar el colaborador", "error");
      setConfirmDialog({ open: false, empleadoId: null });
    }
  };

  // Cancelar eliminación
  const handleCancelDelete = () => {
    setConfirmDialog({ open: false, empleadoId: null });
  };

  const handleFormSuccess = (message: string) => {
    showSnackbar(message, "success");
    fetchEmpleados();
  };

  const handleFormError = (message: string) => {
    showSnackbar(message, "error");
  };

  // 👉 Navegación a Nóminas usando contexto (persiste al cambiar de ruta)
  const handleNominaClick = (empleado: Empleado) => {
    // Persistir índice y empleado seleccionado en contexto
    setEmpleadosIndex(empleadosIndexList);
    setSelectedEmpleado(empleado);
    // Navegar a nóminas manteniendo filtros (empresa y búsqueda)
    navigate("/rrhh/nominas", {
      state: {
        selectedEmpresaId,
        searchTerm,
      },
    });
  };

  const handleCloseSnackbar = (): void => {
    setSnackbar((s) => ({ ...s, open: false }));
  };

  // Filtro
  const filteredEmpleados = empleados.filter((empleado) => {
    const q = searchTerm.toLowerCase();
    return (
      empleado.nombre?.toLowerCase().includes(q) ||
      empleado.apellido?.toLowerCase().includes(q) ||
      empleado.codigo?.toLowerCase().includes(q) ||
      empleado.correoElectronico?.toLowerCase().includes(q) ||
      empleado.cargo?.toLowerCase().includes(q)
    );
  });

  // Índice de empleados ordenado alfabéticamente para navegación
  const empleadosIndexList = React.useMemo(() => {
    return filteredEmpleados
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
  }, [filteredEmpleados]);

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
      <Typography variant="h4" gutterBottom sx={{ flexShrink: 0 }}>
        Gestión de Colaboradores
      </Typography>

      {/* Filtros */}
      <Box sx={{ mb: 3, flexShrink: 0 }}>
        <EmpleadosFilters
          searchTerm={searchTerm}
          selectedEmpresaId={selectedEmpresaId}
          empresas={empresas}
          onSearchChange={setSearchTerm}
          onEmpresaChange={setSelectedEmpresaId}
          onCreateNew={handleOpenCreateModal}
        />
      </Box>

      {/* Lista con scroll interno */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <EmpleadosList
          empleados={filteredEmpleados}
          loading={loading}
          onView={handleOpenDetailModal}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteEmpleado}
          onNominaClick={handleNominaClick}
        />
      </Box>

      {/* Modal Form */}
      <EmpleadoFormModal
        open={openFormModal}
        onClose={handleCloseFormModal}
        onSuccess={handleFormSuccess}
        onError={handleFormError}
        empleado={currentEmpleado}
        empresas={empresas}
      />

      {/* Modal Detalle */}
      <EmpleadoDetailModal
        open={openDetailModal}
        onClose={handleCloseDetailModal}
        onEdit={handleEditFromDetail}
        empleado={currentEmpleado}
      />

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Confirmar eliminación"
        message="¿Está seguro que desea eliminar este colaborador?"
        confirmText="Eliminar"
        cancelText="Conservar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Snackbar */}
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

export default EmpleadosManagement;
