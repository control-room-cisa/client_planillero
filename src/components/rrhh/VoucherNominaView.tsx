import * as React from "react";
import { Box, Chip, Typography } from "@mui/material";
import type { NominaDto } from "../../dtos/nominaDto";
import {
  calcularTotalAPagarNomina,
  calcularTotalBrutoNomina,
} from "./gestion-empleados/calculo-nominas/utils/nominaTotales";
import { resolveCantidadHorasOt } from "./voucherNominaHtml";
import type {
  VoucherConsumoDetalleItem,
  VoucherConsumosDetalle,
} from "./voucherConsumosDetalle";

type Formatters = {
  formatCurrency: (amount: number | null | undefined) => string;
  formatDate: (dateString: string) => string;
};

type Tone = "neutral" | "income" | "ot" | "deduct" | "note";

const TONE_STYLES: Record<
  Tone,
  { headBg: string; headColor: string; dot: string }
> = {
  neutral: { headBg: "#f7f9fc", headColor: "#37474f", dot: "#607d8b" },
  income: { headBg: "#e8f5e9", headColor: "#1b5e20", dot: "#43a047" },
  ot: { headBg: "#e3f2fd", headColor: "#0d47a1", dot: "#1976d2" },
  deduct: { headBg: "#fce4ec", headColor: "#880e4f", dot: "#c2185b" },
  note: { headBg: "#fff8e1", headColor: "#e65100", dot: "#ff9800" },
};

type RowItem = {
  label: string;
  value: React.ReactNode;
  total?: boolean;
  tone?: "income" | "deduct" | "muted";
};

function formatHorasOt(h: number | null): string {
  if (h === null || h === undefined || !Number.isFinite(h)) return "—";
  return `${h.toFixed(2)} h`;
}

function diasLabel(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : String(v);
}

