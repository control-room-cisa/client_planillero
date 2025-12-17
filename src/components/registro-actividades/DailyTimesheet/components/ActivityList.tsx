import * as React from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { Add, AccessTime, Edit, Delete } from "@mui/icons-material";
import type { Activity } from "../../types";
import type { RegistroDiarioData } from "../../../../dtos/RegistrosDiariosDataDto";

type ActivityListProps = {
  initialLoading: boolean;
  registroDiario: RegistroDiarioData | null;
  readOnly: boolean;
  handleDrawerOpen: () => void;
  handleEditActivity: (activity: Activity, index: number) => void;
  handleDeleteActivity: (index: number) => void;
  formatTimeLocal: (iso?: string | null) => string;
  timeToMinutes: (time: string) => number;
  computeHorasActividadForDisplayWrapper: (act: Activity) => string;
};

export const ActivityList: React.FC<ActivityListProps> = ({
  initialLoading,
  registroDiario,
  readOnly,
  handleDrawerOpen,
  handleEditActivity,
  handleDeleteActivity,
  formatTimeLocal,
  timeToMinutes,
  computeHorasActividadForDisplayWrapper,
}) => {
  if (initialLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          textAlign: "center",
          bgcolor: "background.paper",
          borderRadius: 2,
          p: 4,
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.primary" gutterBottom>
          Cargando actividades...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Obteniendo los datos del día
        </Typography>
      </Box>
    );
  }

  if (!registroDiario?.actividades || registroDiario.actividades.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          textAlign: "center",
          bgcolor: "background.paper",
          borderRadius: 2,
          p: 4,
        }}
      >
        <AccessTime sx={{ fontSize: 80, color: "grey.300", mb: 2 }} />
        <Typography variant="h6" color="text.primary" gutterBottom>
          No hay actividades para hoy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Comienza agregando tu primera actividad del día
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ borderRadius: 2 }}
          onClick={handleDrawerOpen}
        >
          Agregar Actividad
        </Button>
      </Box>
    );
  }

  // Obtener horas de entrada y salida en minutos para comparar
  const entradaMin = registroDiario.horaEntrada
    ? timeToMinutes(formatTimeLocal(registroDiario.horaEntrada))
    : 0;
  const salidaMin = registroDiario.horaSalida
    ? timeToMinutes(formatTimeLocal(registroDiario.horaSalida))
    : 1440;

  // Clasificar actividades en tres grupos
  const extrasAntesEntrada: typeof registroDiario.actividades = [];
  const normales: typeof registroDiario.actividades = [];
  const extrasDespuesSalida: typeof registroDiario.actividades = [];

  registroDiario.actividades.forEach((act) => {
    if (!act.esExtra) {
      normales.push(act);
    } else if (act.horaInicio) {
      const inicioMin = timeToMinutes(formatTimeLocal(act.horaInicio));
      if (inicioMin < entradaMin) {
        extrasAntesEntrada.push(act);
      } else if (inicioMin >= salidaMin) {
        extrasDespuesSalida.push(act);
      } else {
        normales.push(act);
      }
    } else {
      normales.push(act);
    }
  });

  // Ordenar extras por hora de inicio ascendente
  extrasAntesEntrada.sort((a, b) => {
    if (!a.horaInicio || !b.horaInicio) return 0;
    const aMin = timeToMinutes(formatTimeLocal(a.horaInicio));
    const bMin = timeToMinutes(formatTimeLocal(b.horaInicio));
    return aMin - bMin;
  });

  extrasDespuesSalida.sort((a, b) => {
    if (!a.horaInicio || !b.horaInicio) return 0;
    const aMin = timeToMinutes(formatTimeLocal(a.horaInicio));
    const bMin = timeToMinutes(formatTimeLocal(b.horaInicio));
    return aMin - bMin;
  });

  // Concatenar en el orden correcto: extras antes, normales, extras después
  const actividadesOrdenadas = [
    ...extrasAntesEntrada,
    ...normales,
    ...extrasDespuesSalida,
  ];

  // Verificar si hay horas laborables (horaEntrada !== horaSalida)
  const tieneHorasLaborables =
    registroDiario.horaEntrada &&
    registroDiario.horaSalida &&
    formatTimeLocal(registroDiario.horaEntrada) !==
      formatTimeLocal(registroDiario.horaSalida);

  // Crear array con actividades y espacios libres
  type ActividadConLibre =
    | ((typeof actividadesOrdenadas)[0] & { tipo: "actividad" })
    | { tipo: "libre"; horaInicio: string; horaFin: string };

  const actividadesConLibres: ActividadConLibre[] = [];

  // Helper para crear espacio libre
  const crearEspacioLibre = (
    horaInicioMin: number,
    horaFinMin: number
  ): ActividadConLibre => {
    return {
      tipo: "libre",
      horaInicio: `${Math.floor(horaInicioMin / 60)
        .toString()
        .padStart(2, "0")}:${(horaInicioMin % 60)
        .toString()
        .padStart(2, "0")}`,
      horaFin: `${Math.floor(horaFinMin / 60)
        .toString()
        .padStart(2, "0")}:${(horaFinMin % 60)
        .toString()
        .padStart(2, "0")}`,
    };
  };

  // Filtrar solo actividades con horaInicio y horaFin para detectar espacios
  const actividadesConHora = actividadesOrdenadas.filter(
    (act) => act.horaInicio && act.horaFin
  );

  if (tieneHorasLaborables && actividadesConHora.length > 0) {
    // Caso 1: Hay horas laborables - solo mostrar espacios libres ANTES de entrada y DESPUÉS de salida

    // Separar actividades extra en dos grupos: antes de entrada y después de salida
    const actividadesAntesEntrada = actividadesConHora.filter((act) => {
      if (!act.horaInicio) return false;
      const inicioMin = timeToMinutes(formatTimeLocal(act.horaInicio));
      return inicioMin < entradaMin;
    });

    const actividadesDespuesSalida = actividadesConHora.filter((act) => {
      if (!act.horaInicio) return false;
      const inicioMin = timeToMinutes(formatTimeLocal(act.horaInicio));
      return inicioMin >= salidaMin;
    });

    // Procesar todas las actividades en orden primero
    actividadesOrdenadas.forEach((act) => {
      actividadesConLibres.push({
        ...act,
        tipo: "actividad",
      });
    });

    // Ordenar actividades antes de entrada por horaInicio
    actividadesAntesEntrada.sort((a, b) => {
      if (!a.horaInicio || !b.horaInicio) return 0;
      const aMin = timeToMinutes(formatTimeLocal(a.horaInicio));
      const bMin = timeToMinutes(formatTimeLocal(b.horaInicio));
      return aMin - bMin;
    });

    // Espacios libres entre actividades ANTES de horaEntrada
    for (let i = 0; i < actividadesAntesEntrada.length; i++) {
      const act = actividadesAntesEntrada[i];
      if (!act.horaFin) continue;

      const finActMin = timeToMinutes(formatTimeLocal(act.horaFin));
      let inicioSigMin: number | null = null;

      if (i < actividadesAntesEntrada.length - 1) {
        const sigAct = actividadesAntesEntrada[i + 1];
        if (sigAct.horaInicio) {
          inicioSigMin = timeToMinutes(formatTimeLocal(sigAct.horaInicio));
        }
      } else {
        inicioSigMin = entradaMin;
      }

      if (inicioSigMin !== null && inicioSigMin > finActMin) {
        const espacioLibre = crearEspacioLibre(finActMin, inicioSigMin);
        const indiceAct = actividadesConLibres.findIndex(
          (item) =>
            item.tipo === "actividad" &&
            (item as typeof act).id === act.id &&
            (item as typeof act).horaInicio === act.horaInicio
        );
        if (indiceAct >= 0) {
          actividadesConLibres.splice(indiceAct + 1, 0, espacioLibre);
        }
      }
    }

    // Ordenar actividades después de salida por horaInicio
    actividadesDespuesSalida.sort((a, b) => {
      if (!a.horaInicio || !b.horaInicio) return 0;
      const aMin = timeToMinutes(formatTimeLocal(a.horaInicio));
      const bMin = timeToMinutes(formatTimeLocal(b.horaInicio));
      return aMin - bMin;
    });

    // Espacio libre entre horaSalida y primera actividad DESPUÉS de salida
    if (actividadesDespuesSalida.length > 0) {
      const primeraActDespues = actividadesDespuesSalida[0];
      if (primeraActDespues.horaInicio) {
        const inicioPrimeraMin = timeToMinutes(
          formatTimeLocal(primeraActDespues.horaInicio)
        );
        if (inicioPrimeraMin > salidaMin) {
          const espacioLibre = crearEspacioLibre(salidaMin, inicioPrimeraMin);
          const indicePrimera = actividadesConLibres.findIndex(
            (item) =>
              item.tipo === "actividad" &&
              (item as typeof primeraActDespues).id === primeraActDespues.id &&
              (item as typeof primeraActDespues).horaInicio ===
                primeraActDespues.horaInicio
          );
          if (indicePrimera >= 0) {
            actividadesConLibres.splice(indicePrimera, 0, espacioLibre);
          }
        }
      }
    }

    // Espacios libres entre actividades DESPUÉS de horaSalida
    for (let i = 0; i < actividadesDespuesSalida.length - 1; i++) {
      const actActual = actividadesDespuesSalida[i];
      const actSiguiente = actividadesDespuesSalida[i + 1];
      if (actActual.horaFin && actSiguiente.horaInicio) {
        const finActMin = timeToMinutes(formatTimeLocal(actActual.horaFin));
        const inicioSigMin = timeToMinutes(
          formatTimeLocal(actSiguiente.horaInicio)
        );
        if (inicioSigMin > finActMin) {
          const espacioLibre = crearEspacioLibre(finActMin, inicioSigMin);
          const indiceActActual = actividadesConLibres.findIndex(
            (item) =>
              item.tipo === "actividad" &&
              (item as typeof actActual).id === actActual.id &&
              (item as typeof actActual).horaInicio === actActual.horaInicio
          );
          if (indiceActActual >= 0) {
            let posicionInsercion = indiceActActual + 1;
            while (
              posicionInsercion < actividadesConLibres.length &&
              actividadesConLibres[posicionInsercion].tipo === "actividad" &&
              (actividadesConLibres[posicionInsercion] as typeof actSiguiente)
                .id !== actSiguiente.id
            ) {
              posicionInsercion++;
            }
            actividadesConLibres.splice(posicionInsercion, 0, espacioLibre);
          }
        }
      }
    }
  } else if (!tieneHorasLaborables && actividadesConHora.length > 0) {
    // Caso 2: No hay horas laborables - solo considerar espacios entre horas extra
    const actividadesConHoraOrdenadas = [...actividadesConHora].sort((a, b) => {
      if (!a.horaInicio || !b.horaInicio) return 0;
      const aMin = timeToMinutes(formatTimeLocal(a.horaInicio));
      const bMin = timeToMinutes(formatTimeLocal(b.horaInicio));
      return aMin - bMin;
    });

    actividadesOrdenadas.forEach((act) => {
      actividadesConLibres.push({
        ...act,
        tipo: "actividad",
      });
    });

    // Agregar espacios libres entre actividades con hora
    for (let i = 0; i < actividadesConHoraOrdenadas.length - 1; i++) {
      const actActual = actividadesConHoraOrdenadas[i];
      const actSiguiente = actividadesConHoraOrdenadas[i + 1];
      if (actActual.horaFin && actSiguiente.horaInicio) {
        const finActMin = timeToMinutes(formatTimeLocal(actActual.horaFin));
        const inicioSigMin = timeToMinutes(
          formatTimeLocal(actSiguiente.horaInicio)
        );
        if (inicioSigMin > finActMin) {
          const espacioLibre = crearEspacioLibre(finActMin, inicioSigMin);
          const indiceActActual = actividadesConLibres.findIndex(
            (item) =>
              item.tipo === "actividad" &&
              (item as typeof actActual).id === actActual.id &&
              (item as typeof actActual).horaInicio === actActual.horaInicio
          );
          if (indiceActActual >= 0) {
            let posicionInsercion = indiceActActual + 1;
            while (
              posicionInsercion < actividadesConLibres.length &&
              actividadesConLibres[posicionInsercion].tipo === "actividad" &&
              (actividadesConLibres[posicionInsercion] as typeof actSiguiente)
                .id !== actSiguiente.id
            ) {
              posicionInsercion++;
            }
            actividadesConLibres.splice(posicionInsercion, 0, espacioLibre);
          }
        }
      }
    }
  } else {
    actividadesOrdenadas.forEach((act) => {
      actividadesConLibres.push({
        ...act,
        tipo: "actividad",
      });
    });
  }

  return (
    <Stack spacing={2}>
      {actividadesConLibres.map((item, index) => {
        // Si es un espacio libre, renderizar card especial
        if (item.tipo === "libre") {
          return (
            <Card
              key={`libre-${index}`}
              sx={{
                bgcolor: "rgba(255, 182, 193, 0.3)",
                borderLeft: "4px solid rgba(255, 99, 71, 0.4)",
              }}
            >
              <CardContent>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ fontStyle: "italic", textAlign: "center" }}
                >
                  Libre ({item.horaInicio} - {item.horaFin})
                </Typography>
              </CardContent>
            </Card>
          );
        }

        // Si es una actividad normal, renderizar como antes
        const actividad = item;
        const actividadIndex = registroDiario.actividades?.findIndex(
          (a) => a.id === actividad.id || a === actividad
        ) ?? -1;
        return (
          <Card
            key={actividad.id || index}
            sx={{
              bgcolor: actividad.esExtra
                ? "rgba(255, 243, 224, 0.5)"
                : "background.paper",
              borderLeft: actividad.esExtra
                ? "4px solid rgba(255, 152, 0, 0.3)"
                : "none",
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                }}
              >
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: "medium", flex: 1 }}
                >
                  {actividad.job?.nombre || `Job ID: ${actividad.jobId}`}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={`${computeHorasActividadForDisplayWrapper(
                        actividad
                      )}h`}
                      size="small"
                      color="primary"
                    />
                    {actividad.esExtra && (
                      <Chip label="Extra" size="small" color="warning" />
                    )}
                  </Stack>
                  <IconButton
                    disabled={readOnly}
                    size="small"
                    onClick={() =>
                      handleEditActivity(
                        actividad,
                        actividadIndex >= 0 ? actividadIndex : index
                      )
                    }
                    sx={{ color: "primary.main" }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    disabled={readOnly}
                    size="small"
                    onClick={() =>
                      handleDeleteActivity(
                        actividadIndex >= 0 ? actividadIndex : index
                      )
                    }
                    sx={{ color: "error.main" }}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                <strong>Job:</strong> {actividad.job?.codigo || actividad.jobId}
              </Typography>

              {actividad.className && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  <strong>Class:</strong> {actividad.className}
                </Typography>
              )}

              {actividad.esExtra &&
                actividad.horaInicio &&
                actividad.horaFin && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    <strong>Horario:</strong>{" "}
                    {formatTimeLocal(actividad.horaInicio)} -{" "}
                    {formatTimeLocal(actividad.horaFin)}
                  </Typography>
                )}

              <Typography variant="body1" color="text.primary">
                {actividad.descripcion}
              </Typography>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
};

