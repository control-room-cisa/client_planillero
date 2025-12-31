import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  Button,
  Chip,
  Stack,
  LinearProgress,
  Grow,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  IconButton,
  TextField,
  useTheme,
  useMediaQuery,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Tooltip,
} from "@mui/material";
import {
  Close as CloseIcon,
  DarkMode as DarkModeIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import type { RegistroDiarioData } from "../../../dtos/RegistrosDiariosDataDto";
import RegistroDiarioService from "../../../services/registroDiarioService";
import ymdInTZ from "../../../utils/timeZone";

interface Props {
  open: boolean;
  onClose: () => void;
  empleadoId: number;
  fechaInicio: string;
  fechaFin: string;
  nombreEmpleado?: string;
}

const DetalleRegistrosDiariosModal: React.FC<Props> = ({
  open,
  onClose,
  empleadoId,
  fechaInicio,
  fechaFin,
  nombreEmpleado,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [registros, setRegistros] = useState<RegistroDiarioData[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Estados para el diálogo de rechazo
  const [rechazoDialogOpen, setRechazoDialogOpen] = useState(false);
  const [registroIdRechazar, setRegistroIdRechazar] = useState<number | null>(
    null
  );
  const [comentarioRechazo, setComentarioRechazo] = useState("");
  const [errorComentario, setErrorComentario] = useState("");

  const fetchRegistros = useCallback(async () => {
    if (!fechaInicio || !fechaFin) {
      setRegistros([]);
      return;
    }
    setLoading(true);
    const start = Date.now();
    try {
      const days: string[] = [];
      // Parsear fechas YYYY-MM-DD en zona horaria local
      const parseLocalDate = (ymd: string): Date => {
        const [year, month, day] = ymd.split("-").map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      };

      const cursor = parseLocalDate(fechaInicio);
      const endLocal = parseLocalDate(fechaFin);

      while (cursor.getTime() <= endLocal.getTime()) {
        const ymd = ymdInTZ(cursor);
        if (ymd) days.push(ymd);
        cursor.setDate(cursor.getDate() + 1);
      }

      const results = await Promise.all(
        days.map((fecha) => RegistroDiarioService.getByDate(fecha, empleadoId))
      );

      // Construir lista alineada a todas las fechas del período
      const registrosByFecha = new Map<string, RegistroDiarioData | null>();
      results.forEach((r, i) => {
        const key = days[i];
        registrosByFecha.set(key, r);
      });

      const aligned: RegistroDiarioData[] = days
        .map((fecha) => {
          const r = registrosByFecha.get(fecha);
          if (r) return r as RegistroDiarioData;
          // Placeholder sin información
          return {
            id: undefined as any,
            fecha,
            horaEntrada: "",
            horaSalida: "",
            jornada: "D",
            esDiaLibre: false,
            esHoraCorrida: false,
            comentarioEmpleado: "",
            actividades: [],
            aprobacionSupervisor: undefined,
            aprobacionRrhh: undefined,
          } as any as RegistroDiarioData;
        })
        .filter((r) => r.id); // Solo mostrar días con registro

      setRegistros(aligned);
    } catch (err) {
      console.error("Error fetching registros:", err);
      setSnackbar({
        open: true,
        message: "Error al cargar registros",
        severity: "error",
      });
    } finally {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, 1000 - elapsed);
      setTimeout(() => setLoading(false), wait);
    }
  }, [fechaInicio, fechaFin, empleadoId]);

  useEffect(() => {
    if (open) {
      fetchRegistros();
    }
  }, [open, fetchRegistros]);

  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const handleRechazar = (id: number) => {
    setRegistroIdRechazar(id);
    setComentarioRechazo("");
    setErrorComentario("");
    setRechazoDialogOpen(true);
  };

  const handleCloseRechazoDialog = () => {
    setRechazoDialogOpen(false);
    setRegistroIdRechazar(null);
    setComentarioRechazo("");
    setErrorComentario("");
  };

  const handleConfirmarRechazo = () => {
    if (!comentarioRechazo.trim()) {
      setErrorComentario("El comentario es obligatorio");
      return;
    }

    if (!registroIdRechazar) return;

    RegistroDiarioService.aprobarRrhh(
      registroIdRechazar,
      false,
      undefined,
      comentarioRechazo.trim()
    )
      .then(() => {
        setSnackbar({
          open: true,
          message: "Registro rechazado por RRHH",
          severity: "success",
        });
        fetchRegistros();
        handleCloseRechazoDialog();
      })
      .catch((err) => {
        console.error("Reject error:", err);
        setSnackbar({
          open: true,
          message: "Error al rechazar",
          severity: "error",
        });
      });
  };

  const TZ = "America/Tegucigalpa";
  const parseHNT = (dateString?: string): Date | null => {
    if (!dateString) return null;
    const hasTZ = /Z$|[+\-]\d{2}:?\d{2}$/i.test(dateString);
    const iso = hasTZ
      ? dateString
      : `${dateString}${dateString.includes("T") ? "" : "T00:00:00"}-06:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };
  const formatTimeCorrectly = (dateString: string) => {
    if (!dateString) return "-";
    const localDate = parseHNT(dateString);
    if (!localDate) return "-";
    return new Intl.DateTimeFormat("es-HN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TZ,
    }).format(localDate);
  };

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

    return `${dayName} ${day} de ${month} del ${year}`;
  };

  const calcularHorasNormales = (registro: RegistroDiarioData): number => {
    if (registro.esDiaLibre) return 0;
    const entrada = parseHNT(registro.horaEntrada);
    const salida = parseHNT(registro.horaSalida);
    if (!entrada || !salida) return 0;

    const entradaMin = entrada.getHours() * 60 + entrada.getMinutes();
    let salidaMin = salida.getHours() * 60 + salida.getMinutes();

    if (entradaMin === salidaMin) return 0;
    if (entradaMin > salidaMin) {
      salidaMin += 24 * 60;
    }

    const horasTrabajo = (salidaMin - entradaMin) / 60;
    const horaAlmuerzo = registro.esHoraCorrida ? 0 : 1;

    return Math.max(0, horasTrabajo - horaAlmuerzo);
  };

  const validarHorasExtra = (
    registro: RegistroDiarioData
  ): { valido: boolean; errores: string[] } => {
    if (registro.esDiaLibre) return { valido: true, errores: [] };

    const errores: string[] = [];
    const actividadesExtra =
      registro.actividades?.filter((a) => a.esExtra) || [];

    if (actividadesExtra.length === 0) return { valido: true, errores: [] };

    const entrada = parseHNT(registro.horaEntrada);
    const salida = parseHNT(registro.horaSalida);
    if (!entrada || !salida) return { valido: true, errores: [] };

    const entradaMin = entrada.getHours() * 60 + entrada.getMinutes();
    let salidaMin = salida.getHours() * 60 + salida.getMinutes();
    if (entradaMin > salidaMin) salidaMin += 24 * 60;

    // Si entrada === salida, no hay horario laboral, no validar traslape
    const hayHorarioLaboral = entradaMin !== salidaMin;

    for (const act of actividadesExtra) {
      if (!act.horaInicio || !act.horaFin) {
        errores.push(
          `Actividad extra "${act.descripcion}" no tiene horas de inicio/fin`
        );
        continue;
      }

      const inicio = parseHNT(act.horaInicio);
      const fin = parseHNT(act.horaFin);
      if (!inicio || !fin) {
        errores.push(
          `Actividad extra "${act.descripcion}" tiene horas inválidas`
        );
        continue;
      }

      const inicioMin = inicio.getHours() * 60 + inicio.getMinutes();
      let finMin = fin.getHours() * 60 + fin.getMinutes();
      if (finMin <= inicioMin) finMin += 24 * 60;
      // Validar que la duración coincide con diferencia de tiempos
      const duracionCalculada = (finMin - inicioMin) / 60;
      if (Math.abs(act.duracionHoras - duracionCalculada) > 0.01) {
        errores.push(
          `Actividad extra "${
            act.descripcion
          }" debe durar ${duracionCalculada.toFixed(2)}h (fin - inicio)`
        );
      }

      // Solo validar traslape con horario laboral si existe horario laboral
      if (hayHorarioLaboral) {
        const estaFuera = finMin <= entradaMin || inicioMin >= salidaMin;
        if (!estaFuera) {
          errores.push(
            `Actividad extra "${act.descripcion}" se traslapa con el horario laboral`
          );
        }
      }
    }

    return { valido: errores.length === 0, errores };
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Construir el HTML del documento
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Registros Diarios - ${fechaInicio} a ${fechaFin}</title>
          <style>
            @media print {
              @page {
                margin: 0.3cm;
                margin-top: 1.2cm;
              }
              @page:first {
                margin-top: 0.3cm;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .dia-container:first-of-type {
                margin-top: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 8pt;
              margin: 10px;
            }
            h1 {
              font-size: 14pt;
              margin-bottom: 5px;
              text-align: center;
            }
            .header-info {
              text-align: center;
              margin-bottom: 10px;
              font-size: 8pt;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
              page-break-inside: auto;
            }
            thead {
              display: table-header-group;
            }
            tbody {
              display: table-row-group;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 3px 4px;
              text-align: left;
              font-size: 7pt;
              line-height: 1.2;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .fecha-header {
              background-color: #e3f2fd;
              font-weight: bold;
              font-size: 9pt;
              padding: 4px;
            }
            .dia-libre {
              background-color: #fff3e0;
            }
            .actividad-normal {
              background-color: #ffffff;
            }
            .actividad-extra {
              background-color: #ffebee;
            }
            .libre-texto {
              color: #f44336;
              font-weight: bold;
            }
            .actividad-compensatoria {
              background-color: #f3e5f5;
            }
            .job-especial {
              color: #d32f2f;
              font-weight: bold;
            }
            .chip {
              display: inline-block;
              padding: 1px 4px;
              border-radius: 3px;
              font-size: 7pt;
              margin: 1px;
            }
            .chip-info {
              background-color: #2196f3;
              color: white;
            }
            .chip-warning {
              background-color: #ff9800;
              color: white;
            }
            .chip-error {
              background-color: #f44336;
              color: white;
            }
            .chip-success {
              background-color: #4caf50;
              color: white;
            }
            .chip-primary {
              background-color: #616161;
              color: white;
            }
            .resumen {
              margin-top: 4px;
              margin-bottom: 4px;
              padding: 4px 6px;
              background-color: #f5f5f5;
              border-radius: 3px;
              font-size: 7pt;
            }
            .errores {
              margin-top: 4px;
              margin-bottom: 4px;
              padding: 4px 6px;
              background-color: #ffebee;
              border-left: 3px solid #f44336;
              font-size: 7pt;
            }
            .no-actividades {
              text-align: center;
              padding: 8px;
              color: #666;
              font-style: italic;
              font-size: 7pt;
            }
            .comentario {
              margin-top: 4px;
              margin-bottom: 4px;
              padding: 4px 6px;
              background-color: #e8f5e9;
              border-radius: 3px;
              font-size: 7pt;
            }
            .dia-container {
              margin-bottom: 10px;
              padding: 6px;
              border: 1px solid #999;
              border-radius: 3px;
              background-color: #ffffff;
              page-break-inside: avoid;
            }
            .label-hora-corrida {
              color: #ff9800;
              font-weight: bold;
            }
            .label-noche {
              color: #2196f3;
              font-weight: bold;
            }
            .label-libre-feriado {
              color: #f44336;
              font-weight: bold;
            }
            .check-verde {
              color: #4caf50;
            }
            .texto-aprobado {
              color: #000000;
            }
          </style>
        </head>
        <body>
          <h1>${nombreEmpleado || "Registros Diarios del Período"}</h1>
          <div class="header-info">
            <p><strong>Período:</strong> ${formatDateInSpanish(
              fechaInicio
            )} - ${formatDateInSpanish(fechaFin)}</p>
            <p><strong>Total de días:</strong> ${registros.length}</p>
          </div>
    `;

    // Procesar cada registro
    registros.forEach((registro) => {
      const normales =
        registro.actividades
          ?.filter((a) => !a.esExtra)
          .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
      const extras =
        registro.actividades
          ?.filter((a) => a.esExtra && !a.esCompensatorio)
          .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
      const total = normales + extras;

      const horasNormalesEsperadas = calcularHorasNormales(registro);
      const validacionHorasExtra = validarHorasExtra(registro);
      const validacionHorasNormales =
        horasNormalesEsperadas === 0
          ? normales === 0
          : Math.abs(normales - horasNormalesEsperadas) < 0.1;
      const validacionIncapacidad =
        registro.esIncapacidad === true ? normales === 0 && extras === 0 : true;

      const entradaHM = formatTimeCorrectly(registro.horaEntrada);
      const salidaHM = formatTimeCorrectly(registro.horaSalida);
      const [eh, em] = entradaHM.split(":").map(Number);
      const [sh, sm] = salidaHM.split(":").map(Number);
      const entradaMin = eh * 60 + em;
      const salidaMin = sh * 60 + sm;
      const esTurnoNocturno = salidaMin < entradaMin;

      // Ordenar actividades (mismo código que en el render)
      const toMinutes = (d?: string) => {
        if (!d) return Number.POSITIVE_INFINITY;
        const dt = parseHNT(d);
        if (!dt) return Number.POSITIVE_INFINITY;
        return dt.getHours() * 60 + dt.getMinutes();
      };
      const entradaMinLocal =
        (parseHNT(registro.horaEntrada)?.getHours() ?? 0) * 60 +
        (parseHNT(registro.horaEntrada)?.getMinutes() ?? 0);
      const salidaMinLocal =
        (parseHNT(registro.horaSalida)?.getHours() ?? 0) * 60 +
        (parseHNT(registro.horaSalida)?.getMinutes() ?? 0);
      const entradaLin = entradaMinLocal;
      const salidaLin =
        salidaMinLocal < entradaMinLocal
          ? salidaMinLocal + 1440
          : salidaMinLocal;
      const linearize = (min: number) =>
        esTurnoNocturno && min < entradaMinLocal ? min + 1440 : min;
      const activities = (registro.actividades ?? []).slice();
      const extraBefore: any[] = [];
      const middle: any[] = [];
      const extraAfter: any[] = [];
      for (const act of activities) {
        const startMin = toMinutes(act.horaInicio);
        const startLin = Number.isFinite(startMin)
          ? linearize(startMin)
          : Number.POSITIVE_INFINITY;
        const item = { act, startLin, startMin } as any;
        if (act.esExtra === true && startLin < entradaLin) {
          extraBefore.push(item);
        } else if (act.esExtra === true && startLin >= salidaLin) {
          extraAfter.push(item);
        } else {
          middle.push(item);
        }
      }
      const cmpAsc = (a: any, b: any) =>
        (a.startMin ?? a.startLin) - (b.startMin ?? b.startLin);
      extraBefore.sort(cmpAsc);
      middle.sort(cmpAsc);
      extraAfter.sort(cmpAsc);

      // Solo rellenar tiempo Libre ANTES de entrada y DESPUES de salida
      const toEndLin = (act: any): number => {
        if (!act?.horaFin) return Number.POSITIVE_INFINITY;
        return linearize(toMinutes(act.horaFin));
      };
      const extraBeforeWithGaps: any[] = [...extraBefore];
      if (extraBeforeWithGaps.length > 0) {
        const last = extraBeforeWithGaps[extraBeforeWithGaps.length - 1];
        const lastEnd = toEndLin(last.act);
        if (lastEnd < entradaLin) {
          extraBeforeWithGaps.push({
            act: {
              id: `gap-${lastEnd}-${entradaLin}-${registro.id}`,
              descripcion: "Libre",
              duracionHoras:
                Math.round(((entradaLin - lastEnd) / 60) * 100) / 100,
              _synthetic: "Libre",
              esExtra: true,
            },
            startLin: lastEnd,
          });
        }
      }
      const extraAfterWithGaps: any[] = [...extraAfter];
      if (extraAfterWithGaps.length > 0) {
        const first = extraAfterWithGaps[0];
        if (salidaLin < first.startLin) {
          extraAfterWithGaps.unshift({
            act: {
              id: `gap-${salidaLin}-${first.startLin}-${registro.id}`,
              descripcion: "Libre",
              duracionHoras:
                Math.round(((first.startLin - salidaLin) / 60) * 100) / 100,
              _synthetic: "Libre",
              esExtra: true,
            },
            startLin: salidaLin,
          });
        }
      }
      // Construir lista final según exista o no bloque normal
      let actividadesOrdenadas: any[];
      if (horasNormalesEsperadas === 0) {
        // Día sin horas normales (entrada = salida):
        // mostrar TODAS las actividades (incluyendo normales si existen, para que se vean en la validación)
        // y los intervalos LIBRE entre extras a lo largo del día
        const toEndLin = (act: any): number => {
          if (!act?.horaFin) return Number.POSITIVE_INFINITY;
          return linearize(toMinutes(act.horaFin));
        };
        const extrasAll: any[] = [...extraBefore, ...extraAfter]
          .slice()
          .sort((a, b) => a.startLin - b.startLin);
        const withGaps: any[] = [];
        for (let i = 0; i < extrasAll.length; i++) {
          const curr = extrasAll[i];
          if (i > 0) {
            const prev = extrasAll[i - 1];
            const prevEnd = toEndLin(prev.act);
            const gapStart = prevEnd;
            const gapEnd = curr.startLin;
            if (gapEnd - gapStart > 1) {
              withGaps.push({
                act: {
                  id: `gap-${gapStart}-${gapEnd}-${registro.id}`,
                  descripcion: "Libre",
                  duracionHoras:
                    Math.round(((gapEnd - gapStart) / 60) * 100) / 100,
                  _synthetic: "Libre",
                  esExtra: true,
                },
                startLin: gapStart,
              });
            }
          }
          withGaps.push(curr);
        }
        // Incluir también las actividades normales (middle) para que se vean aunque no deberían existir
        actividadesOrdenadas = [...withGaps, ...middle].map((x) => x.act);
      } else {
        actividadesOrdenadas = [
          ...extraBeforeWithGaps,
          ...middle,
          ...extraAfterWithGaps,
        ].map((x) => x.act);
      }

      // Determinar si es feriado (horasFeriado > 0 o entrada === salida === 07:00)
      const esFeriado =
        (registro.horasFeriado && registro.horasFeriado > 0) ||
        (entradaHM === "07:00" &&
          salidaHM === "07:00" &&
          !registro.esDiaLibre &&
          horasNormalesEsperadas === 0);

      // Construir HTML del registro
      htmlContent += `
        <div class="dia-container">
          <table>
            <thead>
              <tr class="fecha-header ${
                registro.esDiaLibre ? "dia-libre" : ""
              }">
                <th colspan="8">
                  ${formatDateInSpanish(registro.fecha || "")}
                  ${
                    registro.esDiaLibre
                      ? ` <span class="label-libre-feriado">- DÍA LIBRE</span>`
                      : ""
                  }
                  ${
                    esFeriado && !registro.esDiaLibre
                      ? ` <span class="label-libre-feriado">- FERIADO</span>`
                      : ""
                  }
                  ${
                    !registro.esDiaLibre
                      ? ` | Entrada: ${entradaHM} | Salida: ${salidaHM}`
                      : ""
                  }
                  ${
                    registro.esHoraCorrida
                      ? ` | <span class="label-hora-corrida">Hora Corrida</span>`
                      : ""
                  }
                  ${registro.esIncapacidad ? " | INCAPACIDAD" : ""}
                  ${
                    esTurnoNocturno || registro.jornada === "N"
                      ? ` | <span class="label-noche">NOCHE</span>`
                      : ""
                  }
                  ${
                    registro.aprobacionSupervisor === true
                      ? ` | <span class="check-verde">✓</span> <span class="texto-aprobado">Aprobado Supervisor</span>`
                      : ""
                  }
                  ${
                    registro.aprobacionSupervisor === false
                      ? " | ✗ Rechazado Supervisor"
                      : ""
                  }
                  ${
                    registro.aprobacionRrhh === true
                      ? " | ✓ Procesado RRHH"
                      : ""
                  }
                  ${
                    registro.aprobacionRrhh === false
                      ? " | ✗ Rechazado RRHH"
                      : ""
                  }
                </th>
              </tr>
              <tr>
                <th>Descripción</th>
                <th>Horas</th>
                <th>Horario</th>
                <th>Job</th>
                <th>Código</th>
                <th>Tipo</th>
                <th>Clase</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (actividadesOrdenadas.length === 0) {
        htmlContent += `
          <tr>
            <td colspan="8" class="no-actividades">No hay actividades registradas para este día</td>
          </tr>
        `;
      } else {
        actividadesOrdenadas.forEach((act: any) => {
          const isSynthetic = Boolean(act?._synthetic);
          const isLibre = isSynthetic && act._synthetic === "Libre";

          // Si es "Libre", mostrar solo el texto sin columnas adicionales
          if (isLibre) {
            htmlContent += `
              <tr>
                <td colspan="8" class="libre-texto" style="text-align: center;">
                  ${act.descripcion || "Libre"}
                </td>
              </tr>
            `;
            return;
          }

          const isSpecial = (act?.job?.codigo || "").startsWith("E");
          const rowClass = isSynthetic
            ? "actividad-normal"
            : act.esExtra
            ? act.esCompensatorio
              ? "actividad-compensatoria"
              : "actividad-extra"
            : "actividad-normal";

          htmlContent += `
            <tr class="${rowClass}">
              <td>${act.descripcion || "-"}</td>
              <td>${
                Number.isFinite(Number(act.duracionHoras))
                  ? `${act.duracionHoras}h`
                  : "-"
              }</td>
              <td>${
                act.horaInicio && act.horaFin
                  ? `${formatTimeCorrectly(
                      act.horaInicio
                    )} - ${formatTimeCorrectly(act.horaFin)}`
                  : "-"
              }</td>
              <td class="${isSpecial ? "job-especial" : ""}">${
            act.esCompensatorio === true && act.esExtra === false
              ? "-"
              : act.job?.nombre ?? "-"
          }</td>
              <td class="${isSpecial ? "job-especial" : ""}">${
            act.esCompensatorio === true && act.esExtra === false
              ? "-"
              : act.job?.codigo ?? "-"
          }</td>
              <td>
                ${
                  isSynthetic
                    ? `<span class="chip chip-warning">${act._synthetic}</span>`
                    : `<span class="chip ${
                        act.esCompensatorio === true
                          ? act.esExtra === true
                            ? "chip-success"
                            : "chip-warning"
                          : act.esExtra === true
                          ? "chip-error"
                          : "chip-primary"
                      }">${
                        act.esCompensatorio === true
                          ? act.esExtra === true
                            ? "Pago Compensatoria"
                            : "Toma Compensatoria"
                          : act.esExtra === true
                          ? "Extra"
                          : "Normal"
                      }</span>`
                }
              </td>
              <td>${act.className || "-"}</td>
              <td>${isSpecial ? "Job Especial" : ""}</td>
            </tr>
          `;
        });
      }

      htmlContent += `
          </tbody>
        </table>
      `;

      // Resumen de horas
      if (!registro.esDiaLibre) {
        htmlContent += `
          <div class="resumen">
            <strong>Resumen:</strong> Normales: ${normales}h (esperadas: ${horasNormalesEsperadas.toFixed(
          2
        )}h)
            ${extras > 0 ? `| Extras: ${extras}h` : ""}
            | Total: ${total}h
          </div>
        `;
      }

      // Comentario del empleado
      if (registro.comentarioEmpleado) {
        htmlContent += `
          <div class="comentario">
            <strong>Comentario:</strong> ${registro.comentarioEmpleado}
          </div>
        `;
      }

      // Errores de validación
      if (
        registro.id &&
        (!validacionHorasNormales ||
          !validacionHorasExtra.valido ||
          !validacionIncapacidad)
      ) {
        htmlContent += `
          <div class="errores">
            <strong>⚠️ Errores:</strong>
        `;

        if (!validacionIncapacidad) {
          htmlContent += `
            🏥 Incapacidad: ${normales > 0 ? `${normales}h normales` : ""} ${
            normales > 0 && extras > 0 ? "y " : ""
          } ${extras > 0 ? `${extras}h extras` : ""}. `;
        }

        if (!validacionHorasNormales && horasNormalesEsperadas > 0) {
          htmlContent += `
            📊 Normales: ${normales}h vs ${horasNormalesEsperadas.toFixed(
            2
          )}h esperadas. `;
        }

        if (
          !validacionHorasNormales &&
          horasNormalesEsperadas === 0 &&
          normales > 0
        ) {
          htmlContent += `
            📊 No debería haber horas normales (entrada = salida). `;
        }

        if (!validacionHorasExtra.valido) {
          htmlContent += `
            🕐 Horas extra: `;
          validacionHorasExtra.errores.forEach((error, idx) => {
            htmlContent += `${idx > 0 ? "; " : ""}${error}`;
          });
        }

        htmlContent += `</div>`;
      }

      htmlContent += `</div>`;
    });

    htmlContent += `
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          ...(isMobile && {
            height: "100vh",
            maxHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }),
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Registros Diarios del Período</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: { xs: 2, md: 3 },
          pr: { xs: 1, md: 2 },
          backgroundColor: (theme) =>
            theme.palette.mode === "light"
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          // asegurar que no haya bordes internos
          borderTop: "none",
          borderBottom: "none",
          // En móvil, usar flexbox para ocupar todo el espacio disponible
          display: "flex",
          flexDirection: "column",
          ...(isMobile && {
            flex: 1,
            minHeight: 0, // Necesario para que el flex funcione correctamente
          }),
        }}
      >
        {loading && (
          <Box sx={{ position: "sticky", top: -24, zIndex: 1 }}>
            <LinearProgress />
          </Box>
        )}

        <Box
          sx={{
            maxHeight: { xs: "none", md: "70vh" },
            height: { xs: "100%", md: "auto" },
            overflowY: "auto",
            pr: { xs: 0.5, md: 1 },
            flex: { xs: 1, md: "none" },
            minHeight: 0, // Necesario para que el scroll funcione en flexbox
          }}
        >
          <Stack spacing={2} sx={{ pt: 1.5, pb: 1.5 }}>
            {registros.map((registro, idx) => {
              const normales =
                registro.actividades
                  ?.filter((a) => !a.esExtra)
                  .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
              const extras =
                registro.actividades
                  ?.filter((a) => a.esExtra && !a.esCompensatorio)
                  .reduce((s, a) => s + a.duracionHoras, 0) ?? 0;
              const total = normales + extras;

              const horasNormalesEsperadas = calcularHorasNormales(registro);
              const validacionHorasExtra = validarHorasExtra(registro);
              // Si no hay horas normales esperadas, solo validar que no haya horas normales registradas
              const validacionHorasNormales =
                horasNormalesEsperadas === 0
                  ? normales === 0
                  : Math.abs(normales - horasNormalesEsperadas) < 0.1;

              // Validación de incapacidad: no puede haber horas laborables
              const validacionIncapacidad =
                registro.esIncapacidad === true
                  ? normales === 0 && extras === 0
                  : true;

              const entradaHM = formatTimeCorrectly(registro.horaEntrada);
              const salidaHM = formatTimeCorrectly(registro.horaSalida);
              const [eh, em] = entradaHM.split(":").map(Number);
              const [sh, sm] = salidaHM.split(":").map(Number);
              const entradaMin = eh * 60 + em;
              const salidaMin = sh * 60 + sm;
              const esTurnoNocturno = salidaMin < entradaMin;

              // Ordenar actividades: extras antes de entrada, luego medio, luego extras después de salida. Dentro de cada grupo por hora de inicio asc.
              const toMinutes = (d?: string) => {
                if (!d) return Number.POSITIVE_INFINITY;
                const dt = parseHNT(d);
                if (!dt) return Number.POSITIVE_INFINITY;
                return dt.getHours() * 60 + dt.getMinutes();
              };
              const entradaMinLocal =
                (parseHNT(registro.horaEntrada)?.getHours() ?? 0) * 60 +
                (parseHNT(registro.horaEntrada)?.getMinutes() ?? 0);
              const salidaMinLocal =
                (parseHNT(registro.horaSalida)?.getHours() ?? 0) * 60 +
                (parseHNT(registro.horaSalida)?.getMinutes() ?? 0);
              const entradaLin = entradaMinLocal;
              const salidaLin =
                salidaMinLocal < entradaMinLocal
                  ? salidaMinLocal + 1440
                  : salidaMinLocal;
              const linearize = (min: number) =>
                esTurnoNocturno && min < entradaMinLocal ? min + 1440 : min;
              const activities = (registro.actividades ?? []).slice();
              const extraBefore: any[] = [];
              const middle: any[] = [];
              const extraAfter: any[] = [];
              for (const act of activities) {
                const startMin = toMinutes(act.horaInicio);
                const startLin = Number.isFinite(startMin)
                  ? linearize(startMin)
                  : Number.POSITIVE_INFINITY;
                const item = { act, startLin, startMin } as any;
                if (act.esExtra === true && startLin < entradaLin) {
                  extraBefore.push(item);
                } else if (act.esExtra === true && startLin >= salidaLin) {
                  extraAfter.push(item);
                } else {
                  middle.push(item);
                }
              }
              const cmpAsc = (a: any, b: any) =>
                (a.startMin ?? a.startLin) - (b.startMin ?? b.startLin);
              extraBefore.sort(cmpAsc);
              middle.sort(cmpAsc);
              extraAfter.sort(cmpAsc);

              // Solo rellenar tiempo Libre ANTES de entrada y DESPUES de salida
              const toEndLin = (act: any): number => {
                if (!act?.horaFin) return Number.POSITIVE_INFINITY;
                return linearize(toMinutes(act.horaFin));
              };
              const extraBeforeWithGaps: any[] = [...extraBefore];
              if (extraBeforeWithGaps.length > 0) {
                const last =
                  extraBeforeWithGaps[extraBeforeWithGaps.length - 1];
                const lastEnd = toEndLin(last.act);
                if (lastEnd < entradaLin) {
                  extraBeforeWithGaps.push({
                    act: {
                      id: `gap-${lastEnd}-${entradaLin}-${registro.id}`,
                      descripcion: "Libre",
                      duracionHoras:
                        Math.round(((entradaLin - lastEnd) / 60) * 100) / 100,
                      _synthetic: "Libre",
                      esExtra: true,
                    },
                    startLin: lastEnd,
                  });
                }
              }
              const extraAfterWithGaps: any[] = [...extraAfter];
              if (extraAfterWithGaps.length > 0) {
                const first = extraAfterWithGaps[0];
                if (salidaLin < first.startLin) {
                  extraAfterWithGaps.unshift({
                    act: {
                      id: `gap-${salidaLin}-${first.startLin}-${registro.id}`,
                      descripcion: "Libre",
                      duracionHoras:
                        Math.round(((first.startLin - salidaLin) / 60) * 100) /
                        100,
                      _synthetic: "Libre",
                      esExtra: true,
                    },
                    startLin: salidaLin,
                  });
                }
              }
              // Construir lista final según exista o no bloque normal
              let actividadesOrdenadas: any[];
              if (horasNormalesEsperadas === 0) {
                // Día sin horas normales (entrada = salida):
                // mostrar TODAS las actividades (incluyendo normales si existen, para que se vean en la validación)
                // y los intervalos LIBRE entre extras a lo largo del día
                const toEndLin = (act: any): number => {
                  if (!act?.horaFin) return Number.POSITIVE_INFINITY;
                  return linearize(toMinutes(act.horaFin));
                };
                const extrasAll: any[] = [...extraBefore, ...extraAfter]
                  .slice()
                  .sort((a, b) => a.startLin - b.startLin);
                const withGaps: any[] = [];
                for (let i = 0; i < extrasAll.length; i++) {
                  const curr = extrasAll[i];
                  if (i > 0) {
                    const prev = extrasAll[i - 1];
                    const prevEnd = toEndLin(prev.act);
                    const gapStart = prevEnd;
                    const gapEnd = curr.startLin;
                    if (gapEnd - gapStart > 1) {
                      withGaps.push({
                        act: {
                          id: `gap-${gapStart}-${gapEnd}-${registro.id}`,
                          descripcion: "Libre",
                          duracionHoras:
                            Math.round(((gapEnd - gapStart) / 60) * 100) / 100,
                          _synthetic: "Libre",
                          esExtra: true,
                        },
                        startLin: gapStart,
                      });
                    }
                  }
                  withGaps.push(curr);
                }
                // Incluir también las actividades normales (middle) para que se vean aunque no deberían existir
                actividadesOrdenadas = [...withGaps, ...middle].map(
                  (x) => x.act
                );
              } else {
                actividadesOrdenadas = [
                  ...extraBeforeWithGaps,
                  ...middle,
                  ...extraAfterWithGaps,
                ].map((x) => x.act);
              }

              return (
                <Grow
                  key={registro.id!}
                  in={!loading}
                  timeout={300 + idx * 100}
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 2, md: 3 },
                      borderRadius: 2,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: (theme) =>
                        theme.palette.mode === "light"
                          ? theme.palette.grey[300]
                          : theme.palette.grey[700],
                      backgroundColor: (theme) =>
                        theme.palette.background.paper,
                    }}
                  >
                    {/* Encabezado del día */}
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={{ xs: 1, md: 4 }}
                      alignItems={{ xs: "flex-start", md: "center" }}
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle1">
                        {registro.fecha
                          ? formatDateInSpanish(registro.fecha)
                          : "Fecha no disponible"}
                      </Typography>
                      {!registro.esDiaLibre && (
                        <>
                          <Typography variant="body2">
                            Entrada: {formatTimeCorrectly(registro.horaEntrada)}
                          </Typography>
                          <Typography variant="body2">
                            Salida: {formatTimeCorrectly(registro.horaSalida)}
                          </Typography>
                        </>
                      )}
                      <Box sx={{ flexGrow: 1 }} />
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        {registro.esDiaLibre && (
                          <Chip label="Día libre" color="info" size="small" />
                        )}
                        {!registro.esDiaLibre && registro.esHoraCorrida && (
                          <Chip
                            label="Hora Corrida"
                            color="warning"
                            size="small"
                          />
                        )}
                        {registro.esIncapacidad && (
                          <Chip
                            label="Incapacidad"
                            color="error"
                            size="small"
                          />
                        )}
                        {!registro.esDiaLibre &&
                          (esTurnoNocturno || registro.jornada === "N") && (
                            <Chip
                              icon={<DarkModeIcon />}
                              label="Noche"
                              color="primary"
                              size="small"
                            />
                          )}
                      </Stack>
                      {/* Indicadores de aprobación */}
                      {registro.aprobacionSupervisor === true && (
                        <Chip
                          label="Aprobado por supervisor"
                          color="success"
                          variant="outlined"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {registro.aprobacionSupervisor === false && (
                        <Chip
                          label="Rechazado por supervisor"
                          color="error"
                          variant="outlined"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {registro.aprobacionRrhh === true && (
                        <Chip
                          label="Procesado"
                          color="primary"
                          variant="outlined"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {registro.aprobacionRrhh === false && (
                        <Chip
                          label="Rechazado RRHH"
                          color="error"
                          variant="outlined"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Stack>

                    {registro.comentarioEmpleado && (
                      <Typography
                        variant="body2"
                        color="black"
                        sx={{ mb: 2, fontWeight: "bold" }}
                      >
                        {registro.comentarioEmpleado}
                      </Typography>
                    )}

                    {/* Actividades */}
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Actividades
                    </Typography>

                    {registro.actividades && registro.actividades.length > 0 ? (
                      <TableContainer
                        sx={{
                          overflowX: "auto",
                          maxWidth: "100%",
                        }}
                      >
                        <Table size="small" sx={{ minWidth: 600 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{
                                  minWidth: { xs: 120, sm: 150 },
                                }}
                              >
                                Descripción
                              </TableCell>
                              <TableCell
                                sx={{
                                  minWidth: { xs: 60, sm: 80 },
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Horas
                              </TableCell>
                              <TableCell
                                sx={{
                                  minWidth: { xs: 100, sm: 120 },
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Horario
                              </TableCell>
                              <TableCell
                                sx={{
                                  minWidth: { xs: 100, sm: 120 },
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Job
                              </TableCell>
                              <TableCell
                                sx={{
                                  minWidth: { xs: 80, sm: 100 },
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Código
                              </TableCell>
                              <TableCell
                                sx={{
                                  minWidth: { xs: 100, sm: 120 },
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Tipo
                              </TableCell>
                              <TableCell
                                sx={{
                                  minWidth: { xs: 80, sm: 100 },
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Clase
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {actividadesOrdenadas.map((act: any) => {
                              const isSynthetic = Boolean(act?._synthetic);
                              const isSpecial = (
                                act?.job?.codigo || ""
                              ).startsWith("E");
                              if (isSynthetic) {
                                return (
                                  <TableRow key={act.id ?? act.jobId}>
                                    <TableCell colSpan={7} align="center">
                                      <Typography sx={{ color: "error.main" }}>
                                        {act.descripcion}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                );
                              }
                              return (
                                <TableRow key={act.id ?? act.jobId}>
                                  <TableCell
                                    sx={{
                                      maxWidth: { xs: 150, sm: 250 },
                                      wordWrap: "break-word",
                                      whiteSpace: "normal",
                                    }}
                                  >
                                    {act.descripcion}
                                  </TableCell>
                                  <TableCell>
                                    {Number.isFinite(
                                      Number(act.duracionHoras)
                                    ) ? (
                                      <Chip
                                        label={`${act.duracionHoras}h`}
                                        size="small"
                                      />
                                    ) : (
                                      <Chip
                                        label={`-`}
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    {act.horaInicio && act.horaFin
                                      ? `${formatTimeCorrectly(
                                          act.horaInicio
                                        )} - ${formatTimeCorrectly(
                                          act.horaFin
                                        )}`
                                      : "-"}
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      maxWidth: { xs: 120, sm: 180 },
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {act.esCompensatorio === true &&
                                    act.esExtra === false ? (
                                      <Typography color="text.secondary">
                                        -
                                      </Typography>
                                    ) : (
                                      <Tooltip
                                        title={act.job?.nombre ?? "-"}
                                        arrow
                                        placement="top"
                                      >
                                        <Typography
                                          color={
                                            isSpecial ? "error.main" : undefined
                                          }
                                          noWrap
                                          sx={{
                                            cursor: "help",
                                          }}
                                        >
                                          {act.job?.nombre ?? "-"}
                                        </Typography>
                                      </Tooltip>
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    {act.esCompensatorio === true &&
                                    act.esExtra === false ? (
                                      <Typography color="text.secondary">
                                        -
                                      </Typography>
                                    ) : (
                                      <Typography
                                        color={
                                          isSpecial ? "error.main" : undefined
                                        }
                                      >
                                        {act.job?.codigo ?? "-"}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={
                                        act.esCompensatorio === true
                                          ? act.esExtra === true
                                            ? "Pago Compensatoria"
                                            : "Toma Compensatoria"
                                          : act.esExtra === true
                                          ? "Extra"
                                          : "Normal"
                                      }
                                      size="small"
                                      color={
                                        act.esCompensatorio === true
                                          ? act.esExtra === true
                                            ? "success"
                                            : "warning"
                                          : act.esExtra === true
                                          ? "error"
                                          : "default"
                                      }
                                    />
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      maxWidth: { xs: 80, sm: 120 },
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {act.className || "-"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">
                        No hay actividades registradas para este día
                      </Alert>
                    )}

                    {/* Validaciones */}
                    {registro.id &&
                      (validacionHorasNormales === false ||
                        !validacionHorasExtra.valido ||
                        !validacionIncapacidad) && (
                        <Box sx={{ mt: 2, mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            color="error.main"
                            gutterBottom
                            sx={{ fontWeight: "bold" }}
                          >
                            ⚠️ Errores de validación encontrados
                          </Typography>

                          {!validacionIncapacidad && (
                            <Typography
                              variant="body2"
                              color="error.main"
                              sx={{ mb: 1 }}
                            >
                              🏥 No pueden haber horas laborables en día de
                              incapacidad:{" "}
                              {normales > 0 && `${normales}h normales`}
                              {normales > 0 && extras > 0 && " y "}
                              {extras > 0 && `${extras}h extras`}
                            </Typography>
                          )}

                          {!validacionHorasNormales &&
                            horasNormalesEsperadas > 0 && (
                              <Typography
                                variant="body2"
                                color="error.main"
                                sx={{ mb: 1 }}
                              >
                                📊 Horas normales no coinciden: Registradas:{" "}
                                {normales}h | Esperadas:{" "}
                                {horasNormalesEsperadas.toFixed(2)}h
                              </Typography>
                            )}

                          {!validacionHorasNormales &&
                            horasNormalesEsperadas === 0 &&
                            normales > 0 && (
                              <Typography
                                variant="body2"
                                color="error.main"
                                sx={{ mb: 1 }}
                              >
                                📊 No debería haber horas normales registradas
                                (horaEntrada = horaSalida)
                              </Typography>
                            )}

                          {!validacionHorasExtra.valido && (
                            <>
                              <Typography
                                variant="body2"
                                color="error.main"
                                sx={{ mb: 1 }}
                              >
                                🕐 Problemas con horas extra:
                              </Typography>
                              {validacionHorasExtra.errores.map((error, i) => (
                                <Typography
                                  key={i}
                                  variant="body2"
                                  color="error.main"
                                  sx={{ ml: 2, mb: 0.5 }}
                                >
                                  • {error}
                                </Typography>
                              ))}
                            </>
                          )}
                        </Box>
                      )}

                    {/* Resumen de horas */}
                    {!registro.esDiaLibre && (
                      <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Resumen de horas
                        </Typography>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={2}
                          alignItems={{ xs: "flex-start", md: "center" }}
                          sx={{ flexWrap: "wrap" }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              Normales:
                            </Typography>
                            <Chip
                              label={`${normales}h`}
                              size="small"
                              variant="outlined"
                              color={
                                validacionHorasNormales ? "default" : "error"
                              }
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              {`(esperadas: ${horasNormalesEsperadas.toFixed(
                                2
                              )} h)`}
                            </Typography>
                          </Stack>

                          {extras > 0 && (
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Extras:
                              </Typography>
                              <Chip
                                label={`${extras}h`}
                                size="small"
                                color="error"
                                variant="outlined"
                              />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ ml: 1 }}
                              >
                                {!validacionHorasExtra.valido &&
                                  "(con errores)"}
                              </Typography>
                            </Stack>
                          )}

                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              Total:
                            </Typography>
                            <Chip
                              label={`${total}h`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Stack>
                        </Stack>
                      </Box>
                    )}

                    {/* Botón Rechazar */}
                    <Box
                      sx={{
                        mt: 2,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleRechazar(registro.id!)}
                        disabled={registro.aprobacionRrhh === false}
                      >
                        Rechazar Registro
                      </Button>
                    </Box>
                  </Paper>
                </Grow>
              );
            })}

            {!loading && registros.length === 0 && (
              <Alert severity="warning">
                No hay registros para las fechas seleccionadas.
              </Alert>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          startIcon={<PrintIcon />}
          variant="outlined"
          onClick={handlePrint}
          disabled={loading || registros.length === 0}
        >
          Imprimir
        </Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Diálogo de rechazo */}
      <Dialog
        open={rechazoDialogOpen}
        onClose={handleCloseRechazoDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rechazar registro</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Ingrese el motivo de rechazo del registro. Este comentario será
            visible para el empleado.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="Comentario"
            placeholder="Ingrese motivo de rechazo"
            value={comentarioRechazo}
            onChange={(e) => {
              setComentarioRechazo(e.target.value);
              if (errorComentario) setErrorComentario("");
            }}
            error={!!errorComentario}
            helperText={errorComentario}
            required
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3 }}>
          <Button onClick={handleCloseRechazoDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarRechazo}
            color="error"
            variant="contained"
            disabled={!comentarioRechazo.trim()}
          >
            Rechazar registro
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default DetalleRegistrosDiariosModal;
