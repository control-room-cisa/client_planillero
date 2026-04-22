import * as React from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import type { ResumenHorasTrabajo } from "../../../../../services/calculoHorasTrabajoService";

interface ResumenIncidenciasProps {
  loading: boolean;
  resumenHoras: ResumenHorasTrabajo | null;
  periodoNomina: number;
  diasIncapacidadCubreEmpresa: number;
  diasIncapacidadCubreIHSS: number;
  montoDiasLaborados: number;
  montoVacaciones: number;
  montoIncapacidadCubreEmpresa: number;
  montoIncapacidadIHSS: number;
  subtotalQuincena: number;
  montoPermisosJustificados: number;
  formatCurrency: (valor: number) => string;
}

/**
 * Bloque "Registro de Incidencias": grilla de 3 columnas con días, montos y
 * horas compensatorias tomadas/devueltas del resumen del período.
 */
const ResumenIncidencias: React.FC<ResumenIncidenciasProps> = ({
  loading,
  resumenHoras,
  periodoNomina,
  diasIncapacidadCubreEmpresa,
  diasIncapacidadCubreIHSS,
  montoDiasLaborados,
  montoVacaciones,
  montoIncapacidadCubreEmpresa,
  montoIncapacidadIHSS,
  subtotalQuincena,
  montoPermisosJustificados,
  formatCurrency,
}) => {
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Registro de Incidencias
      </Typography>
      <Paper sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mt: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress />
          </Box>
        ) : resumenHoras ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: { xs: 2, sm: 2.5, md: 3 },
              mt: 2,
            }}
          >
            {/* Columna 1 */}
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Días laborados:</strong>
                </Typography>
                <Typography variant="body1">
                  {resumenHoras.conteoHoras.conteoDias?.diasLaborados ?? 0}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Vacaciones (días):</strong>
                </Typography>
                <Typography variant="body1">
                  {resumenHoras.conteoHoras.conteoDias?.vacaciones ?? 0}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Compensatorias tomadas (días):</strong>
                </Typography>
                <Typography variant="body1">
                  {resumenHoras.conteoHoras.conteoDias
                    ?.compensatoriasTomadas ?? 0}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Incapacidad cubre empresa (días):</strong>
                </Typography>
                <Typography variant="body1">
                  {diasIncapacidadCubreEmpresa}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Incapacidad cubre IHSS (días):</strong>
                </Typography>
                <Typography variant="body1">
                  {diasIncapacidadCubreIHSS}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Total días nómina:</strong>
                </Typography>
                <Typography variant="body1">{periodoNomina}</Typography>
              </Box>
            </Box>

            {/* Columna 2 */}
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Monto días laborados:</strong>
                </Typography>
                <Typography variant="body1">
                  {formatCurrency(montoDiasLaborados || 0)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Monto vacaciones:</strong>
                </Typography>
                <Typography variant="body1">
                  {formatCurrency(montoVacaciones || 0)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Monto incapacidad cubre empresa:</strong>
                </Typography>
                <Typography variant="body1">
                  {formatCurrency(montoIncapacidadCubreEmpresa || 0)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Monto incapacidad IHSS:</strong>
                </Typography>
                <Typography variant="body1">
                  {formatCurrency(montoIncapacidadIHSS || 0)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Subtotal:</strong>
                </Typography>
                <Typography variant="body1">
                  {formatCurrency(subtotalQuincena || 0)}
                </Typography>
              </Box>
            </Box>

            {/* Columna 3 */}
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Permisos justificados:</strong>
                </Typography>
                <Typography variant="body1">
                  {resumenHoras.conteoHoras.conteoDias?.permisoConSueldo ?? 0}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Monto por permisos justificados:</strong>
                </Typography>
                <Typography variant="body1">
                  {formatCurrency(montoPermisosJustificados || 0)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Permisos no justificados:</strong>
                </Typography>
                <Typography variant="body1">
                  {resumenHoras.conteoHoras.conteoDias?.permisoSinSueldo ?? 0}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Inasistencias:</strong>
                </Typography>
                <Typography variant="body1">
                  {resumenHoras.conteoHoras.conteoDias?.inasistencias ?? 0}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Horas compensatorias tomadas:</strong>
                </Typography>
                <Typography variant="body1">
                  {resumenHoras.conteoHoras.cantidadHoras?.horasCompensatoriasTomadas?.toFixed(
                    2,
                  ) ?? "0.00"}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Horas compensatorias devueltas:</strong>
                </Typography>
                <Typography variant="body1">
                  {resumenHoras.conteoHoras.cantidadHoras?.horasCompensatoriasDevueltas?.toFixed(
                    2,
                  ) ?? "0.00"}
                </Typography>
              </Box>
              {/* Incapacidad en horas comentado temporalmente */}
              {/* <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Incapacidad cubre empresa (horas):</strong>
                </Typography>
                <Typography variant="body1">
                  {horasIncapacidadCubreEmpresa.toFixed(2)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body1">
                  <strong>Incapacidad cubre IHSS (horas):</strong>
                </Typography>
                <Typography variant="body1">
                  {horasIncapacidadCubreIHSS.toFixed(2)}
                </Typography>
              </Box> */}
            </Box>
          </Box>
        ) : (
          <Typography variant="body1" color="text.secondary">
            Selecciona un período de nómina del selector para ver la
            información.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default ResumenIncidencias;
