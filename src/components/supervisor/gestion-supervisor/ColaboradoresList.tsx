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
  EventAvailable as EventAvailableIcon,
  Search as SearchIcon,
  MoreTime as MoreTimeIcon,
} from "@mui/icons-material";
import type { Empleado } from "../../../services/empleadoService";
import { getImageUrl } from "../../../utils/imageUtils";
import { ymdInTimeZone } from "../../../utils/dateTime";
import TiempoCompensatorioAcumulado from "../../common/TiempoCompensatorioAcumulado";
import {
  parseYmdLocal,
  periodoQueContiene,
} from "../../rrhh/gestion-empleados/calculo-nominas/utils/periodos";
import { usePeriodosNominaConfig } from "../../../contexts/PeriodosNominaConfigContext";

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
  const { config: periodosConfig } = usePeriodosNominaConfig();
  const [compensatorioModalEmpleado, setCompensatorioModalEmpleado] =
    React.useState<Empleado | null>(null);

  const fullName = (e: Empleado) =>
    `${e.nombre ?? ""} ${e.apellido ?? ""}`.trim();

  const computeStatus = (
    e: Empleado,
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
    const periodo = periodoQueContiene(today, periodosConfig);
    let start: Date;
    let end: Date;
    if (periodo) {
      start = parseYmdLocal(periodo.fechaInicio);
      end = parseYmdLocal(periodo.fechaFin);
    } else {
      start = new Date(today);
      end = new Date(today);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const startStr = ymdInTimeZone(start);
    const endStr = ymdInTimeZone(end);

    // Filtrar registros que estén en el rango del intervalo completo
    const inRange = arr.filter((x) => x.fecha >= startStr && x.fecha <= endStr);

    // Generar todas las fechas del intervalo completo para contar días esperados
    const allDates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      allDates.push(ymdInTimeZone(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalDays = allDates.length;
    const registeredDays = inRange.length; // Días que tienen registro
    const approvedSupervisorDays = inRange.filter(
      (x) => x.aprobacionSupervisor === true,
    ).length;

    if (!arr.length || inRange.length === 0 || registeredDays < totalDays) {
      return {
        label: "Registros pendientes",
        color: "warning",
        tooltip: `Registrados: ${registeredDays}/${totalDays} • Aprobados(Sup): ${approvedSupervisorDays}/${totalDays}`,
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
        tooltip: `Registrados: ${registeredDays}/${totalDays} • Aprobados(Sup): ${approvedSupervisorDays}/${totalDays}`,
        totalDays,
        registeredDays,
        approvedSupervisorDays,
      };

    return {
      label: "Pendiente de aprobación",
      color: "info",
      tooltip: `Registrados: ${registeredDays}/${totalDays} • Aprobados(Sup): ${approvedSupervisorDays}/${totalDays}`,
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
        .localeCompare(fullName(b).toLocaleLowerCase()),
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

      <TableContainer
        sx={{
          flex: 1,
          minHeight: 0,
          "& .MuiTableCell-root": {
            fontSize: { xs: "0.875rem", sm: "1rem" },
            padding: { xs: "8px 4px", sm: "16px" },
          },
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Colaborador</TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", sm: "table-cell" },
                }}
              >
                Días registrados
              </TableCell>
              <TableCell
                sx={{
                  display: { xs: "none", sm: "table-cell" },
                }}
              >
                Días aprobados
              </TableCell>
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
                        sx={{
                          display: { xs: "none", sm: "flex" },
                        }}
                      >
                        {empleado.nombre?.[0]}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="body1"
                          fontWeight="medium"
                          sx={{
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {empleado.nombre} {empleado.apellido}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: { xs: "none", sm: "block" },
                          }}
                        >
                          {empleado.correoElectronico}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {(() => {
                    const st = computeStatus(empleado);
                    return (
                      <TableCell
                        sx={{
                          display: { xs: "none", sm: "table-cell" },
                        }}
                      >
                        {`${st.registeredDays}/${st.totalDays}`}
                      </TableCell>
                    );
                  })()}
                  {(() => {
                    const st = computeStatus(empleado);
                    return (
                      <TableCell
                        sx={{
                          display: { xs: "none", sm: "table-cell" },
                        }}
                      >
                        {`${st.approvedSupervisorDays}/${st.totalDays}`}
                      </TableCell>
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
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        gap: 0.5,
                      }}
                    >
                      <Tooltip title="Revisar actividades">
                        <IconButton
                          color="primary"
                          onClick={() => onDetalleClick(empleado)}
                          size="small"
                          aria-label="Revisar actividades"
                        >
                          <EventAvailableIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Tiempo compensatorio acumulado">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => setCompensatorioModalEmpleado(empleado)}
                          aria-label="Tiempo compensatorio acumulado"
                        >
                          <MoreTimeIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TiempoCompensatorioAcumulado
        open={Boolean(compensatorioModalEmpleado)}
        onClose={() => setCompensatorioModalEmpleado(null)}
        empleadoId={Number(compensatorioModalEmpleado?.id || 0)}
        nombreEmpleado={
          compensatorioModalEmpleado
            ? fullName(compensatorioModalEmpleado)
            : undefined
        }
      />
    </Paper>
  );
};

export default ColaboradoresList;
