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
  EventAvailable as EventAvailableIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import ModuleTitle from "./common/ModuleTitle";
import RegistroDiarioService from "../services/registroDiarioService";
import {
  NotificacionLogService,
  type NotificacionLog,
} from "../services/notificacionLogService";
import ymdInTZ from "../utils/timeZone";
import type { RegistroDiarioData } from "../dtos/RegistrosDiariosDataDto";

type RejectNotif = {
  kind: "rechazo";
  fecha: string;
  registro: RegistroDiarioData;
  tipo: "supervisor" | "rrhh" | "ambos";
  sortAt: number;
};

type LogNotif = {
  kind: "log";
  item: NotificacionLog;
  sortAt: number;
};

type NotificationItem = RejectNotif | LogNotif;

export interface NotificationsEmployeeProps {
  onNotificationCountChange?: (count: number) => void;
}

const NotificationsEmployee: React.FC<NotificationsEmployeeProps> = ({
  onNotificationCountChange,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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

      const [registros, logsPage] = await Promise.all([
        Promise.all(
          dates.map((fecha) =>
            RegistroDiarioService.getByDate(fecha)
              .then((reg) => ({ fecha, registro: reg }))
              .catch(() => ({ fecha, registro: null }))
          )
        ),
        NotificacionLogService.listMias(1, 50).catch(() => ({
          items: [] as NotificacionLog[],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
        })),
      ]);

      const rechazos: RejectNotif[] = registros
        .filter(({ registro }) => registro !== null)
        .map(({ fecha, registro }) => {
          const supervisorRechazado = registro!.aprobacionSupervisor === false;
          const rrhhRechazado = registro!.aprobacionRrhh === false;
          const [y, m, d] = fecha.split("-").map(Number);
          const sortAt = new Date(y, m - 1, d).getTime();

          if (supervisorRechazado && rrhhRechazado) {
            return {
              kind: "rechazo" as const,
              fecha,
              registro: registro!,
              tipo: "ambos" as const,
              sortAt,
            };
          }
          if (supervisorRechazado) {
            return {
              kind: "rechazo" as const,
              fecha,
              registro: registro!,
              tipo: "supervisor" as const,
              sortAt,
            };
          }
          if (rrhhRechazado) {
            return {
              kind: "rechazo" as const,
              fecha,
              registro: registro!,
              tipo: "rrhh" as const,
              sortAt,
            };
          }
          return null;
        })
        .filter((n): n is RejectNotif => n !== null);

      const logs: LogNotif[] = logsPage.items.map((item) => ({
        kind: "log" as const,
        item,
        sortAt: item.createdAt ? new Date(item.createdAt).getTime() : 0,
      }));

      const merged = [...logs, ...rechazos].sort((a, b) => b.sortAt - a.sortAt);
      setNotifications(merged);

      if (onNotificationCountChange) {
        const unreadLogs = logsPage.items.filter((item) => !item.leida).length;
        onNotificationCountChange(rechazos.length + unreadLogs);
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

  const formatDateTime = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("es-HN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleRejectClick = (fecha: string) => {
    navigate(`/registro-actividades/${fecha}`);
  };

  const handleLogClick = async (item: NotificacionLog) => {
    if (!item.leida) {
      try {
        await NotificacionLogService.marcarLeida(item.id);
        setNotifications((current) =>
          current.map((n) =>
            n.kind === "log" && n.item.id === item.id
              ? { ...n, item: { ...n.item, leida: true } }
              : n
          )
        );
        if (onNotificationCountChange) {
          const unreadLogs = notifications.filter(
            (n) => n.kind === "log" && !n.item.leida && n.item.id !== item.id
          ).length;
          const rechazos = notifications.filter((n) => n.kind === "rechazo").length;
          onNotificationCountChange(rechazos + unreadLogs);
        }
      } catch {
        // Si falla marcar leída, igual se puede navegar
      }
    }
    const meta = item.metadata as { solicitudId?: number } | null;
    if (item.categoria === "SOLICITUD_PERMISO") {
      navigate("/mis-solicitudes");
      return;
    }
    if (
      (item.categoria === "CAMBIO_JOB" || item.categoria === "CAMBIO_CLASS") &&
      meta &&
      typeof meta === "object"
    ) {
      // Supervisores: ir a revisión de planillas; colaborador no recibe estas categorías.
      navigate("/supervision/planillas");
      return;
    }
  };

  const actividadDescripcionDe = (item: NotificacionLog): string | null => {
    if (!item.metadata || typeof item.metadata !== "object") return null;
    const value = (item.metadata as { actividadDescripcion?: string })
      .actividadDescripcion;
    const trimmed = value?.trim();
    return trimmed || null;
  };

  const logChip = (item: NotificacionLog) => {
    if (item.categoria === "SOLICITUD_PERMISO") {
      const aprobado = Boolean(
        item.metadata &&
          typeof item.metadata === "object" &&
          (item.metadata as { aprobado?: boolean }).aprobado
      );
      return {
        label: aprobado ? "Solicitud aprobada" : "Solicitud rechazada",
        color: aprobado ? ("success" as const) : ("error" as const),
      };
    }
    if (item.categoria === "CAMBIO_JOB") {
      return { label: "Cambio de job", color: "info" as const };
    }
    if (item.categoria === "CAMBIO_CLASS") {
      return { label: "Cambio de class", color: "warning" as const };
    }
    return { label: item.categoria, color: "default" as const };
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
        <ModuleTitle>Notificaciones</ModuleTitle>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

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
      <ModuleTitle>Notificaciones</ModuleTitle>
      <Box
        sx={{
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}
      >
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
              Cuando haya novedades aparecerán aquí
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {notifications.map((notif) => {
              if (notif.kind === "log") {
                const chip = logChip(notif.item);
                return (
                  <Card
                    key={`log-${notif.item.id}`}
                    variant="outlined"
                    sx={{
                      borderLeft: 3,
                      borderLeftColor: notif.item.leida
                        ? "divider"
                        : `${chip.color}.light`,
                      borderRadius: 1.5,
                      opacity: notif.item.leida ? 0.85 : 1,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => void handleLogClick(notif.item)}
                      sx={{ py: 0.5 }}
                    >
                      <CardContent
                        sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}
                      >
                        <Stack spacing={1}>
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
                              {formatDateTime(notif.item.createdAt)}
                            </Typography>
                            <Chip
                              icon={<EventAvailableIcon />}
                              label={chip.label}
                              size="small"
                              color={chip.color}
                              variant="outlined"
                              sx={{ height: 22, fontSize: "0.75rem" }}
                            />
                          </Stack>
                          <Typography variant="body2">
                            {notif.item.descripcion}
                          </Typography>
                          {actividadDescripcionDe(notif.item) && (
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
                                Actividad
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
                                {actividadDescripcionDe(notif.item)}
                              </Typography>
                            </Box>
                          )}
                          {!notif.item.leida && (
                            <Typography variant="caption" color="primary.main">
                              Sin leer
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              }

              const badgeLabel =
                notif.tipo === "ambos"
                  ? "Rechazado por ambos"
                  : notif.tipo === "supervisor"
                    ? "Rechazado por Supervisor"
                    : "Rechazado por RRHH";
              return (
                <Card
                  key={`rechazo-${notif.fecha}`}
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
                    onClick={() => handleRejectClick(notif.fecha)}
                    sx={{ py: 0.5 }}
                  >
                    <CardContent
                      sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}
                    >
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
                        {(notif.tipo === "supervisor" ||
                          notif.tipo === "ambos") &&
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
                            sx={{
                              fontWeight: 500,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.25,
                            }}
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
