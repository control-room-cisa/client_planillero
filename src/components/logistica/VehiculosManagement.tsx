import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
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
  TablePagination,
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
  InputAdornment,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VehiculoService, {
  type Vehiculo,
  type CreateVehiculoDto,
  type UpdateVehiculoDto,
} from "../../services/vehiculoService";
import ConfirmDialog from "../common/ConfirmDialog";

const ROWS_PER_PAGE = 15;

const VehiculosManagement: React.FC = () => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);

  const [openEditModal, setOpenEditModal] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [currentVehiculo, setCurrentVehiculo] = useState<Vehiculo | null>(null);
  const [formData, setFormData] = useState<
    CreateVehiculoDto | UpdateVehiculoDto
  >({
    class: undefined,
    nombre: "",
    tipo: "",
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    vehiculo: Vehiculo | null;
  }>({
    open: false,
    vehiculo: null,
  });

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

  const fetchVehiculos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await VehiculoService.getAll();
      setVehiculos(data);
    } catch (err) {
      console.error("Error al cargar vehiculos:", err);
      showSnackbar("Error al cargar los vehículos", "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchVehiculos();
  }, [fetchVehiculos]);

  const filteredVehiculos = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return vehiculos;
    return vehiculos.filter((vehiculo) => {
      return (
        String(vehiculo.class).includes(q) ||
        vehiculo.nombre?.toLowerCase().includes(q) ||
        vehiculo.tipo?.toLowerCase().includes(q)
      );
    });
  }, [vehiculos, searchTerm]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil(filteredVehiculos.length / ROWS_PER_PAGE) - 1
    );
    if (page > maxPage) setPage(maxPage);
  }, [filteredVehiculos.length, page]);

  const paginatedVehiculos = useMemo(() => {
    const start = page * ROWS_PER_PAGE;
    return filteredVehiculos.slice(start, start + ROWS_PER_PAGE);
  }, [filteredVehiculos, page]);

  const existeOtroVehiculoConClass = (
    classValue: number,
    excludeId?: number | null
  ) =>
    vehiculos.some(
      (v) => v.class === classValue && (excludeId == null || v.id !== excludeId)
    );

  const resetForm = () => {
    setFormData({
      class: undefined,
      nombre: "",
      tipo: "",
    });
    setCurrentVehiculo(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setOpenCreateModal(true);
  };

  const handleOpenEditModal = (vehiculo: Vehiculo) => {
    setCurrentVehiculo(vehiculo);
    setFormData({
      class: vehiculo.class,
      nombre: vehiculo.nombre || "",
      tipo: vehiculo.tipo || "",
    });
    setOpenEditModal(true);
  };

  const handleCloseCreateModal = () => {
    setOpenCreateModal(false);
    resetForm();
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    resetForm();
  };

  const validateForm = (excludeId?: number | null): string | null => {
    if (formData.class === undefined || formData.class === null) {
      return "El class es obligatorio";
    }
    const classValue = Number(formData.class);
    if (!Number.isFinite(classValue) || classValue <= 0) {
      return "El class debe ser un número positivo";
    }
    if (existeOtroVehiculoConClass(classValue, excludeId)) {
      return "Ya existe un vehículo con ese class. No se permiten duplicados.";
    }
    if (!formData.nombre || !formData.nombre.trim()) {
      return "El nombre es obligatorio";
    }
    return null;
  };

  const handleSaveCreate = async () => {
    const validationError = validateForm();
    if (validationError) {
      showSnackbar(validationError, "error");
      return;
    }

    try {
      await VehiculoService.create({
        class: Number(formData.class),
        nombre: formData.nombre!.trim(),
        tipo: formData.tipo?.trim() || null,
      });
      showSnackbar("Vehículo creado exitosamente", "success");
      handleCloseCreateModal();
      fetchVehiculos();
    } catch (err: any) {
      console.error("Error al crear vehiculo:", err);
      showSnackbar(err?.message || "Error al crear el vehículo", "error");
    }
  };

  const handleSaveEdit = async () => {
    if (!currentVehiculo) return;

    const validationError = validateForm(currentVehiculo.id);
    if (validationError) {
      showSnackbar(validationError, "error");
      return;
    }

    try {
      await VehiculoService.update(currentVehiculo.id, {
        class: Number(formData.class),
        nombre: formData.nombre!.trim(),
        tipo: formData.tipo?.trim() || null,
      });
      showSnackbar("Vehículo actualizado exitosamente", "success");
      handleCloseEditModal();
      fetchVehiculos();
    } catch (err: any) {
      console.error("Error al actualizar vehiculo:", err);
      showSnackbar(err?.message || "Error al actualizar el vehículo", "error");
    }
  };

  const handleDelete = (vehiculo: Vehiculo) => {
    setConfirmDialog({
      open: true,
      vehiculo,
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDialog.vehiculo) return;

    try {
      await VehiculoService.delete(confirmDialog.vehiculo.id);
      showSnackbar("Vehículo eliminado exitosamente", "success");
      fetchVehiculos();
      setConfirmDialog({ open: false, vehiculo: null });
    } catch (err: any) {
      console.error("Error al eliminar vehiculo:", err);
      showSnackbar(err?.message || "Error al eliminar el vehículo", "error");
      setConfirmDialog({ open: false, vehiculo: null });
    }
  };

  const handleCancelDelete = () => {
    setConfirmDialog({ open: false, vehiculo: null });
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
        Gestión de Vehículos
      </Typography>

      <Box sx={{ display: "flex", mb: 3, gap: 2, flexShrink: 0 }}>
        <TextField
          label="Buscar por class, nombre o tipo"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "action.active" }} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
        >
          Crear Vehículo
        </Button>
      </Box>

      <TableContainer
        component={Paper}
        sx={{ flex: 1, minHeight: 0, overflowX: "auto" }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 100 }}>Class</TableCell>
              <TableCell sx={{ minWidth: 280 }}>Nombre</TableCell>
              <TableCell sx={{ minWidth: 120 }}>Tipo</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : filteredVehiculos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  {searchTerm.trim()
                    ? "No se encontraron vehículos con ese criterio"
                    : "No hay vehículos registrados"}
                </TableCell>
              </TableRow>
            ) : (
              paginatedVehiculos.map((vehiculo) => (
                <TableRow key={vehiculo.id} hover>
                  <TableCell>{vehiculo.class}</TableCell>
                  <TableCell>{vehiculo.nombre || "-"}</TableCell>
                  <TableCell>{vehiculo.tipo || "-"}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEditModal(vehiculo)}
                      color="primary"
                      title="Editar"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(vehiculo)}
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
        <TablePagination
          component="div"
          count={filteredVehiculos.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} de ${count !== -1 ? count : to}`
          }
        />
      </TableContainer>

      <Dialog
        open={openCreateModal}
        onClose={handleCloseCreateModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Crear Vehículo</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Class *"
              type="number"
              value={formData.class ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  class:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              fullWidth
              size="small"
              required
              inputProps={{ min: 1 }}
              helperText="Debe ser único; no puede repetirse entre vehículos"
            />
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
              label="Tipo"
              value={formData.tipo || ""}
              onChange={(e) =>
                setFormData({ ...formData, tipo: e.target.value })
              }
              fullWidth
              size="small"
              inputProps={{ maxLength: 20 }}
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

      <Dialog
        open={openEditModal}
        onClose={handleCloseEditModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar Vehículo</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Class *"
              type="number"
              value={formData.class ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  class:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              fullWidth
              size="small"
              required
              inputProps={{ min: 1 }}
              helperText="Debe ser único; no puede repetirse entre vehículos"
            />
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
              label="Tipo"
              value={formData.tipo || ""}
              onChange={(e) =>
                setFormData({ ...formData, tipo: e.target.value })
              }
              fullWidth
              size="small"
              inputProps={{ maxLength: 20 }}
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

      <ConfirmDialog
        open={confirmDialog.open}
        title="Confirmar eliminación"
        message={`¿Está seguro que desea eliminar el vehículo "${
          confirmDialog.vehiculo?.nombre || "sin nombre"
        }" (class ${confirmDialog.vehiculo?.class ?? "-"})?`}
        confirmText="Eliminar"
        cancelText="Conservar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

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

export default VehiculosManagement;
