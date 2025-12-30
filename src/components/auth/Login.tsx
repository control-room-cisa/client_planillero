import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  InputAdornment,
  IconButton,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import type { LoginRequest } from "../../types/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState<LoginRequest>({
    correoElectronico: "",
    contrasena: "",
  });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const navigate = useNavigate();

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

    if (!formData.correoElectronico || !formData.contrasena) {
      setError("Por favor, completa todos los campos");
      return;
    }

    try {
      await login(formData);
      // Redirigir a "/" y dejar que Layout maneje la ruta según el rol
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 2,
        }}
      >
        <Paper
          elevation={6}
          sx={{
            padding: 4,
            width: "100%",
            maxWidth: 400,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 3,
            }}
          >
            <LoginIcon
              sx={{
                fontSize: 48,
                color: "primary.main",
                mb: 2,
              }}
            />
            <Typography component="h1" variant="h4" fontWeight="bold">
              Planillero
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Inicia sesión en tu cuenta
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="correoElectronico"
              name="correoElectronico"
              label="Correo Electrónico"
              autoComplete="email"
              autoFocus
              value={formData.correoElectronico}
              onChange={handleInputChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="contrasena"
              name="contrasena"
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={formData.contrasena}
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
                      onClick={togglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontSize: "1.1rem",
                fontWeight: "bold",
              }}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button
                onClick={() => setForgotPasswordOpen(true)}
                variant="text"
                sx={{ textTransform: "none" }}
                disabled={loading}
              >
                Olvidé mi contraseña
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>

      <Dialog
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Olvidé mi contraseña
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Ponerse en contacto con el departamento de recursos humanos para
            reestablecer su contraseña.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setForgotPasswordOpen(false)} variant="contained">
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
