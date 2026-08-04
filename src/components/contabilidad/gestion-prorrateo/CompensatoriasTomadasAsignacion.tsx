// src/components/contabilidad/gestion-prorrateo/CompensatoriasTomadasAsignacion.tsx
import * as React from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import RegistroDiarioService, {
  type BancoCompensatoriaJobItem,
} from "../../../services/registroDiarioService";

export type AsignacionCompensatoriaTomada = {
  jobId: number | null;
  codigoJob: string | null;
  nombreJob: string | null;
  horas: number;
  horasDisponibles: number;
};

export type CompensatoriasTomadasAsignacionProps = {
  empleadoId: number;
  /** Cambia al cambiar de nómina/período para reiniciar filas desde el banco */
  resetKey?: string | number | null;
  horasACubrir: number;
  disabled?: boolean;
  asignaciones: AsignacionCompensatoriaTomada[];
  onChange: (next: AsignacionCompensatoriaTomada[]) => void;
  formatHoras: (value: number) => string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function jobLabel(item: {
  jobId: number | null;
  codigoJob?: string | null;
  jobCodigo?: string | null;
  nombreJob?: string | null;
  jobNombre?: string | null;
}): string {
  const codigo = (item.codigoJob ?? item.jobCodigo ?? "").trim();
  const nombre = (item.nombreJob ?? item.jobNombre ?? "").trim();
  if (item.jobId == null && !codigo && !nombre) return "Job no definido";
  if (codigo && nombre) return `${codigo} — ${nombre}`;
  return codigo || nombre || (item.jobId != null ? `Job #${item.jobId}` : "Sin job");
}

const CompensatoriasTomadasAsignacion: React.FC<
  CompensatoriasTomadasAsignacionProps
> = ({
  empleadoId,
  resetKey,
  horasACubrir,
  disabled = false,
  asignaciones,
  onChange,
  formatHoras,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [banco, setBanco] = React.useState<BancoCompensatoriaJobItem[]>([]);
  const asignacionesRef = React.useRef(asignaciones);
  asignacionesRef.current = asignaciones;

  React.useEffect(() => {
    if (!empleadoId || empleadoId <= 0) {
      setBanco([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await RegistroDiarioService.getTiempoCompensatorio(
          empleadoId,
          { seccion: "porJob", page: 1, limit: 500 }
        );
        if (cancelled) return;
        const rows = (data.porJob ?? []).filter(
          (r) => Number(r.horasAcumuladas ?? 0) > 0
        );
        setBanco(rows);
      } catch (e: any) {
        if (cancelled) return;
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "No se pudo cargar el banco de compensatorias"
        );
        setBanco([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empleadoId, resetKey]);

  // Sembrar/sincronizar filas editables desde el banco (preserva horas ya digitadas)
  React.useEffect(() => {
    const current = asignacionesRef.current;
    if (banco.length === 0) {
      if (current.length > 0) onChange([]);
      return;
    }
    const prevByKey = new Map(
      current.map((a) => [`${a.jobId ?? "null"}`, a] as const)
    );
    const next: AsignacionCompensatoriaTomada[] = banco.map((b) => {
      const key = `${b.jobId ?? "null"}`;
      const prev = prevByKey.get(key);
      const horasDisponibles = round2(Number(b.horasAcumuladas ?? 0));
      const horasPrev = round2(Number(prev?.horas ?? 0));
      return {
        jobId: b.jobId,
        codigoJob: b.jobCodigo ?? null,
        nombreJob: b.jobNombre ?? null,
        horas: Math.min(horasPrev, horasDisponibles),
        horasDisponibles,
      };
    });

    const same =
      next.length === current.length &&
      next.every((n, i) => {
        const c = current[i];
        return (
          (n.jobId ?? null) === (c.jobId ?? null) &&
          n.horas === c.horas &&
          n.horasDisponibles === c.horasDisponibles &&
          n.codigoJob === c.codigoJob &&
          n.nombreJob === c.nombreJob
        );
      });
    if (!same) onChange(next);
  }, [banco, resetKey, onChange]);

  const totalAsignado = round2(
    asignaciones.reduce((acc, a) => acc + Number(a.horas || 0), 0)
  );
  const pendiente = round2(Math.max(0, horasACubrir - totalAsignado));
  const exceso = round2(Math.max(0, totalAsignado - horasACubrir));
  const totalBanco = round2(
    banco.reduce((acc, b) => acc + Number(b.horasAcumuladas || 0), 0)
  );
  const cubierto =
    horasACubrir <= 0 ||
    (pendiente <= 0.001 && exceso <= 0.001 && totalAsignado > 0);

  const handleHorasChange = (jobId: number | null, raw: string) => {
    if (disabled) return;
    const parsed = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    const next = asignaciones.map((a) => {
      if ((a.jobId ?? null) !== (jobId ?? null)) return a;
      const max = round2(a.horasDisponibles);
      const horas = round2(Math.min(parsed, max));
      return { ...a, horas };
    });
    onChange(next);
  };

  if (horasACubrir <= 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        No hay horas compensatorias tomadas en el período.
      </Typography>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="h6" gutterBottom>
        Compensatorias tomadas — asignación a jobs del banco
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Asigna jobs del banco para cubrir las horas tomadas. El rebajo del
        banco solo se aplica al guardar el prorrateo.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="body2">
          A cubrir: <strong>{formatHoras(horasACubrir)} h</strong>
        </Typography>
        <Typography variant="body2">
          Asignadas: <strong>{formatHoras(totalAsignado)} h</strong>
        </Typography>
        <Typography
          variant="body2"
          color={pendiente > 0.001 ? "warning.main" : "success.main"}
        >
          Pendiente: <strong>{formatHoras(pendiente)} h</strong>
        </Typography>
        {exceso > 0.001 && (
          <Typography variant="body2" color="error.main">
            Exceso: <strong>{formatHoras(exceso)} h</strong>
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Banco total: {formatHoras(totalBanco)} h
        </Typography>
      </Box>

      {totalBanco + 0.001 < horasACubrir && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          El banco no tiene horas suficientes para cubrir las compensatorias
          tomadas ({formatHoras(horasACubrir)} h).
        </Alert>
      )}

      {!cubierto && !disabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Debes asignar exactamente {formatHoras(horasACubrir)} h entre los
          jobs del banco antes de guardar el prorrateo.
        </Alert>
      )}

      {banco.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No hay saldos en el banco de compensatorias para este colaborador.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job</TableCell>
              <TableCell align="right">En banco</TableCell>
              <TableCell align="right">Asignar / rebajar</TableCell>
              <TableCell align="right">Saldo virtual</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {asignaciones.map((a) => {
              const saldoVirtual = round2(a.horasDisponibles - a.horas);
              return (
                <TableRow key={`${a.jobId ?? "null"}`}>
                  <TableCell>{jobLabel(a)}</TableCell>
                  <TableCell align="right">
                    {formatHoras(a.horasDisponibles)}
                  </TableCell>
                  <TableCell align="right" sx={{ width: 140 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={a.horas === 0 ? "" : a.horas}
                      disabled={disabled}
                      inputProps={{
                        min: 0,
                        max: a.horasDisponibles,
                        step: 0.25,
                      }}
                      onChange={(e) =>
                        handleHorasChange(a.jobId, e.target.value)
                      }
                      sx={{ width: 110 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {formatHoras(saldoVirtual)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export function asignacionesCubrenTotal(
  horasACubrir: number,
  asignaciones: AsignacionCompensatoriaTomada[]
): boolean {
  if (horasACubrir <= 0.001) return true;
  const total = round2(
    asignaciones.reduce((acc, a) => acc + Number(a.horas || 0), 0)
  );
  return Math.abs(total - round2(horasACubrir)) <= 0.01;
}

export function asignacionesValidasContraBanco(
  asignaciones: AsignacionCompensatoriaTomada[]
): boolean {
  return asignaciones.every(
    (a) =>
      Number(a.horas || 0) >= 0 &&
      Number(a.horas || 0) <= Number(a.horasDisponibles || 0) + 0.001
  );
}

export default CompensatoriasTomadasAsignacion;
