import { useEffect, useState } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  Grid,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import AttachEmailIcon from "@mui/icons-material/AttachEmail";
import LockIcon from "@mui/icons-material/Lock";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import { useNavigate } from "react-router-dom";
import SaveIcon from "@mui/icons-material/Save";
import LibraryAddCheckIcon from "@mui/icons-material/LibraryAddCheck";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

const UserRegister = () => {
  const [formData, setFormData] = useState({
    empresa_id: "",
    nombre: "",
    apellido: "",
    correo_electronico: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ message: "", severity: "" });
  const [customer, setCustomer] = useState([]);
  const [diasLaborales, setDiasLaborales] = useState([]);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    customers();
  }, []);

  const customers = async () => {
    try {
      const result = await axios.get(`${API}/customers`);
      setCustomer(result.data);
    } catch (error) {
      console.error("Error al obtener las empresas:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ message: "", severity: "" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let key in formData) {
      if (!formData[key]) {
        setAlert({
          message: "Todos los campos son obligatorios",
          severity: "error",
        });
        setLoading(false);
        return;
      }
    }

    if (!emailRegex.test(formData.correo_electronico)) {
      setAlert({
        message: "El correo electrónico no es válido",
        severity: "error",
      });
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setAlert({ message: "Las contraseñas no coinciden", severity: "error" });
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.post(`${API}/auth/register`, {
        empresa_id: formData.empresa_id,
        nombre: formData.nombre,
        apellido: formData.apellido,
        correo_electronico: formData.correo_electronico,
        password: formData.password,
        diasLaborales, // <-- enviar los días seleccionados
      });

      setAlert({ message: "Registro exitoso!", severity: "success" });

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      console.error(err.response?.data?.error || err.message);
      setAlert({
        message: err.response?.data?.error || "Error al registrar",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDiaChange = (e) => {
    const { value } = e.target;
    setDiasLaborales((prev) =>
      prev.includes(value)
        ? prev.filter((dia) => dia !== value)
        : [...prev, value]
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        px: 2,
      }}
    >
      <Container maxWidth={false}>
        <Box sx={{ maxWidth: 700, mx: "auto", width: "100%" }}>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
            <Box sx={{ textAlign: "center", mb: 5 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "#1976d2" }}
              >
                Registro de usuario
              </Typography>
            </Box>

            {alert.message && (
              <Alert severity={alert.severity} sx={{ mb: 3 }}>
                {alert.message}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                container
                rowSpacing={5}
                columnSpacing={{ xs: 1, sm: 2, md: 3 }}
              >
                <Grid item xs={6} sx={{ width: 270 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonIcon />
                    <TextField
                      label="Nombre"
                      name="nombre"
                      fullWidth
                      value={formData.nombre}
                      onChange={handleChange}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6} sx={{ width: 270 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonIcon />
                    <TextField
                      label="Apellido"
                      name="apellido"
                      fullWidth
                      value={formData.apellido}
                      onChange={handleChange}
                    />
                  </Box>
                </Grid>

                <Grid item xs={6} sx={{ width: 270 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AttachEmailIcon />
                    <TextField
                      label="Correo electrónico"
                      name="correo_electronico"
                      type="email"
                      fullWidth
                      value={formData.correo_electronico}
                      onChange={handleChange}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6} sx={{ width: 270 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LockIcon />
                    <TextField
                      label="Contraseña"
                      name="password"
                      type="password"
                      fullWidth
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6} sx={{ width: 270 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LockIcon />
                    <TextField
                      label="Confirmar contraseña"
                      name="confirmPassword"
                      type="password"
                      fullWidth
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6} sx={{ width: 270 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationCityIcon />
                    <FormControl sx={{ width: 270 }}>
                      <InputLabel>Seleccione la empresa</InputLabel>
                      <Select
                        name="empresa_id"
                        value={formData.empresa_id}
                        label="Seleccione la empresa"
                        onChange={handleChange}
                      >
                        {customer.map((empresa) => (
                          <MenuItem key={empresa.id} value={empresa.id}>
                            {empresa.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>

                <Grid item xs={12} sx={{ width: 550 }}>
                  <Paper sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <LibraryAddCheckIcon />
                      <Typography fontWeight="bold" variant="subtitle1">
                        Marque los días en los que labora
                      </Typography>
                    </Box>
                    <FormControl component="fieldset">
                      <Grid container spacing={1}>
                        {[
                          "Lunes",
                          "Martes",
                          "Miércoles",
                          "Jueves",
                          "Viernes",
                          "Sábado",
                          "Domingo",
                        ].map((dia) => (
                          <Grid item key={dia}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={diasLaborales.includes(dia)}
                                  onChange={handleDiaChange}
                                  value={dia}
                                />
                              }
                              label={dia}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </FormControl>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      alignItems="center"
                      disabled={loading}
                      startIcon={<SaveIcon />}
                      sx={{
                        width: "200px",
                        background:
                          "linear-gradient(to right,rgb(48, 165, 136),rgb(97, 214, 185))",
                        color: "#000000",
                        textTransform: "none",
                        fontWeight: "bold",
                        borderRadius: 2,
                      }}
                    >
                      {loading ? "Registrando..." : "Crear Cuenta"}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography textAlign="center">
              ¿Ya tienes cuenta?{" "}
              <Button
                variant="text"
                onClick={() => navigate("/login")}
                sx={{ fontWeight: "bold" }}
              >
                Iniciar Sesión
              </Button>
            </Typography>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default UserRegister;
