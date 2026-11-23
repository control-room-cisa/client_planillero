import type { NominaDto } from "../../dtos/nominaDto";
import {
  calcularTotalAPagarNomina,
  calcularTotalBrutoNomina,
} from "./gestion-empleados/calculo-nominas/utils/nominaTotales";
import type {
  VoucherConsumoDetalleItem,
  VoucherConsumosDetalle,
} from "./voucherConsumosDetalle";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Factores de recargo OT: monto = horas × (sueldoMensual/240) × factor */
const OT_FACTORS = {
  25: 1.25,
  50: 1.5,
  75: 1.75,
  100: 2.0,
} as const;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Cantidad de horas OT guardada, o derivada del monto si la nómina es antigua.
 * `horas = monto / ((sueldoMensual / 240) * factor)`
 */
export function resolveCantidadHorasOt(
  cantidad: number | null | undefined,
  monto: number | null | undefined,
  sueldoMensual: number | null | undefined,
  pct: keyof typeof OT_FACTORS,
): number | null {
  if (cantidad != null && Number.isFinite(cantidad)) {
    return cantidad;
  }
  const m = monto ?? 0;
  const sueldo = sueldoMensual ?? 0;
  if (!m || !sueldo) return m === 0 ? 0 : null;
  const salarioPorHora = sueldo / 240;
  const denom = salarioPorHora * OT_FACTORS[pct];
  if (!denom) return null;
  return round2(m / denom);
}

function formatHorasOt(h: number | null): string {
  if (h === null || h === undefined || !Number.isFinite(h)) return "—";
  return `${h.toFixed(2)} h`;
}

