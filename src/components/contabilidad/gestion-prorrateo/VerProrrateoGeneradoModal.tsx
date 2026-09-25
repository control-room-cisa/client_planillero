import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import type { Empleado } from "../../../services/empleadoService";
import ProrrateoService, {
  type ProrrateoFilaDto,
  type ProrrateoGuardadoDetalle,
  type ProrrateoGuardadoResumen,
} from "../../../services/prorrateoService";

const TIPO_LABEL: Record<string, string> = {
  normal: "Normal",
  extra25: "Extra 25%",
  extra50: "Extra 50%",
  extra75: "Extra 75%",
  extra100: "Extra 100%",
  compensatoriaTomada: "Comp. tomada",
  compensatoriaAcumulada: "Comp. acumulada",
};

function formatHoras(n: number): string {
  return Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonto(n: number): string {
  return `${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} L`;
}

function labelPeriodo(r: ProrrateoGuardadoResumen): string {
  const nombre = r.nombrePeriodoNomina?.trim();
  if (nombre) return nombre;
  return `${r.fechaInicio} → ${r.fechaFin}`;
}

interface VerProrrateoGeneradoModalProps {
  open: boolean;
  onClose: () => void;
  empleado: Empleado | null;
}

const VerProrrateoGeneradoModal: React.FC<VerProrrateoGeneradoModalProps> = ({
  open,
  onClose,
  empleado,
}) => {
  const [periodos, setPeriodos] = React.useState<ProrrateoGuardadoResumen[]>(
    []
  );
  const [nominaId, setNominaId] = React.useState<number | "">("");
  const [detalle, setDetalle] = React.useState<ProrrateoGuardadoDetalle | null>(
    null
  );
  const [loadingPeriodos, setLoadingPeriodos] = React.useState(false);
  const [loadingDetalle, setLoadingDetalle] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !empleado?.id) {
      setPeriodos([]);
      setNominaId("");
      setDetalle(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingPeriodos(true);
      setError(null);
      setPeriodos([]);
      setNominaId("");
      setDetalle(null);
      try {
        const data = await ProrrateoService.listarGuardadosPorEmpleado(
          Number(empleado.id)
        );
        if (cancelled) return;
        setPeriodos(data);
        if (data.length > 0) {
          setNominaId(data[0].nominaId);
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "No se pudieron cargar los prorrateos guardados"
        );
      } finally {
        if (!cancelled) setLoadingPeriodos(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, empleado?.id]);

  React.useEffect(() => {
    if (!open || nominaId === "") {
      setDetalle(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingDetalle(true);
      setError(null);
      try {
        const data = await ProrrateoService.obtenerPorNomina(Number(nominaId));
        if (!cancelled) setDetalle(data);
      } catch (e: any) {
        if (cancelled) return;
        setDetalle(null);
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "No se pudo cargar el prorrateo"
        );
      } finally {
        if (!cancelled) setLoadingDetalle(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, nominaId]);

  const nombreEmpleado = empleado
    ? `${empleado.nombre ?? ""} ${empleado.apellido ?? ""}`.trim()
    : "";

  const filas: ProrrateoFilaDto[] = detalle?.filas ?? [];
  const totalHoras = filas.reduce((s, f) => s + Number(f.cantidadHoras || 0), 0);
  const totalMonto = filas.reduce((s, f) => s + Number(f.monto || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Prorrateo generado — {nombreEmpleado || "Colaborador"}</DialogTitle>
      <DialogContent dividers>
        {loadingPeriodos ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error && periodos.length === 0 ? (
          <Alert severity="error">{error}</Alert>
        ) : periodos.length === 0 ? (
          <Alert severity="info">
            Este colaborador aún no tiene prorrateos guardados.
          </Alert>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="periodo-prorrateo-label">Período</InputLabel>
              <Select
                labelId="periodo-prorrateo-label"
                label="Período"
                value={nominaId}
                onChange={(e) => setNominaId(Number(e.target.value))}
              >
                {periodos.map((p) => (
                  <MenuItem key={p.nominaId} value={p.nominaId}>
                    {labelPeriodo(p)}
                    {p.codigoNomina ? ` (${p.codigoNomina})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {loadingDetalle ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : detalle ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  {detalle.fechaInicio} → {detalle.fechaFin} ·{" "}
                  {detalle.filas.length} fila
                  {detalle.filas.length === 1 ? "" : "s"}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Job</TableCell>
                        <TableCell>Class</TableCell>
                        <TableCell align="right">Horas</TableCell>
                        <TableCell align="right">Monto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filas.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            {TIPO_LABEL[f.tipo] ?? f.tipo}
                          </TableCell>
                          <TableCell>{f.codigoJob || "—"}</TableCell>
                          <TableCell>{f.codigoClass || "—"}</TableCell>
                          <TableCell align="right">
                            {formatHoras(f.cantidadHoras)}
                          </TableCell>
                          <TableCell align="right">
                            {formatMonto(f.monto)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} sx={{ fontWeight: 600 }}>
                          Totales
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatHoras(totalHoras)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatMonto(totalMonto)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : null}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VerProrrateoGeneradoModal;
