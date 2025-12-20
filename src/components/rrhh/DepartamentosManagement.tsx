import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import departamentoService, {
  type Departamento,
  type CreateDepartamentoDto,
  type UpdateDepartamentoDto,
} from "../../services/departamentoService";
import { empresaService } from "../../services/empresaService";
import type { Empresa } from "../../types/auth";

const DepartamentosManagement: React.FC = () => {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(
    null
  );

  // Estados para modales
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [currentDepartamento, setCurrentDepartamento] = useState<Departamento | null>(null);
  const [formData, setFormData] = useState<CreateDepartamentoDto | UpdateDepartamentoDto>({
    nombre: "",
    codigo: "",
  });

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

  // Función para mostrar notificaciones
  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error") => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  // Cargar empresas (solo consorcios)
  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const response = await empresaService.getEmpresas();
        if (response.success) {
          // Filtrar solo empresas con esConsorcio === true
          const empresasConsorcio = response.data.filter(
            (empresa) => empresa.esConsorcio === true
          );
          setEmpresas(empresasConsorcio);
        }
      } catch (err) {
        console.error("Error al cargar empresas:", err);
        showSnackbar("Error al cargar las empresas", "error");
      }
    };
    fetchEmpresas();
  }, [showSnackbar]);

  // Cargar departamentos cuando se selecciona una empresa
  const fetchDepartamentos = useCallback(async () => {
    if (!selectedEmpresaId) {
      setDepartamentos([]);
      return;
    }

    setLoading(true);
    try {
      const data = await departamentoService.list(selectedEmpresaId);
      setDepartamentos(data);
    } catch (err) {
      console.error("Error al cargar departamentos:", err);
      showSnackbar("Error al cargar los departamentos", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedEmpresaId, showSnackbar]);

  useEffect(() => {
    fetchDepartamentos();
  }, [fetchDepartamentos]);

  // Abrir modal de creación
  const handleOpenCreateModal = () => {
    if (!selectedEmpresaId) {
      showSnackbar("Debe seleccionar una empresa primero", "error");
      return;
    }
    setCurrentDepartamento(null);
    setFormData({
      nombre: "",
      codigo: "",
    });
    setOpenCreateModal(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (departamento: Departamento) => {
    setCurrentDepartamento(departamento);
    setFormData({
      nombre: departamento.nombre || "",
      codigo: departamento.codigo || "",
    });
    setOpenEditModal(true);
  };

  // Cerrar modales
  const handleCloseCreateModal = () => {
    setOpenCreateModal(false);
    setCurrentDepartamento(null);
    setFormData({
      nombre: "",
      codigo: "",
    });
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setCurrentDepartamento(null);
    setFormData({
      nombre: "",
      codigo: "",
    });
  };

  // Guardar creación
  const handleSaveCreate = async () => {
    if (!selectedEmpresaId) {
      showSnackbar("Debe seleccionar una empresa", "error");
      return;
    }

    if (!formData.nombre || !formData.nombre.trim()) {
      showSnackbar("El nombre es obligatorio", "error");
      return;
    }

    try {
      await departamentoService.create({
        empresaId: selectedEmpresaId,
        nombre: formData.nombre,
        codigo: formData.codigo || undefined,
      });
      showSnackbar("Departamento creado exitosamente", "success");
      handleCloseCreateModal();
      fetchDepartamentos();
    } catch (err: any) {
      console.error("Error al crear departamento:", err);
      const errorMessage =
        err?.message || "Error al crear el departamento";
      showSnackbar(errorMessage, "error");
    }
  };

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!currentDepartamento) return;

    if (!formData.nombre || !formData.nombre.trim()) {
      showSnackbar("El nombre es obligatorio", "error");
      return;
    }

    try {
      await departamentoService.update(currentDepartamento.id, {
        nombre: formData.nombre,
        codigo: formData.codigo || undefined,
      });
      showSnackbar("Departamento actualizado exitosamente", "success");
      handleCloseEditModal();
      fetchDepartamentos();
    } catch (err: any) {
      console.error("Error al actualizar departamento:", err);
      const errorMessage =
        err?.message || "Error al actualizar el departamento";
      showSnackbar(errorMessage, "error");
    }
  };

  // Eliminar departamento
  const handleDelete = async (departamento: Departamento) => {
    if (
      !window.confirm(
        `¿Está seguro que desea eliminar el departamento "${departamento.nombre || "sin nombre"}"?`
      )
    ) {
      return;
    }

    try {
      await departamentoService.delete(departamento.id);
      showSnackbar("Departamento eliminado exitosamente", "success");
      fetchDepartamentos();
    } catch (err: any) {
      console.error("Error al eliminar departamento:", err);
      const errorMessage =
        err?.message || "Error al eliminar el departamento";
      showSnackbar(errorMessage, "error");
    }
  };

  const handleCloseSnackbar = () => {
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
      <Typography variant="h4" gutterBottom sx={{ flexShrink: 0 }}>
        Gestión de Departamentos
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3, flexShrink: 0 }}>
        <Box
          sx={{ 
            display: "flex", 
            gap: 2, 
            flexWrap: "wrap", 
            alignItems: "flex-end",
            justifyContent: "space-between"
          }}
        >
          <Autocomplete
            options={empresas}
            getOptionLabel={(opt) => opt.nombre || ""}
            value={empresas.find((e) => e.id === selectedEmpresaId) || null}
            onChange={(_, value) => {
              setSelectedEmpresaId(value?.id || null);
            }}
            sx={{ minWidth: 300 }}
            renderInput={(params) => (
              <TextField {...params} label="Empresa" size="small" required />
            )}
          />

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateModal}
            disabled={!selectedEmpresaId}
          >
            Crear Departamento
          </Button>
        </Box>
      </Paper>

      {/* Tabla */}
      <TableContainer
        component={Paper}
        sx={{ flex: 1, minHeight: 0, overflowX: "auto" }}
      >
        {!selectedEmpresaId ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 4,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Seleccione una empresa para ver los departamentos
            </Typography>
          </Box>
        ) : loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 200 }}>Nombre</TableCell>
                <TableCell>Código</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No hay departamentos registrados
                  </TableCell>
                </TableRow>
              ) : (
                departamentos.map((departamento) => (
                  <TableRow key={departamento.id} hover>
                    <TableCell>{departamento.nombre || "-"}</TableCell>
                    <TableCell>{departamento.codigo || "-"}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditModal(departamento)}
                        color="primary"
                        title="Editar"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(departamento)}
                        color="error"
                        title="Eliminar"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Modal de creación */}
      <Dialog
        open={openCreateModal}
        onClose={handleCloseCreateModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Crear Departamento</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Nombre *"
              value={formData.nombre || ""}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Código"
              value={formData.codigo || ""}
              onChange={(e) =>
                setFormData({ ...formData, codigo: e.target.value })
              }
              fullWidth
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateModal}>Cancelar</Button>
          <Button onClick={handleSaveCreate} variant="contained">
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de edición */}
      <Dialog
        open={openEditModal}
        onClose={handleCloseEditModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar Departamento</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Nombre *"
              value={formData.nombre || ""}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Código"
              value={formData.codigo || ""}
              onChange={(e) =>
                setFormData({ ...formData, codigo: e.target.value })
              }
              fullWidth
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

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

export default DepartamentosManagement;

