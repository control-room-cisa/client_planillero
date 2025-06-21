import { useEffect, useState } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Checkbox,
  FormControlLabel,
  Divider,
  Stack,
  Alert,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, InputAdornment } from "@mui/material";
import axios from "axios";
import AttachEmailIcon from "@mui/icons-material/AttachEmail";
import LockIcon from "@mui/icons-material/Lock";
import SaveIcon from '@mui/icons-material/Save';
import { useUser } from "../../context/UserContext";

const API = process.env.REACT_APP_API_URL;

const UserLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [alert, setAlert] = useState({ message: "", severity: "" });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUser();

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ message: "", severity: "" });

    try {
      const { data } = await axios.post(`${API}/auth/login`,
        {
          correo_electronico:
            email, password
        }
      );

      setUser(data.user);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      setAlert({ message: "Login exitoso", severity: "success" });

      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 1500);
    } catch (err) {
      console.error(err);
      setAlert({ message: "Credenciales inválidas", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: "100%", borderRadius: 3 }}>

          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", color: "#1976d2" }}
            >
              Iniciar sesión
            </Typography>
          </Box>

          {alert.message && (
            <Box sx={{ mb: 2 }}>
              <Alert severity={alert.severity}>{alert.message}</Alert>
            </Box>
          )}

          <Box component="form" onSubmit={handleLogin} noValidate>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AttachEmailIcon />
                <TextField
                  label="Correo electrónico"
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LockIcon />
                <TextField
                  label="Contraseña"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                }
                label="Recordarme"
                sx={{ alignSelf: "start" }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                startIcon={<SaveIcon />}
                sx={{
                  background:
                    "linear-gradient(to right,rgb(48, 165, 136),rgb(97, 214, 185))",
                  color: "#000000",
                  textTransform: "none",
                  fontWeight: "bold",
                  borderRadius: 2,
                  mt: 1,
                }}
              >
                {loading ? "Ingresando..." : "Login"}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ mt: 2, mb: 2, textAlign: "center" }}>
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: "pointer" }}
            >
              ¿Ha olvidado su contraseña?
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Typography variant="body2">
              ¿No tiene cuenta?{" "}
              <Typography
                component={Link}
                to="/register"
                color="primary"
                sx={{
                  fontWeight: "bold",
                  cursor: "pointer",
                  textDecoration: "none",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Registrarte
              </Typography>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default UserLogin;
