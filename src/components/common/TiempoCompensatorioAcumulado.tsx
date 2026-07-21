import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RegistroDiarioService, {
  type ActividadCompensatoriaItem,
  type BancoCompensatoriaJobItem,
  type TiempoCompensatorioData,
} from "../../services/registroDiarioService";

export type TiempoCompensatorioAcumuladoProps = {
  open: boolean;
  onClose: () => void;
  /** Id del colaborador a consultar (por referencia). */
  empleadoId: number;
  nombreEmpleado?: string;
};

function formatFecha(fecha: string): string {
  if (!fecha) return "—";
  const d = new Date(fecha.length === 10 ? `${fecha}T00:00:00` : fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatHoras(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0.00";
  return Number(n).toFixed(2);
}

function formatVacacionesSaldo(horas: number | null | undefined): string {
  if (horas == null || Number.isNaN(Number(horas))) return "—";
  const h = Number(horas);
  const dias = h / 8;
  return `${dias.toFixed(2)} días (${h} horas)`;
}

function jobLabel(
  codigo: string | null | undefined,
  nombre: string | null | undefined
): string {
  const c = (codigo || "").trim();
  const n = (nombre || "").trim();
  if (c && n) return `${c} — ${n}`;
  return c || n || "Sin job";
}

const TiempoCompensatorioAcumulado: React.FC<
  TiempoCompensatorioAcumuladoProps
> = ({ open, onClose, empleadoId, nombreEmpleado }) => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TiempoCompensatorioData | null>(null);

  const load = useCallback(async () => {
    if (!empleadoId || empleadoId <= 0) {
      setData(null);
      setError("Empleado no válido");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result =
        await RegistroDiarioService.getTiempoCompensatorio(empleadoId);
      setData(result);
    } catch (err: any) {
      console.error("Error al cargar tiempo compensatorio:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Error al cargar tiempo compensatorio"
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [empleadoId]);

  useEffect(() => {
    if (open) {
      setTab(0);
      void load();
    }
  }, [open, load]);

  const renderActividadesTable = (
    rows: ActividadCompensatoriaItem[],
    emptyLabel: string
  ) => {
    if (rows.length === 0) {
      return (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          {emptyLabel}
        </Typography>
      );
    }
    return (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ flex: 1, minHeight: 0, maxHeight: "none" }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Job</TableCell>
              <TableCell align="right">Horas</TableCell>
              <TableCell>Descripción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{formatFecha(row.fecha)}</TableCell>
                <TableCell>{jobLabel(row.jobCodigo, row.jobNombre)}</TableCell>
                <TableCell align="right">
                  {formatHoras(row.duracionHoras)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap title={row.descripcion}>
                    {row.descripcion || "—"}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderBancoPorJob = (rows: BancoCompensatoriaJobItem[]) => {
    if (rows.length === 0) {
      return (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          No hay saldos en banco compensatorias por job
        </Typography>
      );
    }
    return (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ flex: 1, minHeight: 0, maxHeight: "none" }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job</TableCell>
              <TableCell align="right">Horas acumuladas</TableCell>
              <TableCell align="center">Id empleado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{jobLabel(row.jobCodigo, row.jobNombre)}</TableCell>
                <TableCell align="right">
                  {formatHoras(row.horasAcumuladas)}
                </TableCell>
                <TableCell align="center">{row.empleadoId}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderVacaciones = (horas: number | null | undefined) => (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Saldo de vacaciones
      </Typography>
      <Typography variant="body1">
        <strong>Vacaciones:</strong> {formatVacacionesSaldo(horas)}
      </Typography>
    </Paper>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: "92vw",
          maxWidth: "92vw",
          height: "90vh",
          maxHeight: "90vh",
          m: 1,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          pr: 1,
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography variant="h6" component="span">
            Tiempo Compensatorio Acumulado
          </Typography>
          {nombreEmpleado ? (
            <Typography variant="body2" color="text.secondary">
              {nombreEmpleado}
            </Typography>
          ) : null}
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar" size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : data ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{ mb: 2, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
            >
              <Tab
                label={`Banco acumulado por job (${data.porJob.length})`}
                id="tab-comp-por-job"
              />
              <Tab
                label={`Historial h. acumuladas (${data.acumuladas.length})`}
                id="tab-comp-acumuladas"
              />
              <Tab
                label={`Historial h. tomadas (${data.tomadas.length})`}
                id="tab-comp-tomadas"
              />
              <Tab label="Vacaciones" id="tab-vacaciones" />
            </Tabs>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {tab === 0 && renderBancoPorJob(data.porJob)}
              {tab === 1 &&
                renderActividadesTable(
                  data.acumuladas,
                  "No hay actividades compensatorias acumuladas (extra=true)"
                )}
              {tab === 2 &&
                renderActividadesTable(
                  data.tomadas,
                  "No hay actividades compensatorias tomadas (extra=false)"
                )}
              {tab === 3 && renderVacaciones(data.tiempoVacacionesHoras)}
            </Box>
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            Sin datos
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TiempoCompensatorioAcumulado;
