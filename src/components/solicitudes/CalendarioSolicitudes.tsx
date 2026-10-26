import { useEffect, useRef, useState } from "react";
import {
  Box,
  IconButton,
  Paper,
  Popper,
  TablePagination,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  SolicitudPermisoService,
  solicitudErrorMessage,
  type CalendarioDia,
  type OcupacionDia,
  type Paginated,
} from "../../services/solicitudPermisoService";
import { TIPO_LABEL, formatFecha, nombreEmpleado } from "./solicitudesUi";

const PAGE_SIZE = 10;

function ymd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export default function CalendarioSolicitudes() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [marcas, setMarcas] = useState<Map<string, CalendarioDia>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [fechaAbierta, setFechaAbierta] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [ocupacion, setOcupacion] = useState<Paginated<OcupacionDia> | null>(
    null
  );
  const [ocupacionError, setOcupacionError] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);

  const cancelClose = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      const sobreDetalle = paperRef.current?.matches(":hover") ?? false;
      const sobreDia = anchor?.matches(":hover") ?? false;
      if (sobreDetalle || sobreDia) return;
      setAnchor(null);
      setFechaAbierta(null);
    }, 200);
  };

  const salirHacia = (event: React.MouseEvent, destino: HTMLElement | null) => {
    const next = event.relatedTarget;
    if (next instanceof Node && destino?.contains(next)) return;
    scheduleClose();
  };

  const abrir = (element: HTMLElement, fecha: string) => {
    cancelClose();
    setAnchor(element);
    setFechaAbierta((current) => {
      if (current !== fecha) {
        setPage(1);
        setOcupacion(null);
      }
      return fecha;
    });
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  useEffect(() => {
    let cancelled = false;
    const desde = ymd(days[0]);
    const hasta = ymd(days[days.length - 1]);
    SolicitudPermisoService.calendario(desde, hasta)
      .then((rows) => {
        if (cancelled) return;
        setMarcas(new Map(rows.map((row) => [row.fecha, row])));
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(solicitudErrorMessage(err, "No se pudo cargar el calendario"));
      });
    return () => {
      cancelled = true;
    };
    // days se deriva del mes visible
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  useEffect(() => {
    if (!fechaAbierta) return;
    let cancelled = false;
    SolicitudPermisoService.ocupacionDia(fechaAbierta, page, PAGE_SIZE)
      .then((data) => {
        if (!cancelled) {
          setOcupacion(data);
          setOcupacionError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOcupacionError(
            solicitudErrorMessage(err, "No se pudo cargar el día")
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fechaAbierta, page]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
        <IconButton
          aria-label="Mes anterior"
          onClick={() => setCursor((current) => addMonths(current, -1))}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography sx={{ flex: 1, textAlign: "center", fontWeight: 600 }}>
          {format(cursor, "MMMM yyyy", { locale: es })}
        </Typography>
        <IconButton
          aria-label="Mes siguiente"
          onClick={() => setCursor((current) => addMonths(current, 1))}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        pend. = pendientes del supervisor · apr. = aprobadas por el supervisor
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
        }}
      >
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((label) => (
          <Typography
            key={label}
            variant="caption"
            align="center"
            color="text.secondary"
          >
            {label}
          </Typography>
        ))}
        {days.map((day) => {
          const fecha = ymd(day);
          const marca = marcas.get(fecha);
          const inMonth = isSameMonth(day, cursor);
          return (
            <Box
              key={fecha}
              onMouseEnter={(event) => {
                if (marca) abrir(event.currentTarget, fecha);
              }}
              onMouseLeave={(event) => salirHacia(event, paperRef.current)}
              sx={{
                minHeight: 72,
                p: 0.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                opacity: inMonth ? 1 : 0.45,
                bgcolor: marca
                  ? marca.aprobados > 0 && marca.solicitados > 0
                    ? "warning.light"
                    : marca.aprobados > 0
                      ? "success.light"
                      : "info.light"
                  : "background.paper",
                cursor: marca ? "pointer" : "default",
              }}
            >
              <Typography variant="caption">{format(day, "d")}</Typography>
              {marca && (
                <>
                  <Typography variant="caption" display="block" sx={{ lineHeight: 1.2 }}>
                    {marca.solicitados} pend.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ lineHeight: 1.2 }}>
                    {marca.aprobados} apr.
                  </Typography>
                </>
              )}
            </Box>
          );
        })}
      </Box>
      <Popper
        open={Boolean(anchor && fechaAbierta)}
        anchorEl={anchor}
        placement="bottom-start"
        modifiers={[{ name: "offset", options: { offset: [0, 8] } }]}
        sx={{ zIndex: (theme) => theme.zIndex.modal }}
      >
        <Paper
          ref={paperRef}
          elevation={4}
          sx={{ p: 1.5, maxWidth: 360 }}
          onMouseEnter={cancelClose}
          onMouseLeave={(event) => salirHacia(event, anchor)}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {fechaAbierta ? formatFecha(fechaAbierta) : ""}
          </Typography>
          {ocupacionError && (
            <Typography color="error" variant="body2">
              {ocupacionError}
            </Typography>
          )}
          {ocupacion?.items.map((item) => (
            <Typography key={`${item.solicitudId}-${item.persona.id}`} variant="body2" sx={{ mb: 0.5 }}>
              {nombreEmpleado(item.persona)} · {TIPO_LABEL[item.tipo]} ·{" "}
              {item.estado === "APROBADO" ? "Aprobada por supervisor" : "Pendiente"}
              {item.comentarioHorario ? ` · ${item.comentarioHorario}` : ""}
            </Typography>
          ))}
          {ocupacion && ocupacion.pagination.total === 0 && (
            <Typography variant="body2">Nadie en este día.</Typography>
          )}
          {ocupacion && ocupacion.pagination.total > PAGE_SIZE && (
            <TablePagination
              component="div"
              count={ocupacion.pagination.total}
              page={page - 1}
              onPageChange={(_, next) => setPage(next + 1)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
              onRowsPerPageChange={() => undefined}
            />
          )}
        </Paper>
      </Popper>
    </Box>
  );
}
