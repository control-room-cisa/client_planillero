import React, { useRef, useState } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Person,
} from "@mui/icons-material";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useAuth } from "../../hooks/useAuth";
import type { LoginRequest } from "../../types/auth";
import { useNavigate } from "react-router-dom";

const EMPRESA_NOMBRE =
  (import.meta.env.VITE_EMPRESA_NOMBRE as string | undefined)?.trim() || "";
const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || "";
const LOGIN_ERROR_GENERICO = "Usuario o contraseña incorrecta";

export default function Login() {
  const { login, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const suppressTurnstileErrorRef = useRef(false);
  const [formData, setFormData] = useState<
    Omit<LoginRequest, "turnstileToken">
  >({
    identificador: "",
    contrasena: "",
  });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const navigate = useNavigate();

  const resetTurnstile = () => {
    turnstileRef.current?.reset();
    setTurnstileToken("");
  };

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

    if (!formData.identificador.trim() || !formData.contrasena) {
      setError("Por favor, completa todos los campos");
      return;
    }

    if (!TURNSTILE_SITE_KEY) {
      setError("Verificación de seguridad no configurada");
      return;
    }

    if (!turnstileToken) {
      setError("Completa la verificación de seguridad");
      return;
    }

    try {
      await login({
        ...formData,
        turnstileToken,
      });
      // Redirigir a "/" y dejar que Layout maneje la ruta según el rol
      navigate("/");
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : LOGIN_ERROR_GENERICO;
      setError(message);
      suppressTurnstileErrorRef.current = true;
      resetTurnstile();
      // Evita que onError del reset pise el mensaje de login
      window.setTimeout(() => {
        suppressTurnstileErrorRef.current = false;
      }, 0);
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
            {EMPRESA_NOMBRE && (
              <Typography
                variant="h6"
                color="primary"
                fontWeight="medium"
                sx={{ mt: 0.5 }}
              >
                {EMPRESA_NOMBRE}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Inicia sesión con correo, DNI, usuario o código de empleado
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
              id="identificador"
              name="identificador"
              label="Correo, DNI, usuario o código"
              autoComplete="username"
              autoFocus
              value={formData.identificador}
              onChange={handleInputChange}
              disabled={loading}
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

            {TURNSTILE_SITE_KEY ? (
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => {
                    setTurnstileToken(token);
                  }}
                  onExpire={() => {
                    setTurnstileToken("");
                  }}
                  onError={(errorCode) => {
                    setTurnstileToken("");
                    if (!suppressTurnstileErrorRef.current) {
                      // 110200 = dominio no autorizado en Cloudflare Turnstile
                      const hint =
                        errorCode === "110200"
                          ? " Dominio no autorizado (agrega localhost en Cloudflare o usa claves de prueba)."
                          : errorCode
                            ? ` (código ${errorCode})`
                            : "";
                      setError(
                        `Error en la verificación de seguridad. Intente de nuevo.${hint}`
                      );
                    }
                  }}
                  options={{
                    theme: "light",
                    size: "normal",
                  }}
                />
              </Box>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Falta configurar VITE_TURNSTILE_SITE_KEY
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !turnstileToken}
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
          <Button
            onClick={() => setForgotPasswordOpen(false)}
            variant="contained"
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
