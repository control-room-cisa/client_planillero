import React, { useState, useEffect } from 'react';
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
  MenuItem,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  PersonAdd as RegisterIcon,
  Person,
  Business,
  Apartment as DepartmentIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import type { RegisterRequest, Empresa, Departamento } from '../types/auth';
import { empresaService } from '../services/empresaService';

interface RegisterProps {
  onRegistrationSuccess?: () => void;
  onToggleMode?: () => void;
}

export default function Register({ onRegistrationSuccess, onToggleMode }: RegisterProps) {
  const { register, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [departamentosDisponibles, setDepartamentosDisponibles] = useState<Departamento[]>([]);
  const [formData, setFormData] = useState<RegisterRequest>({
    nombre: '',
    apellido: '',
    correoElectronico: '',
    contrasena: '',
    empresaId: 0,
    departamentoId: 0,
  });

  // Cargar empresas al montar el componente
  useEffect(() => {
    const loadEmpresas = async () => {
      try {
        setLoadingEmpresas(true);
        const response = await empresaService.getEmpresas();
        if (response.success) {
          setEmpresas(response.data);
        } else {
          setError('Error al cargar las empresas');
        }
      } catch (err) {
        setError('Error al cargar las empresas: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      } finally {
        setLoadingEmpresas(false);
      }
    };

    loadEmpresas();
  }, []);

  // Actualizar departamentos cuando cambie la empresa seleccionada
  useEffect(() => {
    if (formData.empresaId > 0) {
      const empresaSeleccionada = empresas.find(emp => emp.id === formData.empresaId);
      if (empresaSeleccionada) {
        setDepartamentosDisponibles(empresaSeleccionada.departamentos);
        // Resetear departamento seleccionado cuando cambie la empresa
        setFormData(prev => ({ ...prev, departamentoId: 0 }));
      }
    } else {
      setDepartamentosDisponibles([]);
    }
  }, [formData.empresaId, empresas]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'departamentoId' ? parseInt(value) : value,
    }));
    // Limpiar mensajes cuando el usuario empiece a escribir
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones básicas
    if (!formData.nombre || !formData.apellido || !formData.correoElectronico || !formData.contrasena) {
      setError('Por favor, completa todos los campos');
      return;
    }

    if (formData.empresaId === 0) {
      setError('Por favor, selecciona una empresa');
      return;
    }

    if (formData.departamentoId === 0) {
      setError('Por favor, selecciona un departamento');
      return;
    }

    if (formData.contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await register(formData);
      setSuccess('¡Registro exitoso! Ya puedes iniciar sesión con tus credenciales.');
      // Limpiar el formulario
      setFormData({
        nombre: '',
        apellido: '',
        correoElectronico: '',
        contrasena: '',
        empresaId: 0,
        departamentoId: 0,
      });
      
      // Llamar la función de callback después de un breve delay para que el usuario vea el mensaje de éxito
      if (onRegistrationSuccess) {
        setTimeout(() => {
          onRegistrationSuccess();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar usuario');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 2,
        }}
      >
        <Paper
          elevation={6}
          sx={{
            padding: 4,
            width: '100%',
            maxWidth: 500,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <RegisterIcon
              sx={{
                fontSize: 48,
                color: 'primary.main',
                mb: 2,
              }}
            />
            <Typography component="h1" variant="h4" fontWeight="bold">
              Registro de Empleado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Crea una nueva cuenta
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            {loadingEmpresas && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Cargando empresas...
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                required
                fullWidth
                id="nombre"
                name="nombre"
                label="Nombre"
                autoComplete="given-name"
                value={formData.nombre}
                onChange={handleInputChange}
                disabled={loading || loadingEmpresas}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                required
                fullWidth
                id="apellido"
                name="apellido"
                label="Apellido"
                autoComplete="family-name"
                value={formData.apellido}
                onChange={handleInputChange}
                disabled={loading || loadingEmpresas}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TextField
              margin="normal"
              required
              fullWidth
              id="correoElectronico"
              name="correoElectronico"
              label="Correo Electrónico"
              type="email"
              autoComplete="email"
              value={formData.correoElectronico}
              onChange={handleInputChange}
              disabled={loading || loadingEmpresas}
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.contrasena}
              onChange={handleInputChange}
              disabled={loading || loadingEmpresas}
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
                      onClick={togglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              select
              id="empresaId"
              name="empresaId"
              label="Empresa"
              value={formData.empresaId}
              onChange={handleInputChange}
              disabled={loading || loadingEmpresas}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Business color="action" />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value={0}>Selecciona una empresa</MenuItem>
              {empresas.map(empresa => (
                <MenuItem key={empresa.id} value={empresa.id}>{empresa.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              margin="normal"
              required
              fullWidth
              select
              id="departamentoId"
              name="departamentoId"
              label="Departamento"
              value={formData.departamentoId}
              onChange={handleInputChange}
              disabled={loading || loadingEmpresas || formData.empresaId === 0}
              helperText={formData.empresaId === 0 ? "Primero selecciona una empresa" : departamentosDisponibles.length === 0 ? "No hay departamentos disponibles" : ""}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DepartmentIcon color="action" />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value={0}>Selecciona un departamento</MenuItem>
              {departamentosDisponibles.map(departamento => (
                <MenuItem key={departamento.id} value={departamento.id}>{departamento.nombre}</MenuItem>
              ))}
            </TextField>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'Registrando...' : 'Registrar Empleado'}
            </Button>

            {onToggleMode && (
              <>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    o
                  </Typography>
                </Divider>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    ¿Ya tienes cuenta?
                  </Typography>
                  <Button
                    onClick={onToggleMode}
                    variant="outlined"
                    fullWidth
                    sx={{ textTransform: 'none' }}
                  >
                    Iniciar sesión
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 