import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  CardActionArea,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import RegistroDiarioService from "../services/registroDiarioService";
import ymdInTZ from "../utils/timeZone";
import type { RegistroDiarioData } from "../dtos/RegistrosDiariosDataDto";

interface NotificationData {
  fecha: string;
  registro: RegistroDiarioData;
  tipo: "supervisor" | "rrhh" | "ambos";
}

export interface NotificationsEmployeeProps {
  onNotificationCountChange?: (count: number) => void;
}

const NotificationsEmployee: React.FC<NotificationsEmployeeProps> = ({
  onNotificationCountChange,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const today = new Date();
      const dates: string[] = [];

      for (let i = 0; i < 20; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const ymd = ymdInTZ(date);
        if (ymd) dates.push(ymd);
      }

      const registros = await Promise.all(
        dates.map((fecha) =>
          RegistroDiarioService.getByDate(fecha)
            .then((reg) => ({ fecha, registro: reg }))
            .catch(() => ({ fecha, registro: null }))
        )
      );

      const notificaciones: NotificationData[] = registros
        .filter(({ registro }) => registro !== null)
        .map(({ fecha, registro }) => {
          const supervisorRechazado = registro!.aprobacionSupervisor === false;
          const rrhhRechazado = registro!.aprobacionRrhh === false;

          if (supervisorRechazado && rrhhRechazado) {
            return { fecha, registro: registro!, tipo: "ambos" as const };
          } else if (supervisorRechazado) {
            return { fecha, registro: registro!, tipo: "supervisor" as const };
          } else if (rrhhRechazado) {
            return { fecha, registro: registro!, tipo: "rrhh" as const };
          }
          return null;
        })
        .filter((n): n is NotificationData => n !== null);

      setNotifications(notificaciones);

      // Notificar al padre sobre el conteo de notificaciones
      if (onNotificationCountChange) {
        onNotificationCountChange(notificaciones.length);
      }
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
      setError("Error al cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  }, [onNotificationCountChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const formatDateInSpanish = (ymd: string) => {
    if (!ymd) return "Fecha no disponible";
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d);

    const days = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${
      dayName.charAt(0).toUpperCase() + dayName.slice(1)
    }, ${day} de ${month} de ${year}`;
  };

  const handleCardClick = (fecha: string) => {
    navigate(`/registro-actividades/${fecha}`);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Cargando notificaciones...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          pt: 3,
          px: 3,
          pb: 4,
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          pr: 3.5,
        }}
      >
        <Typography
          variant="h5"
          color="primary"
          fontWeight="bold"
          gutterBottom
          sx={{ mb: 3 }}
        >
          Notificaciones
        </Typography>

        {notifications.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "40vh",
              textAlign: "center",
            }}
          >
            <CalendarIcon sx={{ fontSize: 80, color: "grey.300", mb: 2 }} />
            <Typography variant="h6" color="text.primary" gutterBottom>
              No tienes notificaciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No hay registros rechazados en los últimos 20 días
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
          {notifications.map((notif) => {
            const badgeLabel =
              notif.tipo === "ambos"
                ? "Rechazado por ambos"
                : notif.tipo === "supervisor"
                ? "Rechazado por Supervisor"
                : "Rechazado por RRHH";
            return (
              <Card
                key={notif.fecha}
                variant="outlined"
                sx={{
                  borderLeft: 3,
                  borderLeftColor: "error.light",
                  borderRadius: 1.5,
                  "&:hover": {
                    borderLeftColor: "error.main",
                    bgcolor: "action.hover",
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleCardClick(notif.fecha)}
                  sx={{ py: 0.5 }}
                >
                  <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                    <Stack spacing={1.25}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        flexWrap="wrap"
                        gap={0.5}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontWeight: 500 }}
                        >
                          {formatDateInSpanish(notif.fecha)}
                        </Typography>
                        <Chip
                          label={badgeLabel}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{
                            height: 22,
                            fontSize: "0.75rem",
                            borderColor: "error.main",
                            color: "error.dark",
                          }}
                        />
                      </Stack>
                      {(notif.tipo === "supervisor" || notif.tipo === "ambos") &&
                        notif.registro.comentarioSupervisor && (
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                color: "text.secondary",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                display: "block",
                                mb: 0.5,
                              }}
                            >
                              Comentario del Supervisor
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: "0.8125rem",
                                lineHeight: 1.4,
                                bgcolor: "grey.50",
                                px: 1.25,
                                py: 1,
                                borderRadius: 1,
                              }}
                            >
                              {notif.registro.comentarioSupervisor}
                            </Typography>
                          </Box>
                        )}
                      {(notif.tipo === "rrhh" || notif.tipo === "ambos") &&
                        notif.registro.comentarioRrhh && (
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                color: "text.secondary",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                display: "block",
                                mb: 0.5,
                              }}
                            >
                              Comentario de RRHH
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: "0.8125rem",
                                lineHeight: 1.4,
                                bgcolor: "grey.50",
                                px: 1.25,
                                py: 1,
                                borderRadius: 1,
                              }}
                            >
                              {notif.registro.comentarioRrhh}
                            </Typography>
                          </Box>
                        )}
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="flex-end"
                        sx={{ pt: 0.25 }}
                      >
                        <Typography
                          variant="caption"
                          color="primary.main"
                          sx={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 0.25 }}
                        >
                          Revisar registro
                          <ChevronRightIcon sx={{ fontSize: 18 }} />
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default NotificationsEmployee;
