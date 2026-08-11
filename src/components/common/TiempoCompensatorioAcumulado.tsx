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
  TablePagination,
  Typography,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RegistroDiarioService, {
  type ActividadCompensatoriaItem,
  type BancoCompensatoriaJobItem,
  type TiempoCompensatorioData,
  type TiempoCompensatorioSeccion,
} from "../../services/registroDiarioService";

export type TiempoCompensatorioAcumuladoProps = {
  open: boolean;
  onClose: () => void;
  /** Id del colaborador a consultar (por referencia). */
  empleadoId: number;
  nombreEmpleado?: string;
};

const PAGE_SIZE = 10;

const TAB_SECCIONES: TiempoCompensatorioSeccion[] = [
  "porJob",
  "acumuladas",
  "tomadas",
  "vacaciones",
];

/** Celdas compactas (misma densidad que tablas de historial / módulos RRHH). */
const denseCellSx = {
  py: 0.5,
  px: 1,
  fontSize: "0.8125rem",
  lineHeight: 1.25,
  whiteSpace: "nowrap" as const,
};

const denseHeadSx = {
  ...denseCellSx,
  fontWeight: 600,
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
  nombre: string | null | undefined,
  jobId?: number | null
): string {
  if (jobId == null && !codigo && !nombre) return "Job no definido";
  const c = (codigo || "").trim();
  const n = (nombre || "").trim();
  if (c && n) return `${c} — ${n}`;
  return c || n || "Sin job";
}

const TiempoCompensatorioAcumulado: React.FC<
  TiempoCompensatorioAcumuladoProps
> = ({ open, onClose, empleadoId, nombreEmpleado }) => {
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0); // MUI 0-based
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TiempoCompensatorioData | null>(null);

  const load = useCallback(
    async (seccion: TiempoCompensatorioSeccion, page1Based: number) => {
      if (!empleadoId || empleadoId <= 0) {
        setData(null);
        setError("Empleado no válido");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await RegistroDiarioService.getTiempoCompensatorio(
          empleadoId,
          { seccion, page: page1Based, limit: PAGE_SIZE }
        );
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
    },
    [empleadoId]
  );

  useEffect(() => {
    if (open) {
      setTab(0);
      setPage(0);
      void load("porJob", 1);
    }
  }, [open, load]);

  const handleTabChange = (_: React.SyntheticEvent, nextTab: number) => {
    setTab(nextTab);
    setPage(0);
    void load(TAB_SECCIONES[nextTab], 1);
  };

  const handlePageChange = (_: unknown, nextPage: number) => {
    setPage(nextPage);
    void load(TAB_SECCIONES[tab], nextPage + 1);
  };

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
        sx={{ overflow: "auto" }}
      >
        <Table stickyHeader size="small" sx={{ tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...denseHeadSx, width: 88 }}>Fecha</TableCell>
              <TableCell sx={{ ...denseHeadSx, width: "28%" }}>Job</TableCell>
              <TableCell align="right" sx={{ ...denseHeadSx, width: 72 }}>
                Horas
              </TableCell>
              <TableCell sx={denseHeadSx}>Descripción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const job = jobLabel(row.jobCodigo, row.jobNombre, row.jobId);
              const desc = row.descripcion || "—";
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={denseCellSx}>
                    {formatFecha(row.fecha)}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...denseCellSx,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={job}
                  >
                    {job}
                  </TableCell>
                  <TableCell align="right" sx={denseCellSx}>
                    {formatHoras(row.duracionHoras)}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...denseCellSx,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={desc}
                  >
                    {desc}
                  </TableCell>
                </TableRow>
              );
            })}
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
        sx={{ overflow: "auto" }}
      >
        <Table stickyHeader size="small" sx={{ tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={denseHeadSx}>Job</TableCell>
              <TableCell align="right" sx={{ ...denseHeadSx, width: 140 }}>
                Horas acumuladas
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const job = jobLabel(row.jobCodigo, row.jobNombre, row.jobId);
              return (
                <TableRow key={row.id} hover>
                  <TableCell
                    sx={{
                      ...denseCellSx,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={job}
                  >
                    {job}
                  </TableCell>
                  <TableCell align="right" sx={denseCellSx}>
                    {formatHoras(row.horasAcumuladas)}
                  </TableCell>
                </TableRow>
              );
            })}
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

  const counts = data?.counts;
  const paginationTotal = data?.pagination?.total ?? 0;
  const showPagination = tab !== 3;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: { xs: "96vw", sm: 880 },
          maxWidth: "96vw",
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
          py: 1.25,
          pr: 1,
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography variant="subtitle1" component="span" fontWeight={600}>
            Tiempo Compensatorio Acumulado
          </Typography>
          {nombreEmpleado ? (
            <Typography variant="caption" color="text.secondary" display="block">
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
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          py: 1.5,
        }}
      >
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              mb: 1,
              minHeight: 36,
              borderBottom: 1,
              borderColor: "divider",
              flexShrink: 0,
              "& .MuiTab-root": {
                minHeight: 36,
                py: 0.5,
                px: 1.5,
                fontSize: "0.8125rem",
              },
            }}
          >
            <Tab
              label={`Banco acumulado por job (${counts?.porJob ?? 0})`}
              id="tab-comp-por-job"
            />
            <Tab
              label={`Historial h. acumuladas (${counts?.acumuladas ?? 0})`}
              id="tab-comp-acumuladas"
            />
            <Tab
              label={`Historial h. tomadas (${counts?.tomadas ?? 0})`}
              id="tab-comp-tomadas"
            />
            <Tab label="Vacaciones" id="tab-vacaciones" />
          </Tabs>

          <Box sx={{ position: "relative" }}>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 4,
                }}
              >
                <CircularProgress size={32} />
              </Box>
            ) : data ? (
              <>
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
              </>
            ) : (
              <Typography
                color="text.secondary"
                sx={{ py: 3, textAlign: "center" }}
              >
                Sin datos
              </Typography>
            )}
          </Box>

          {showPagination && data && !loading ? (
            <TablePagination
              component="div"
              count={paginationTotal}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
              labelRowsPerPage="Filas"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
              }
              sx={{
                flexShrink: 0,
                borderTop: 1,
                borderColor: "divider",
                minHeight: 44,
                "& .MuiTablePagination-toolbar": {
                  minHeight: 44,
                  px: 1,
                },
              }}
            />
          ) : null}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TiempoCompensatorioAcumulado;
