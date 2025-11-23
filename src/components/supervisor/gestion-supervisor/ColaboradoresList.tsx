import * as React from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Typography,
  Avatar,
  Box,
  TextField,
  InputAdornment,
  Tooltip,
  Chip,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import type { Empleado } from "../../../services/empleadoService";
import { getImageUrl } from "../../../utils/imageUtils";

interface ColaboradoresListProps {
  empleados: Empleado[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDetalleClick: (empleado: Empleado) => void;
  showSearch?: boolean;
}

const ColaboradoresList: React.FC<ColaboradoresListProps> = ({
  empleados,
  loading,
  searchTerm,
  onSearchChange,
  onDetalleClick,
  showSearch = true,
}) => {
  const fullName = (e: Empleado) =>
    `${e.nombre ?? ""} ${e.apellido ?? ""}`.trim();

  // Determinar fecha de corte y filtrar rango relevante según reglas 12–26 y 27–11
  const computeStatus = (
    e: Empleado
  ): {
    label: "Registros pendientes" | "Pendiente de aprobación" | "Completo";
    color: "warning" | "info" | "success";
    tooltip: string;
    totalDays: number;
    registeredDays: number;
    approvedSupervisorDays: number;
  } => {
    const arr = e.registrosUltimos20Dias ?? [];

    const today = new Date();
    const day = today.getDate();

    // calcular fecha de inicio de corte
    const start = new Date(today);
    if (day >= 27) {
      // 27–11: inicio en 27 del mes actual
      start.setDate(27);
    } else if (day >= 12) {
      // 12–26: inicio en 12 del mes actual
      start.setDate(12);
    } else {
      // 1–11: inicio en 27 del mes anterior
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 27);
      start.setTime(prevMonth.getTime());
    }

    const startStr = start.toISOString().split("T")[0];
    const endStr = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    )
      .toISOString()
      .split("T")[0];

    const inRange = arr.filter((x) => x.fecha >= startStr && x.fecha <= endStr);

    // Generar todas las fechas del rango para contar "sin registro"
    const allDates: string[] = [];
    const cursor = new Date(start);
    const endDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    while (cursor <= endDate) {
      allDates.push(cursor.toISOString().split("T")[0]);
      cursor.setDate(cursor.getDate() + 1);
    }
    const setReg = new Set(inRange.map((x) => x.fecha));
    const totalDays = allDates.length;
    const registeredDays =
      totalDays - allDates.filter((d) => !setReg.has(d)).length;
    const approvedSupervisorDays = inRange.filter(
      (x) => x.aprobacionSupervisor === true
    ).length;

    if (!arr.length || inRange.length === 0 || registeredDays < totalDays) {
      return {
        label: "Registros pendientes",
        color: "warning",
        tooltip: `Rango: ${startStr} a ${endStr} • Registrados: ${registeredDays}/${totalDays} • Aprobados(Sup): ${approvedSupervisorDays}/${totalDays}`,
        totalDays,
        registeredDays,
        approvedSupervisorDays,
      };
    }

    const allApproved = inRange.every((x) => x.aprobacionSupervisor === true);
    if (allApproved)
      return {
        label: "Completo",
        color: "success",
        tooltip: `Rango: ${startStr} a ${endStr} • Registrados: ${registeredDays}/${totalDays} • Aprobados(Sup): ${approvedSupervisorDays}/${totalDays}`,
        totalDays,
        registeredDays,
        approvedSupervisorDays,
      };

    return {
      label: "Pendiente de aprobación",
      color: "info",
      tooltip: `Rango: ${startStr} a ${endStr} • Registrados: ${registeredDays}/${totalDays} • Aprobados(Sup): ${approvedSupervisorDays}/${totalDays}`,
      totalDays,
      registeredDays,
      approvedSupervisorDays,
    };
  };

  // Lista ordenada alfabéticamente
  const sortedEmpleados: Empleado[] = React.useMemo(() => {
    return [...(empleados ?? [])].sort((a, b) =>
      fullName(a)
        .toLocaleLowerCase()
        .localeCompare(fullName(b).toLocaleLowerCase())
    );
  }, [empleados]);

  // Loading
  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Barra de búsqueda (opcional) */}
      {showSearch && (
        <Box sx={{ p: 2 }}>
          <TextField
            label="Buscar colaboradores"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      <TableContainer sx={{ flex: 1, minHeight: 0 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Colaborador</TableCell>
              <TableCell>Días registrados</TableCell>
              <TableCell>Días aprobados</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEmpleados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay colaboradores registrados
                </TableCell>
              </TableRow>
            ) : (
              sortedEmpleados.map((empleado) => (
                <TableRow key={empleado.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        src={getImageUrl(empleado.urlFotoPerfil)}
                        alt={`${empleado.nombre} ${empleado.apellido}`}
                      >
                        {empleado.nombre?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {empleado.nombre} {empleado.apellido}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {empleado.correoElectronico}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {(() => {
                    const st = computeStatus(empleado);
                    return (
                      <TableCell>{`${st.registeredDays}/${st.totalDays}`}</TableCell>
                    );
                  })()}
                  {(() => {
                    const st = computeStatus(empleado);
                    return (
                      <TableCell>{`${st.approvedSupervisorDays}/${st.totalDays}`}</TableCell>
                    );
                  })()}

                  <TableCell>
                    {(() => {
                      const st = computeStatus(empleado);
                      return (
                        <Tooltip title={st.tooltip} arrow>
                          <Chip
                            size="small"
                            color={st.color}
                            label={st.label}
                          />
                        </Tooltip>
                      );
                    })()}
                  </TableCell>

                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => onDetalleClick(empleado)}
                      title="Ver actividades"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ColaboradoresList;
