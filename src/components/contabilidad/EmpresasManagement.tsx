import React, { useState, useEffect, useCallback } from "react";
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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { empresaService } from "../../services/empresaService";
import type { Empresa } from "../../types/auth";

interface EmpresaFormData {
  nombre: string;
  codigo: string;
}

const EmpresasManagement: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [formData, setFormData] = useState<EmpresaFormData>({
    nombre: "",
    codigo: "",
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await empresaService.getEmpresas();
      if (response.success) {
        setEmpresas(response.data);
      }
    } catch (error) {
      console.error("Error al cargar empresas:", error);
      showSnackbar("Error al cargar las empresas", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleOpenCreate = () => {
    setEditingEmpresa(null);
    setFormData({ nombre: "", codigo: "" });
    setOpenDialog(true);
  };

  const handleOpenEdit = (empresa: Empresa) => {
    // Solo permitir editar empresas con esConsorcio=false
    if (empresa.esConsorcio === true) {
      showSnackbar("No se puede editar esta empresa", "error");
      return;
    }
    setEditingEmpresa(empresa);
    setFormData({
      nombre: empresa.nombre || "",
      codigo: empresa.codigo || "",
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEmpresa(null);
    setFormData({ nombre: "", codigo: "" });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim() || !formData.codigo.trim()) {
      showSnackbar("Todos los campos son obligatorios", "error");
      return;
    }

    try {
      if (editingEmpresa) {
        // Actualizar empresa existente
        await empresaService.updateEmpresa(editingEmpresa.id, {
          nombre: formData.nombre.trim(),
          codigo: formData.codigo.trim(),
        });
        showSnackbar("Empresa actualizada exitosamente", "success");
      } else {
        // Crear nueva empresa (visible=false por defecto)
        await empresaService.createEmpresa({
          nombre: formData.nombre.trim(),
          codigo: formData.codigo.trim(),
          esConsorcio: false, // Por defecto esConsorcio=false
        });
        showSnackbar("Empresa creada exitosamente", "success");
      }
      handleCloseDialog();
      fetchEmpresas();
    } catch (error) {
      console.error("Error al guardar empresa:", error);
      showSnackbar(
        editingEmpresa
          ? "Error al actualizar la empresa"
          : "Error al crear la empresa",
        "error"
      );
    }
  };

  const handleDelete = async (empresa: Empresa) => {
    // Solo permitir eliminar empresas con esConsorcio=false
    if (empresa.esConsorcio === true) {
      showSnackbar("No se puede eliminar esta empresa", "error");
      return;
    }

    if (
      window.confirm(
        `¿Está seguro que desea eliminar la empresa "${empresa.nombre}"?`
      )
    ) {
      try {
        await empresaService.deleteEmpresa(empresa.id);
        showSnackbar("Empresa eliminada exitosamente", "success");
        fetchEmpresas();
      } catch (error) {
        console.error("Error al eliminar empresa:", error);
        showSnackbar("Error al eliminar la empresa", "error");
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h2">
          Gestión de Empresas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
        >
          Crear Empresa
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Código</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : empresas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No hay empresas registradas
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                empresas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <BusinessIcon sx={{ mr: 1, color: "action.active" }} />
                        {empresa.nombre}
                      </Box>
                    </TableCell>
                    <TableCell>{empresa.codigo}</TableCell>
                    <TableCell>
                      <Chip
                        label={empresa.esConsorcio ? "Consorcio" : "Normal"}
                        color={empresa.esConsorcio ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => handleOpenEdit(empresa)}
                        disabled={empresa.esConsorcio === true}
                        title={
                          empresa.esConsorcio === true
                            ? "No se puede editar esta empresa"
                            : "Editar empresa"
                        }
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(empresa)}
                        disabled={empresa.esConsorcio === true}
                        title={
                          empresa.esConsorcio === true
                            ? "No se puede eliminar esta empresa"
                            : "Eliminar empresa"
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog para crear/editar empresa */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingEmpresa ? "Editar Empresa" : "Crear Nueva Empresa"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Nombre de la Empresa"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Código"
              name="codigo"
              value={formData.codigo}
              onChange={handleInputChange}
              fullWidth
              required
            />
            {!editingEmpresa && (
              <Typography variant="body2" color="text.secondary">
                La nueva empresa se creará como "Normal" por defecto.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEmpresa ? "Actualizar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
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

export default EmpresasManagement;
