import * as React from "react";
import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  Divider,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import type { Empleado } from "../../services/empleadoService";
import ColaboradoresList from "./gestion-supervisor/ColaboradoresList";
import type { LayoutOutletCtx } from "../Layout";
import { useEmployees } from "../employeeByDepartament";

const SupervisorManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;

  const { setSelectedEmpleado, setEmpleadosIndex } =
    useOutletContext<LayoutOutletCtx>();

  const { employees, loading } = useEmployees();
  const [searchTerm, setSearchTerm] = useState("");

  // Restaurar búsqueda si se regresa desde detalle
  React.useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  // Navegación a detalle de actividades
  const handleDetalleClick = (empleado: Empleado) => {
    setEmpleadosIndex(empleadosIndexList);
    setSelectedEmpleado(empleado);
    navigate("/supervision/planillas/detalle", {
      state: {
        searchTerm,
      },
    });
  };

  // Filtro
  const filteredEmpleados = employees.filter((empleado) => {
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
      <Typography
        variant="h5"
        component="h1"
        sx={{ fontWeight: "bold", minWidth: 0 }}
      >
        Revisión de Actividades Diarias
      </Typography>
      <Divider sx={{ mb: 3 }} />
      {/* Barra de búsqueda fuera del scroll */}
      <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
        <TextField
          label="Buscar colaboradores"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Lista (scroll interno en el componente de tabla) */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <ColaboradoresList
          empleados={filteredEmpleados}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onDetalleClick={handleDetalleClick}
          showSearch={false}
        />
      </Box>
    </Box>
  );
};

export default SupervisorManagement;
