import * as React from "react";
import { Box, Card, CardContent, Divider, Typography } from "@mui/material";
import type { Empleado } from "../../../../../services/empleadoService";
import { getTipoHorarioLabel } from "../../../../../enums/tipoHorario";

interface InfoColaboradorCardsProps {
  empleado: Empleado;
  formatCurrency: (valor: number) => string;
}

/**
 * Grilla de 3 tarjetas informativas del colaborador:
 *  - Información de Contrato
 *  - Beneficios Acumulados
 *  - Información Bancaria y de Contacto
 */
const InfoColaboradorCards: React.FC<InfoColaboradorCardsProps> = ({
  empleado,
  formatCurrency,
}) => {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
        gap: 3,
      }}
    >
      {/* Información de Contrato */}
      <Card>
        <CardContent>
          <Typography variant="h6" color="primary" gutterBottom>
            Información de Contrato
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="body1">
                <strong>Departamento:</strong>
              </Typography>
              <Typography
                variant="body1"
                sx={{ textAlign: "right", flex: 1, minWidth: 0 }}
              >
                {(empleado as any).departamento ||
                  ((empleado as any).departamentoId
                    ? `Departamento ${(empleado as any).departamentoId}`
                    : "—")}
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
                <strong>Tipo de Contrato:</strong>
              </Typography>
              <Typography
                variant="body1"
                sx={{ textAlign: "right", flex: 1, minWidth: 0 }}
              >
                {empleado.tipoContrato ?? "—"}
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
                <strong>Tipo de Horario:</strong>
              </Typography>
              <Typography
                variant="body1"
                sx={{ textAlign: "right", flex: 1, minWidth: 0 }}
              >
                {empleado.tipoHorario
                  ? getTipoHorarioLabel(empleado.tipoHorario)
                  : "—"}
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="body1">
                <strong>Sueldo Mensual:</strong>
              </Typography>
              <Typography
                variant="body1"
                sx={{ textAlign: "right", flex: 1, minWidth: 0 }}
              >
                {empleado?.sueldoMensual != null
                  ? formatCurrency(empleado.sueldoMensual)
                  : "—"}
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
                <strong>Sueldo Quincenal:</strong>
              </Typography>
              <Typography
                variant="body1"
                sx={{ textAlign: "right", flex: 1, minWidth: 0 }}
              >
                {empleado?.sueldoMensual != null
                  ? formatCurrency(empleado.sueldoMensual / 2)
                  : "—"}
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
                <strong>Sueldo por hora:</strong>
              </Typography>
              <Typography
                variant="body1"
                sx={{ textAlign: "right", flex: 1, minWidth: 0 }}
              >
                {Number.isFinite(Number(empleado?.sueldoMensual))
                  ? formatCurrency(Number(empleado!.sueldoMensual) / 240)
                  : "—"}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Beneficios Acumulados */}
      <Card>
        <CardContent>
          <Typography variant="h6" color="primary" gutterBottom>
            Beneficios Acumulados
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="body1">
                <strong>Tiempo Compensatorio (horas):</strong>
              </Typography>
              <Typography
                variant="body1"
                sx={{ textAlign: "right", flex: 1, minWidth: 0 }}
              >
                {(empleado as any).tiempoCompensatorioHoras != null
                  ? `${(empleado as any).tiempoCompensatorioHoras}h`
                  : "—"}
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
                <strong>Vacaciones (horas):</strong>
              </Typography>
              <Typography
                variant="body1"
                sx={{ textAlign: "right", flex: 1, minWidth: 0 }}
              >
                {(empleado as any).tiempoVacacionesHoras != null
                  ? `${(empleado as any).tiempoVacacionesHoras}h`
                  : "—"}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Información Bancaria y de Contacto (fusionada) */}
      <Card>
        <CardContent>
          <Typography variant="h6" color="primary" gutterBottom>
            Información Bancaria y de Contacto
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Banco:</strong> {empleado.banco || "No especificado"}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Tipo de Cuenta:</strong>{" "}
              {empleado.tipoCuenta || "No especificado"}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Número de Cuenta:</strong>{" "}
              {empleado.numeroCuenta || "No especificado"}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" gutterBottom>
              <strong>Correo:</strong>{" "}
              {empleado.correoElectronico || "No especificado"}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Teléfono:</strong>{" "}
              {empleado.telefono || "No especificado"}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Dirección:</strong>{" "}
              {empleado.direccion || "No especificada"}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InfoColaboradorCards;