export const VOUCHER_PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 10px;
    color: #1a2332;
    line-height: 1.4;
    background: #fff;
    margin: 0;
    padding: 12px;
  }

  .voucher {
    max-width: 780px;
    margin: 0 auto;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }

  /* —— Header —— */
  .v-header {
    background: linear-gradient(135deg, #0d47a1 0%, #1565c0 55%, #1976d2 100%);
    color: #fff;
    padding: 16px 20px 14px;
    position: relative;
  }
  .v-header::after {
    content: "";
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 4px;
    background: #ffc107;
  }
  .v-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .v-brand {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }
  .v-brand-sub {
    font-size: 9px;
    opacity: 0.85;
    margin-top: 3px;
    font-weight: 400;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .v-doc-label {
    text-align: right;
    flex-shrink: 0;
  }
  .v-doc-label .title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.95;
  }
  .v-doc-label .code {
    font-size: 9px;
    margin-top: 4px;
    opacity: 0.8;
    font-variant-numeric: tabular-nums;
  }

  /* —— Identity strip —— */
  .v-identity {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: #f4f7fb;
    border-bottom: 1px solid #e3e8ef;
  }
  .v-employee-name {
    font-size: 16px;
    font-weight: 700;
    color: #0d47a1;
    line-height: 1.2;
  }
  .v-employee-meta {
    font-size: 9.5px;
    color: #546e7a;
    margin-top: 4px;
  }
  .v-employee-meta span + span::before {
    content: "·";
    margin: 0 6px;
    color: #90a4ae;
  }
  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .badge-pagado { background: #e8f5e9; color: #1b5e20; border: 1px solid #a5d6a7; }
  .badge-pendiente { background: #ffebee; color: #b71c1c; border: 1px solid #ef9a9a; }

  /* —— Period bar —— */
  .v-period {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    border-bottom: 1px solid #e3e8ef;
  }
  .v-period-item {
    padding: 10px 14px;
    border-right: 1px solid #e3e8ef;
  }
  .v-period-item:last-child { border-right: none; }
  .v-period-item .lbl {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #78909c;
    margin-bottom: 2px;
    font-weight: 600;
  }
  .v-period-item .val {
    font-size: 10.5px;
    font-weight: 600;
    color: #263238;
  }

  /* —— Body —— */
  .v-body { padding: 14px 16px 16px; }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .card {
    border: 1px solid #e0e6ed;
    border-radius: 6px;
    overflow: hidden;
    background: #fff;
    page-break-inside: avoid;
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #e0e6ed;
  }
  .card-head .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .card-head.tone-neutral { background: #f7f9fc; color: #37474f; }
  .card-head.tone-neutral .dot { background: #607d8b; }
  .card-head.tone-income { background: #e8f5e9; color: #1b5e20; }
  .card-head.tone-income .dot { background: #43a047; }
  .card-head.tone-ot { background: #e3f2fd; color: #0d47a1; }
  .card-head.tone-ot .dot { background: #1976d2; }
  .card-head.tone-deduct { background: #fce4ec; color: #880e4f; }
  .card-head.tone-deduct .dot { background: #c2185b; }
  .card-head.tone-note { background: #fff8e1; color: #e65100; }
  .card-head.tone-note .dot { background: #ff9800; }

  .card-body { padding: 4px 0; }

  table.data {
    width: 100%;
    border-collapse: collapse;
  }
  table.data td {
    padding: 4px 10px;
    vertical-align: middle;
    font-size: 9.5px;
    border-bottom: 1px solid #f0f3f7;
  }
  table.data tr:last-child td { border-bottom: none; }
  table.data tr:nth-child(even) td { background: #fafbfc; }
  table.data td.l {
    color: #546e7a;
    width: 58%;
  }
  table.data td.r {
    text-align: right;
    font-weight: 600;
    color: #1a2332;
    font-variant-numeric: tabular-nums;
  }
  table.data tr.row-total td {
    background: #f5f7fa !important;
    border-top: 1px solid #cfd8dc;
    padding-top: 6px;
    padding-bottom: 6px;
    font-weight: 700;
  }
  table.data tr.row-total td.l { color: #263238; }
  table.data .amt-income { color: #2e7d32; }
  table.data .amt-deduct { color: #c62828; }
  table.data .amt-muted { color: #90a4ae; font-weight: 500; }
  table.data .ot-hrs {
    display: inline-block;
    min-width: 48px;
    color: #607d8b;
    font-weight: 500;
    font-size: 8.5px;
    margin-right: 6px;
  }

  .comment-body {
    padding: 8px 10px;
    font-size: 9.5px;
    color: #455a64;
    white-space: pre-wrap;
    min-height: 36px;
  }
  .comment-empty {
    color: #90a4ae;
    font-style: italic;
  }

  /* —— Consumos detalle —— */
  .v-consumos {
    margin-top: 12px;
    margin-bottom: 12px;
  }
  .v-consumos-meta {
    font-size: 8.5px;
    color: #607d8b;
    margin: -4px 0 8px;
  }
  .v-consumos .grid-2 { margin-bottom: 0; }
  table.detalle {
    width: 100%;
    border-collapse: collapse;
  }
  table.detalle th {
    text-align: left;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #78909c;
    font-weight: 700;
    padding: 5px 8px 3px;
    border-bottom: 1px solid #e0e6ed;
  }
  table.detalle th.r,
  table.detalle td.r {
    text-align: right;
  }
  table.detalle td {
    padding: 3px 8px;
    font-size: 8.5px;
    border-bottom: 1px solid #f0f3f7;
    vertical-align: top;
  }
  table.detalle tr:nth-child(even) td { background: #fafbfc; }
  table.detalle td.fecha {
    white-space: nowrap;
    color: #607d8b;
    width: 72px;
  }
  table.detalle td.prod { color: #37474f; }
  table.detalle td.r {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  table.detalle tr.total td {
    background: #f5f7fa !important;
    border-top: 1px solid #cfd8dc;
    border-bottom: none;
    font-weight: 700;
    padding-top: 5px;
    padding-bottom: 5px;
  }
  table.detalle tr.total td.r { color: #c62828; }
  .detalle-empty {
    padding: 10px 8px;
    font-size: 8.5px;
    color: #90a4ae;
    font-style: italic;
  }
  .detalle-error {
    padding: 10px 12px;
    font-size: 8.5px;
    color: #b71c1c;
    background: #ffebee;
    border-radius: 4px;
  }

  /* —— Net pay —— */
  .v-neto {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin: 4px 0 14px;
    padding: 14px 18px;
    border-radius: 8px;
    background: linear-gradient(135deg, #0d47a1 0%, #1565c0 100%);
    color: #fff;
    page-break-inside: avoid;
  }
  .v-neto-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.9;
  }
  .v-neto-hint {
    font-size: 8.5px;
    opacity: 0.7;
    margin-top: 2px;
  }
  .v-neto-amount {
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }

  /* —— Signatures —— */
  .v-signs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    padding: 8px 8px 4px;
    page-break-inside: avoid;
  }
  .v-sign {
    text-align: center;
    padding-top: 28px;
  }
  .v-sign-line {
    border-top: 1px solid #90a4ae;
    margin: 0 18px 6px;
  }
  .v-sign-label {
    font-size: 8.5px;
    color: #607d8b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }
  .v-sign-sub {
    font-size: 8px;
    color: #90a4ae;
    margin-top: 2px;
  }

  /* —— Footer —— */
  .v-footer {
    margin-top: 14px;
    padding: 10px 16px;
    border-top: 1px dashed #cfd8dc;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 8px;
    color: #78909c;
  }
  .v-footer-id {
    font-variant-numeric: tabular-nums;
  }

  .voucher-page {
    page-break-after: always;
    break-after: page;
  }
  .voucher-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  @media print {
    body { padding: 0; font-size: 9.5px; }
    @page { margin: 10mm; size: letter; }
    .voucher { border: 1px solid #b0bec5; border-radius: 0; max-width: none; }
    .v-header,
    .v-neto,
    .badge-pagado,
    .badge-pendiente,
    .card-head.tone-income,
    .card-head.tone-ot,
    .card-head.tone-deduct,
    .card-head.tone-note,
    .card-head.tone-neutral {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .grid-2 { gap: 10px; margin-bottom: 10px; }
    .v-neto-amount { font-size: 20px; }
    table.data tr:nth-child(even) td,
    table.detalle tr:nth-child(even) td,
    .detalle-error {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }
`;

type VoucherFormatters = {
  formatCurrency: (amount: number | null | undefined) => string;
  formatDate: (dateString: string) => string;
};

export type VoucherPageOptions = {
  consumosDetalle?: VoucherConsumosDetalle | null;
  /** Por defecto true. En PDF masivo se puede omitir. */
  includeFirmas?: boolean;
};

function buildDetalleConsumosTable(
  items: VoucherConsumoDetalleItem[],
  emptyMsg: string,
  formatters: VoucherFormatters,
): string {
  const esc = escapeHtml;
  const fc = formatters.formatCurrency;
  const fd = formatters.formatDate;

  if (!items.length) {
    return `<p class="detalle-empty">${esc(emptyMsg)}</p>`;
  }

  const total = items.reduce((acc, it) => acc + (Number(it.precio) || 0), 0);
  const body = items
    .map(
      (it) =>
        `<tr>
          <td class="fecha">${esc(fd(it.fecha))}</td>
          <td class="prod">${esc(it.producto || "N/D")}</td>
          <td class="r">${esc(fc(it.precio))}</td>
        </tr>`,
    )
    .join("");

  return `<table class="detalle">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Concepto</th>
        <th class="r">Monto</th>
      </tr>
    </thead>
    <tbody>
      ${body}
      <tr class="total">
        <td colspan="2">Total</td>
        <td class="r">${esc(fc(total))}</td>
      </tr>
    </tbody>
  </table>`;
}

function buildConsumosDetalleSection(
  consumos: VoucherConsumosDetalle | null | undefined,
  formatters: VoucherFormatters,
): string {
  if (!consumos) return "";

  const esc = escapeHtml;
  const fd = formatters.formatDate;
  const rangoTxt =
    consumos.rangoFechaInicio && consumos.rangoFechaFin
      ? `Rango consultado: ${fd(consumos.rangoFechaInicio)} — ${fd(consumos.rangoFechaFin)}`
      : "";

  const body = consumos.errorMensaje
    ? `<p class="detalle-error">${esc(consumos.errorMensaje)}</p>`
    : `<div class="grid-2">
        <section class="card">
          <div class="card-head tone-deduct"><span class="dot"></span>Detalle alimentación</div>
          <div class="card-body">
            ${buildDetalleConsumosTable(
              consumos.detalleAlimentacion,
              "Sin consumos de alimentación en el período.",
              formatters,
            )}
          </div>
        </section>
        <section class="card">
          <div class="card-head tone-note"><span class="dot"></span>Detalle alojamiento</div>
          <div class="card-body">
            ${buildDetalleConsumosTable(
              consumos.detalleAlojamiento,
              "Sin consumos de alojamiento en el período.",
              formatters,
            )}
          </div>
        </section>
      </div>`;

  return `
    <div class="v-consumos">
      <div class="card-head tone-neutral" style="border: 1px solid #e0e6ed; border-radius: 6px; margin-bottom: 8px;">
        <span class="dot"></span>Detalle de consumos
      </div>
      ${rangoTxt ? `<p class="v-consumos-meta">${esc(rangoTxt)}</p>` : ""}
      ${body}
    </div>`;
}

export function buildVoucherPageHtml(
  n: NominaDto,
  colaborador: string,
  empresaNombre: string,
  formatters: VoucherFormatters,
  options?: VoucherPageOptions,
): string {
  const esc = escapeHtml;
  const fc = formatters.formatCurrency;
  const fd = formatters.formatDate;
  const estadoPagado = n.pagado === true;
  const estadoLabel = estadoPagado ? "Pagado" : "Pendiente de pago";
  const estadoBadgeClass = estadoPagado ? "badge-pagado" : "badge-pendiente";
  const dias = (v: number | null | undefined) =>
    v === null || v === undefined ? "—" : String(v);
  const codigoNominaStr =
    n.codigoNomina && String(n.codigoNomina).trim() !== ""
      ? String(n.codigoNomina)
      : "—";

  const rows = (
    items: { label: string; value: string; total?: boolean; tone?: "income" | "deduct" | "muted" }[],
  ) =>
    items
      .map(({ label, value, total, tone }) => {
        const trClass = total ? ' class="row-total"' : "";
        const valClass =
          tone === "income"
            ? " amt-income"
            : tone === "deduct"
              ? " amt-deduct"
              : tone === "muted"
                ? " amt-muted"
                : "";
        return `<tr${trClass}><td class="l">${esc(label)}</td><td class="r${valClass}">${value}</td></tr>`;
      })
      .join("");

  const card = (title: string, tone: string, innerTable: string) =>
    `<section class="card">
      <div class="card-head tone-${tone}"><span class="dot"></span>${esc(title)}</div>
      <div class="card-body"><table class="data">${innerTable}</table></div>
    </section>`;

  const otRow = (
    label: string,
    cantidad: number | null | undefined,
    monto: number | null | undefined,
    pct: keyof typeof OT_FACTORS,
  ) => {
    const horas = formatHorasOt(
      resolveCantidadHorasOt(cantidad, monto, n.sueldoMensual, pct),
    );
    return {
      label,
      value: `<span class="ot-hrs">${esc(horas)}</span>${esc(fc(monto))}`,
    };
  };

  const generadoEl = new Date().toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return `
  <article class="voucher">
    <header class="v-header">
      <div class="v-header-top">
        <div>
          <div class="v-brand">${esc(empresaNombre || "Comprobante de nómina")}</div>
          <div class="v-brand-sub">Comprobante de pago de nómina</div>
        </div>
        <div class="v-doc-label">
          <div class="title">Voucher</div>
          <div class="code">Nómina #${esc(String(n.id))}</div>
        </div>
      </div>
    </header>

    <div class="v-identity">
      <div>
        <div class="v-employee-name">${esc(colaborador)}</div>
        <div class="v-employee-meta">
          <span>Código ${esc(codigoNominaStr)}</span>
          <span>${esc(n.nombrePeriodoNomina || "Sin período")}</span>
        </div>
      </div>
      <span class="badge ${estadoBadgeClass}">${esc(estadoLabel)}</span>
    </div>

    <div class="v-period">
      <div class="v-period-item">
        <span class="lbl">Período</span>
        <span class="val">${esc(n.nombrePeriodoNomina || "—")}</span>
      </div>
      <div class="v-period-item">
        <span class="lbl">Fecha inicio</span>
        <span class="val">${esc(fd(n.fechaInicio))}</span>
      </div>
      <div class="v-period-item">
        <span class="lbl">Fecha fin</span>
        <span class="val">${esc(fd(n.fechaFin))}</span>
      </div>
      <div class="v-period-item">
        <span class="lbl">Sueldo mensual</span>
        <span class="val">${esc(fc(n.sueldoMensual))}</span>
      </div>
    </div>

    <div class="v-body">
      <div class="grid-2">
        ${card(
          "Datos laborales",
          "neutral",
          rows([
            { label: "Días laborados", value: esc(dias(n.diasLaborados)) },
            { label: "Días vacaciones", value: esc(dias(n.diasVacaciones)) },
            {
              label: "Días incap. empresa",
              value: esc(dias(n.diasIncapacidadEmpresa)),
            },
            {
              label: "Días incap. IHSS",
              value: esc(dias(n.diasIncapacidadIHSS)),
            },
            {
              label: "Horas compensatorias",
              value: esc(dias(n.horasCompensatorias)),
            },
          ]),
        )}
        ${card(
          "Horas extra",
          "ot",
          rows([
            otRow("OT 25%", n.cantidadHoras25, n.montoHoras25, 25),
            otRow("OT 50%", n.cantidadHoras50, n.montoHoras50, 50),
            otRow("OT 75%", n.cantidadHoras75, n.montoHoras75, 75),
            otRow("OT 100%", n.cantidadHoras100, n.montoHoras100, 100),
          ]),
        )}
      </div>

      <div class="grid-2">
        ${card(
          "Percepciones",
          "income",
          rows([
            {
              label: "Subtotal quincena",
              value: esc(fc(n.subtotalQuincena)),
            },
            {
              label: "Monto vacaciones",
              value: esc(fc(n.montoVacaciones)),
            },
            {
              label: "Monto días laborados",
              value: esc(fc(n.montoDiasLaborados)),
            },
            {
              label: "Monto excedente IHSS",
              value: esc(fc(n.montoExcedenteIHSS)),
            },
            {
              label: "Monto incap. cubre empresa",
              value: esc(fc(n.montoIncapacidadCubreEmpresa)),
            },
            {
              label: "Monto permisos justificados",
              value: esc(fc(n.montoPermisosJustificados)),
            },
            { label: "(+) Ajuste", value: esc(fc(n.ajuste)) },
            {
              label: "(+) Anticipo de pago",
              value: esc(fc(n.anticipoPago)),
            },
            {
              label: "Total bruto",
              value: esc(fc(calcularTotalBrutoNomina(n))),
              total: true,
              tone: "income",
            },
          ]),
        )}
        ${card(
          "Deducciones",
          "deduct",
          rows([
            { label: "IHSS", value: esc(fc(n.deduccionIHSS)) },
            { label: "ISR", value: esc(fc(n.deduccionISR)) },
            { label: "RAP", value: esc(fc(n.deduccionRAP)) },
            {
              label: "Alimentación",
              value: esc(fc(n.deduccionAlimentacion)),
            },
            {
              label: "Alojamiento",
              value: esc(fc(n.deduccionAlojamiento)),
            },
            { label: "Cobro préstamo", value: esc(fc(n.cobroPrestamo)) },
            {
              label: "Impuesto vecinal",
              value: esc(fc(n.impuestoVecinal)),
            },
            { label: "Otros", value: esc(fc(n.otros)) },
            {
              label: "Total deducciones",
              value: esc(fc(n.totalDeducciones)),
              total: true,
              tone: "deduct",
            },
          ]),
        )}
      </div>

      <div class="v-neto">
        <div>
          <div class="v-neto-label">Total a pagar</div>
          <div class="v-neto-hint">Neto del período · ${esc(estadoLabel)}</div>
        </div>
        <div class="v-neto-amount">${esc(fc(calcularTotalAPagarNomina(n)))}</div>
      </div>

      <section class="card">
        <div class="card-head tone-note"><span class="dot"></span>Comentario</div>
        <p class="comment-body">${
          n.comentario && String(n.comentario).trim() !== ""
            ? esc(n.comentario)
            : '<span class="comment-empty">Sin comentario</span>'
        }</p>
      </section>

      ${buildConsumosDetalleSection(options?.consumosDetalle, formatters)}

      ${
        options?.includeFirmas === false
          ? ""
          : `<div class="v-signs">
        <div class="v-sign">
          <div class="v-sign-line"></div>
          <div class="v-sign-label">Recibí conforme</div>
          <div class="v-sign-sub">${esc(colaborador)}</div>
        </div>
        <div class="v-sign">
          <div class="v-sign-line"></div>
          <div class="v-sign-label">Autorizado por</div>
          <div class="v-sign-sub">Recursos Humanos</div>
        </div>
      </div>`
      }
    </div>

    <footer class="v-footer">
      <span>Documento generado el ${esc(generadoEl)}</span>
      <span class="v-footer-id">${esc(empresaNombre || "Planillero")} · ID ${esc(String(n.id))} · ${esc(codigoNominaStr)}</span>
    </footer>
  </article>`;
}

export function buildVoucherDocumentHtml(options: {
  title: string;
  bodyInnerHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(options.title)}</title>
  <style>${VOUCHER_PRINT_STYLES}</style>
</head>
<body>
${options.bodyInnerHtml}
</body>
</html>`;
}
