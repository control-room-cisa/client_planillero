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
  ErrorOutline as ErrorIcon,
  CalendarToday as CalendarIcon,
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
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
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
        <Stack spacing={2}>
          {notifications.map((notif) => (
            <Card
              key={notif.fecha}
              sx={{
                borderLeft: 4,
                borderLeftColor: "error.main",
                "&:hover": {
                  boxShadow: 3,
                  transform: "translateY(-2px)",
                  transition: "all 0.2s",
                },
              }}
            >
              <CardActionArea onClick={() => handleCardClick(notif.fecha)}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      flexWrap="wrap"
                      gap={1}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <ErrorIcon color="error" />
                        <Typography variant="h6" fontWeight="bold">
                          Registro Rechazado
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {notif.tipo === "supervisor" && (
                          <Chip
                            label="Rechazado por Supervisor"
                            color="error"
                            size="small"
                          />
                        )}
                        {notif.tipo === "rrhh" && (
                          <Chip
                            label="Rechazado por RRHH"
                            color="error"
                            size="small"
                          />
                        )}
                        {notif.tipo === "ambos" && (
                          <>
                            <Chip
                              label="Rechazado por Supervisor"
                              color="error"
                              size="small"
                            />
                            <Chip
                              label="Rechazado por RRHH"
                              color="error"
                              size="small"
                            />
                          </>
                        )}
                      </Stack>
                    </Stack>
                    <Typography variant="body1" color="text.secondary">
                      <strong>Fecha:</strong> {formatDateInSpanish(notif.fecha)}
                    </Typography>
                    {(notif.tipo === "supervisor" || notif.tipo === "ambos") &&
                      notif.registro.comentarioSupervisor && (
                        <Alert severity="error" variant="outlined">
                          <Typography
                            variant="subtitle2"
                            fontWeight="bold"
                            gutterBottom
                          >
                            Comentario del Supervisor
                          </Typography>
                          <Typography variant="body2">
                            {notif.registro.comentarioSupervisor}
                          </Typography>
                        </Alert>
                      )}
                    {(notif.tipo === "rrhh" || notif.tipo === "ambos") &&
                      notif.registro.comentarioRrhh && (
                        <Alert severity="error" variant="outlined">
                          <Typography
                            variant="subtitle2"
                            fontWeight="bold"
                            gutterBottom
                          >
                            Comentario de RRHH
                          </Typography>
                          <Typography variant="body2">
                            {notif.registro.comentarioRrhh}
                          </Typography>
                        </Alert>
                      )}
                    <Typography
                      variant="body2"
                      color="primary.main"
                      sx={{ fontWeight: "medium", mt: 1 }}
                    >
                      Haz clic para revisar y corregir este registro
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default NotificationsEmployee;