function VoucherCard({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: Tone;
  rows: RowItem[];
}) {
  const t = TONE_STYLES[tone];
  return (
    <Box
      sx={{
        border: "1px solid #e0e6ed",
        borderRadius: 1.5,
        overflow: "hidden",
        bgcolor: "#fff",
        height: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1,
          bgcolor: t.headBg,
          color: t.headColor,
          borderBottom: "1px solid #e0e6ed",
          typography: "subtitle2",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          fontSize: "0.75rem",
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: t.dot,
            flexShrink: 0,
          }}
        />
        {title}
      </Box>
      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
        <Box component="tbody">
          {rows.map((row, idx) => (
            <Box
              component="tr"
              key={`${row.label}-${idx}`}
              sx={{
                bgcolor: row.total
                  ? "#f5f7fa"
                  : idx % 2 === 1
                    ? "#fafbfc"
                    : "transparent",
                borderTop: row.total ? "1px solid #cfd8dc" : undefined,
              }}
            >
              <Box
                component="td"
                sx={{
                  px: 1.5,
                  py: row.total ? 1.1 : 0.85,
                  width: "58%",
                  color: row.total ? "#263238" : "#546e7a",
                  fontSize: "0.875rem",
                  fontWeight: row.total ? 700 : 400,
                  borderBottom: "1px solid #f0f3f7",
                }}
              >
                {row.label}
              </Box>
              <Box
                component="td"
                sx={{
                  px: 1.5,
                  py: row.total ? 1.1 : 0.85,
                  textAlign: "right",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  fontVariantNumeric: "tabular-nums",
                  borderBottom: "1px solid #f0f3f7",
                  color:
                    row.tone === "income"
                      ? "#2e7d32"
                      : row.tone === "deduct"
                        ? "#c62828"
                        : row.tone === "muted"
                          ? "#90a4ae"
                          : "#1a2332",
                }}
              >
                {row.value}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function ConsumosTable({
  items,
  emptyMsg,
  formatters,
}: {
  items: VoucherConsumoDetalleItem[];
  emptyMsg: string;
  formatters: Formatters;
}) {
  if (!items.length) {
    return (
      <Typography
        sx={{
          px: 1.5,
          py: 1.5,
          fontSize: "0.8125rem",
          color: "#90a4ae",
          fontStyle: "italic",
        }}
      >
        {emptyMsg}
      </Typography>
    );
  }

  const total = items.reduce((acc, it) => acc + (Number(it.precio) || 0), 0);

  return (
    <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
      <Box component="thead">
        <Box component="tr">
          {["Fecha", "Concepto", "Monto"].map((h, i) => (
            <Box
              component="th"
              key={h}
              sx={{
                textAlign: i === 2 ? "right" : "left",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "#78909c",
                fontWeight: 700,
                px: 1.25,
                pt: 1,
                pb: 0.5,
                borderBottom: "1px solid #e0e6ed",
              }}
            >
              {h}
            </Box>
          ))}
        </Box>
      </Box>
      <Box component="tbody">
        {items.map((it, idx) => (
          <Box
            component="tr"
            key={`${it.fecha}-${it.producto}-${idx}`}
            sx={{ bgcolor: idx % 2 === 1 ? "#fafbfc" : "transparent" }}
          >
            <Box
              component="td"
              sx={{
                px: 1.25,
                py: 0.7,
                whiteSpace: "nowrap",
                color: "#607d8b",
                fontSize: "0.8125rem",
                borderBottom: "1px solid #f0f3f7",
              }}
            >
              {formatters.formatDate(it.fecha)}
            </Box>
            <Box
              component="td"
              sx={{
                px: 1.25,
                py: 0.7,
                color: "#37474f",
                fontSize: "0.8125rem",
                borderBottom: "1px solid #f0f3f7",
              }}
            >
              {it.producto || "N/D"}
            </Box>
            <Box
              component="td"
              sx={{
                px: 1.25,
                py: 0.7,
                textAlign: "right",
                fontWeight: 600,
                fontSize: "0.8125rem",
                fontVariantNumeric: "tabular-nums",
                borderBottom: "1px solid #f0f3f7",
              }}
            >
              {formatters.formatCurrency(it.precio)}
            </Box>
          </Box>
        ))}
        <Box component="tr" sx={{ bgcolor: "#f5f7fa" }}>
          <Box
            component="td"
            colSpan={2}
            sx={{
              px: 1.25,
              py: 0.9,
              fontWeight: 700,
              fontSize: "0.8125rem",
              borderTop: "1px solid #cfd8dc",
            }}
          >
            Total
          </Box>
          <Box
            component="td"
            sx={{
              px: 1.25,
              py: 0.9,
              textAlign: "right",
              fontWeight: 700,
              fontSize: "0.8125rem",
              color: "#c62828",
              borderTop: "1px solid #cfd8dc",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatters.formatCurrency(total)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export type VoucherNominaViewProps = {
  nomina: NominaDto;
  colaborador: string;
  empresaNombre: string;
  formatCurrency: (amount: number | null | undefined) => string;
  formatDate: (dateString: string) => string;
  consumosDetalle?: VoucherConsumosDetalle | null;
  includeFirmas?: boolean;
};

/**
 * Vista de voucher adaptada a modal (misma estructura visual que la impresión,
 * tipografía y espaciado legibles en pantalla).
 */
export default function VoucherNominaView({
  nomina: n,
  colaborador,
  empresaNombre,
  formatCurrency,
  formatDate,
  consumosDetalle,
  includeFirmas = true,
}: VoucherNominaViewProps) {
  const formatters: Formatters = { formatCurrency, formatDate };
  const estadoPagado = n.pagado === true;
  const estadoLabel = estadoPagado ? "Pagado" : "Pendiente de pago";
  const codigoNominaStr =
    n.codigoNomina && String(n.codigoNomina).trim() !== ""
      ? String(n.codigoNomina)
      : "—";

  const otRow = (
    label: string,
    cantidad: number | null | undefined,
    monto: number | null | undefined,
    pct: 25 | 50 | 75 | 100,
  ): RowItem => {
    const horas = formatHorasOt(
      resolveCantidadHorasOt(cantidad, monto, n.sueldoMensual, pct),
    );
    return {
      label,
      value: (
        <Box
          component="span"
          sx={{ display: "inline-flex", alignItems: "baseline", gap: 1 }}
        >
          <Box
            component="span"
            sx={{ color: "#607d8b", fontWeight: 500, fontSize: "0.75rem" }}
          >
            {horas}
          </Box>
          <Box component="span">{formatCurrency(monto)}</Box>
        </Box>
      ),
    };
  };

  const generadoEl = new Date().toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <Box
      sx={{
        border: "1px solid #d0d7de",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "#fff",
        color: "#1a2332",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, #0d47a1 0%, #1565c0 55%, #1976d2 100%)",
          color: "#fff",
          px: { xs: 2, sm: 2.5 },
          pt: 2,
          pb: 2,
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 4,
            bgcolor: "#ffc107",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: "1.15rem", fontWeight: 700 }}>
              {empresaNombre || "Comprobante de nómina"}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.75rem",
                opacity: 0.85,
                mt: 0.4,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Comprobante de pago de nómina
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Voucher
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", mt: 0.4, opacity: 0.85 }}>
              Nómina #{n.id}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Identity */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          px: { xs: 2, sm: 2.5 },
          py: 2,
          bgcolor: "#f4f7fb",
          borderBottom: "1px solid #e3e8ef",
        }}
      >
        <Box>
          <Typography
            sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#0d47a1" }}
          >
            {colaborador}
          </Typography>
          <Typography sx={{ fontSize: "0.8125rem", color: "#546e7a", mt: 0.5 }}>
            Código {codigoNominaStr}
            <Box component="span" sx={{ mx: 0.75, color: "#90a4ae" }}>
              ·
            </Box>
            {n.nombrePeriodoNomina || "Sin período"}
          </Typography>
        </Box>
        <Chip
          label={estadoLabel}
          size="small"
          sx={{
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            ...(estadoPagado
              ? {
                  bgcolor: "#e8f5e9",
                  color: "#1b5e20",
                  border: "1px solid #a5d6a7",
                }
              : {
                  bgcolor: "#ffebee",
                  color: "#b71c1c",
                  border: "1px solid #ef9a9a",
                }),
          }}
        />
      </Box>

      {/* Period */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            sm: "repeat(4, 1fr)",
          },
          borderBottom: "1px solid #e3e8ef",
        }}
      >
        {(
          [
            ["Período", n.nombrePeriodoNomina || "—"],
            ["Fecha inicio", formatDate(n.fechaInicio)],
            ["Fecha fin", formatDate(n.fechaFin)],
            ["Sueldo mensual", formatCurrency(n.sueldoMensual)],
          ] as const
        ).map(([lbl, val], i, arr) => (
          <Box
            key={lbl}
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: 1.5,
              borderRight: {
                xs: i % 2 === 0 ? "1px solid #e3e8ef" : "none",
                sm: i < arr.length - 1 ? "1px solid #e3e8ef" : "none",
              },
              borderBottom: {
                xs: i < 2 ? "1px solid #e3e8ef" : "none",
                sm: "none",
              },
            }}
          >
            <Typography
              sx={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#78909c",
                fontWeight: 600,
                mb: 0.35,
              }}
            >
              {lbl}
            </Typography>
            <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600 }}>
              {val}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Body */}
      <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            mb: 2,
          }}
        >
          <VoucherCard
            title="Datos laborales"
            tone="neutral"
            rows={[
              { label: "Días laborados", value: diasLabel(n.diasLaborados) },
              { label: "Días vacaciones", value: diasLabel(n.diasVacaciones) },
              {
                label: "Días incap. empresa",
                value: diasLabel(n.diasIncapacidadEmpresa),
              },
              {
                label: "Días incap. IHSS",
                value: diasLabel(n.diasIncapacidadIHSS),
              },
              {
                label: "Horas compensatorias",
                value: diasLabel(n.horasCompensatorias),
              },
            ]}
          />
          <VoucherCard
            title="Horas extra"
            tone="ot"
            rows={[
              otRow("OT 25%", n.cantidadHoras25, n.montoHoras25, 25),
              otRow("OT 50%", n.cantidadHoras50, n.montoHoras50, 50),
              otRow("OT 75%", n.cantidadHoras75, n.montoHoras75, 75),
              otRow("OT 100%", n.cantidadHoras100, n.montoHoras100, 100),
            ]}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            mb: 2,
          }}
        >
          <VoucherCard
            title="Percepciones"
            tone="income"
            rows={[
              {
                label: "Subtotal quincena",
                value: formatCurrency(n.subtotalQuincena),
              },
              {
                label: "Monto vacaciones",
                value: formatCurrency(n.montoVacaciones),
              },
              {
                label: "Monto días laborados",
                value: formatCurrency(n.montoDiasLaborados),
              },
              {
                label: "Monto excedente IHSS",
                value: formatCurrency(n.montoExcedenteIHSS),
              },
              {
                label: "Monto incap. cubre empresa",
                value: formatCurrency(n.montoIncapacidadCubreEmpresa),
              },
              {
                label: "Monto permisos justificados",
                value: formatCurrency(n.montoPermisosJustificados),
              },
              { label: "(+) Ajuste", value: formatCurrency(n.ajuste) },
              {
                label: "(+) Anticipo de pago",
                value: formatCurrency(n.anticipoPago),
              },
              {
                label: "Total bruto",
                value: formatCurrency(calcularTotalBrutoNomina(n)),
                total: true,
                tone: "income",
              },
            ]}
          />
          <VoucherCard
            title="Deducciones"
            tone="deduct"
            rows={[
              { label: "IHSS", value: formatCurrency(n.deduccionIHSS) },
              { label: "ISR", value: formatCurrency(n.deduccionISR) },
              { label: "RAP", value: formatCurrency(n.deduccionRAP) },
              {
                label: "Alimentación",
                value: formatCurrency(n.deduccionAlimentacion),
              },
              {
                label: "Alojamiento",
                value: formatCurrency(n.deduccionAlojamiento),
              },
              {
                label: "Cobro préstamo",
                value: formatCurrency(n.cobroPrestamo),
              },
              {
                label: "Impuesto vecinal",
                value: formatCurrency(n.impuestoVecinal),
              },
              { label: "Otros", value: formatCurrency(n.otros) },
              {
                label: "Total deducciones",
                value: formatCurrency(n.totalDeducciones),
                total: true,
                tone: "deduct",
              },
            ]}
          />
        </Box>

        {/* Neto */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            mb: 2.5,
            px: { xs: 2, sm: 2.5 },
            py: 2,
            borderRadius: 2,
            background: "linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)",
            color: "#fff",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.9,
              }}
            >
              Total a pagar
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", opacity: 0.7, mt: 0.25 }}>
              Neto del período · {estadoLabel}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: { xs: "1.5rem", sm: "1.75rem" },
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCurrency(calcularTotalAPagarNomina(n))}
          </Typography>
        </Box>

        {/* Comentario */}
        <Box
          sx={{
            border: "1px solid #e0e6ed",
            borderRadius: 1.5,
            overflow: "hidden",
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              bgcolor: TONE_STYLES.note.headBg,
              color: TONE_STYLES.note.headColor,
              borderBottom: "1px solid #e0e6ed",
              typography: "subtitle2",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              fontSize: "0.75rem",
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: TONE_STYLES.note.dot,
              }}
            />
            Comentario
          </Box>
          <Typography
            sx={{
              px: 1.5,
              py: 1.5,
              fontSize: "0.875rem",
              color: "#455a64",
              whiteSpace: "pre-wrap",
              minHeight: 40,
              ...(n.comentario && String(n.comentario).trim() !== ""
                ? {}
                : { color: "#90a4ae", fontStyle: "italic" }),
            }}
          >
            {n.comentario && String(n.comentario).trim() !== ""
              ? n.comentario
              : "Sin comentario"}
          </Typography>
        </Box>

        {/* Consumos */}
        {consumosDetalle ? (
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1,
                mb: 1,
                border: "1px solid #e0e6ed",
                borderRadius: 1.5,
                bgcolor: TONE_STYLES.neutral.headBg,
                color: TONE_STYLES.neutral.headColor,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontSize: "0.75rem",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: TONE_STYLES.neutral.dot,
                }}
              />
              Detalle de consumos
            </Box>
            {consumosDetalle.rangoFechaInicio &&
            consumosDetalle.rangoFechaFin ? (
              <Typography
                sx={{ fontSize: "0.75rem", color: "#607d8b", mb: 1.25 }}
              >
                Rango consultado:{" "}
                {formatDate(consumosDetalle.rangoFechaInicio)} —{" "}
                {formatDate(consumosDetalle.rangoFechaFin)}
              </Typography>
            ) : null}
            {consumosDetalle.errorMensaje ? (
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  fontSize: "0.8125rem",
                  color: "#b71c1c",
                  bgcolor: "#ffebee",
                  borderRadius: 1,
                }}
              >
                {consumosDetalle.errorMensaje}
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    border: "1px solid #e0e6ed",
                    borderRadius: 1.5,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      bgcolor: TONE_STYLES.deduct.headBg,
                      color: TONE_STYLES.deduct.headColor,
                      borderBottom: "1px solid #e0e6ed",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      fontSize: "0.75rem",
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: TONE_STYLES.deduct.dot,
                      }}
                    />
                    Detalle alimentación
                  </Box>
                  <ConsumosTable
                    items={consumosDetalle.detalleAlimentacion}
                    emptyMsg="Sin consumos de alimentación en el período."
                    formatters={formatters}
                  />
                </Box>
                <Box
                  sx={{
                    border: "1px solid #e0e6ed",
                    borderRadius: 1.5,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      bgcolor: TONE_STYLES.note.headBg,
                      color: TONE_STYLES.note.headColor,
                      borderBottom: "1px solid #e0e6ed",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      fontSize: "0.75rem",
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: TONE_STYLES.note.dot,
                      }}
                    />
                    Detalle alojamiento
                  </Box>
                  <ConsumosTable
                    items={consumosDetalle.detalleAlojamiento}
                    emptyMsg="Sin consumos de alojamiento en el período."
                    formatters={formatters}
                  />
                </Box>
              </Box>
            )}
          </Box>
        ) : null}

        {includeFirmas ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 4,
              px: 1,
              pt: 1,
              pb: 0.5,
            }}
          >
            {[
              { label: "Recibí conforme", sub: colaborador },
              { label: "Autorizado por", sub: "Recursos Humanos" },
            ].map((s) => (
              <Box key={s.label} sx={{ textAlign: "center", pt: 4 }}>
                <Box
                  sx={{
                    borderTop: "1px solid #90a4ae",
                    mx: 3,
                    mb: 1,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "#607d8b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "#90a4ae", mt: 0.25 }}>
                  {s.sub}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>

      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          borderTop: "1px dashed #cfd8dc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          fontSize: "0.7rem",
          color: "#78909c",
        }}
      >
        <span>Documento generado el {generadoEl}</span>
        <span>
          {empresaNombre || "Planillero"} · ID {n.id} · {codigoNominaStr}
        </span>
      </Box>
    </Box>
  );
}
