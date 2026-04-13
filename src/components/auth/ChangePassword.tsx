import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Person,
  Lock,
  Visibility,
  VisibilityOff,
  LockReset as LockResetIcon,
} from "@mui/icons-material";
import { authService } from "../../services/authService";
import type { ChangePasswordRequest } from "../../types/auth";

interface ChangePasswordProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  userIdentifier?: string; // Email o DNI del usuario autenticado
}

export default function ChangePassword({
  open,
  onClose,
  onSuccess,
  onError,
  userIdentifier,
}: ChangePasswordProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ChangePasswordRequest>({
    usuario: "",
    correoElectronico: "",
    dni: "",
    contrasenaActual: "",
    nuevaContrasena: "",
  });

  // Pre-llenar el identificador del usuario si se proporciona
  React.useEffect(() => {
    if (open) {
      if (userIdentifier) {
        setFormData((prev) => ({
          ...prev,
          usuario: userIdentifier,
          correoElectronico: userIdentifier,
          dni: userIdentifier,
          contrasenaActual: "",
          nuevaContrasena: "",
        }));
      } else {
        // Si no hay userIdentifier, limpiar todo
        setFormData({
          usuario: "",
          correoElectronico: "",
          dni: "",
          contrasenaActual: "",
          nuevaContrasena: "",
        });
      }
      setError("");
    }
  }, [userIdentifier, open]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    // Validar que se proporcione al menos un identificador
    if (!formData.usuario && !formData.correoElectronico && !formData.dni) {
      setError("Debe proporcionar un usuario, correo electrónico o DNI");
      return;
    }

    if (!formData.contrasenaActual) {
      setError("Debe proporcionar la contraseña actual");
      return;
    }

    if (!formData.nuevaContrasena) {
      setError("Debe proporcionar la nueva contraseña");
      return;
    }

    if (formData.nuevaContrasena.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (formData.contrasenaActual === formData.nuevaContrasena) {
      setError("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(formData);
      const successMessage = "Contraseña actualizada exitosamente";
      setError("");
      if (onSuccess) {
        onSuccess(successMessage);
      }
      // Limpiar solo las contraseñas, mantener el identificador
      if (userIdentifier) {
        setFormData({
          usuario: userIdentifier,
          correoElectronico: userIdentifier,
          dni: userIdentifier,
          contrasenaActual: "",
          nuevaContrasena: "",
        });
      } else {
        setFormData({
          usuario: "",
          correoElectronico: "",
          dni: "",
          contrasenaActual: "",
          nuevaContrasena: "",
        });
      }
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cambiar la contraseña";
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Limpiar solo las contraseñas, mantener el identificador si existe
      if (userIdentifier) {
        setFormData({
          usuario: userIdentifier,
          correoElectronico: userIdentifier,
          dni: userIdentifier,
          contrasenaActual: "",
          nuevaContrasena: "",
        });
      } else {
        setFormData({
          usuario: "",
          correoElectronico: "",
          dni: "",
          contrasenaActual: "",
          nuevaContrasena: "",
        });
      }
      setError("");
      onClose();
    }
  };

  const togglePasswordVisibility = (field: "current" | "new") => {
    if (field === "current") {
      setShowCurrentPassword(!showCurrentPassword);
    } else {
      setShowNewPassword(!showNewPassword);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        // Solo permitir cerrar con el botón Cancelar, no con clic fuera o ESC
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          return;
        }
        handleClose();
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 1,
          }}
        >
          <LockResetIcon
            sx={{
              fontSize: 48,
              color: "primary.main",
              mb: 2,
            }}
          />
          <Typography component="h2" variant="h5" fontWeight="bold">
            Cambiar Contraseña
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            fullWidth
            id="identificador"
            name="usuario"
            label="Usuario, Correo o DNI"
            placeholder="Ingrese usuario, correo electrónico o DNI"
            autoFocus={!userIdentifier}
            value={
              formData.usuario || formData.correoElectronico || formData.dni
            }
            onChange={(e) => {
              const value = e.target.value;
              setFormData((prev) => ({
                ...prev,
                usuario: value,
                correoElectronico: value,
                dni: value,
              }));
            }}
            disabled={loading || !!userIdentifier}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="contrasenaActual"
            name="contrasenaActual"
            label="Contraseña Actual"
            type={showCurrentPassword ? "text" : "password"}
            value={formData.contrasenaActual}
            onChange={handleInputChange}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => togglePasswordVisibility("current")}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="nuevaContrasena"
            name="nuevaContrasena"
            label="Nueva Contraseña"
            type={showNewPassword ? "text" : "password"}
            value={formData.nuevaContrasena}
            onChange={handleInputChange}
            disabled={loading}
            helperText="Mínimo 6 caracteres"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => togglePasswordVisibility("new")}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{
            py: 1.5,
            px: 3,
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          {loading ? "Cambiando..." : "Cambiar Contraseña"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
