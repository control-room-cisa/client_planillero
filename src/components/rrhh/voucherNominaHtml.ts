import type { NominaDto } from "../../dtos/nominaDto";
import {
  calcularTotalAPagarNomina,
  calcularTotalBrutoNomina,
} from "./gestion-empleados/calculo-nominas/utils/nominaTotales";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const VOUCHER_PRINT_STYLES = `
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9.5px; margin: 10px; color: #222; line-height: 1.25; }
    h1 { font-size: 14px; text-align: center; margin: 0 0 2px; }
    .sub { text-align: center; color: #555; font-size: 9px; margin-bottom: 4px; }
    .badge {
      display: inline-block;
      color: #fff;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: bold;
    }
    .badge-pagado { background: #2e7d32; }
    .badge-pendiente { background: #c62828; }
    .badge-perc { background: #2e7d32; }
    .badge-ded { background: #c62828; }
    .badge-neto { background: #1565c0; }
    .hdr-badge { text-align: center; margin-bottom: 8px; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      align-items: start;
      margin-bottom: 8px;
    }
    .card {
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      padding: 6px 8px;
      background: #fafafa;
      page-break-inside: avoid;
    }
    .card h2 {
      font-size: 10px;
      margin: 0 0 5px;
      padding-bottom: 3px;
      border-bottom: 1px solid #ccc;
      color: #333;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    table.data { width: 100%; border-collapse: collapse; margin: 0; }
    table.data td { padding: 2px 4px; vertical-align: top; border-bottom: 1px solid #eee; font-size: 9.5px; }
    table.data tr:last-child td { border-bottom: none; }
    table.data td.l { font-weight: 600; width: 52%; color: #444; }
    table.data td.r { text-align: right; }
    .total-footer { text-align: right; margin-top: 6px; page-break-inside: avoid; }
    .card-comment .comment-body {
      margin: 0;
      white-space: pre-wrap;
      font-size: 9.5px;
    }
    .muted { color: #666; font-size: 8.5px; margin-top: 6px; text-align: center; }
    .voucher-page {
      page-break-after: always;
      break-after: page;
    }
    .voucher-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    @media print {
      body { margin: 0; font-size: 9px; }
      @page { margin: 8mm; size: letter; }
      .grid-2 { gap: 6px; margin-bottom: 6px; }
      .card { padding: 5px 6px; background: #fff; }
      .card h2 { font-size: 9px; }
      table.data td { font-size: 9px; padding: 1px 3px; }
      .badge-pagado, .badge-pendiente, .badge-perc, .badge-ded, .badge-neto { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
`;

type VoucherFormatters = {
  formatCurrency: (amount: number | null | undefined) => string;
  formatDate: (dateString: string) => string;
};

export function buildVoucherPageHtml(
  n: NominaDto,
  colaborador: string,
  empresaNombre: string,
  formatters: VoucherFormatters,
): string {
  const esc = escapeHtml;
  const fc = formatters.formatCurrency;
  const fd = formatters.formatDate;
  const estadoPagado = n.pagado === true;
  const estadoLabel = estadoPagado ? "Pagado" : "Pendiente de Pago";
  const estadoBadgeClass = estadoPagado ? "badge-pagado" : "badge-pendiente";
  const dias = (v: number | null | undefined) =>
    v === null || v === undefined ? "-" : String(v);
  const codigoNominaStr =
    n.codigoNomina && String(n.codigoNomina).trim() !== ""
      ? String(n.codigoNomina)
      : "—";

  const rows = (items: [string, string][]) =>
    items
      .map(
        ([label, val]) =>
          `<tr><td class="l">${esc(label)}</td><td class="r">${val}</td></tr>`,
      )
      .join("");

  const card = (title: string, innerTable: string) =>
    `<section class="card"><h2>${esc(title)}</h2><table class="data">${innerTable}</table></section>`;

  return `
  <h1>Voucher ${esc(colaborador)}</h1>
  <div class="sub">${esc(empresaNombre)}${
    empresaNombre ? " · " : ""
  }${esc(n.nombrePeriodoNomina || "—")}</div>
  <div class="hdr-badge"><span class="badge ${estadoBadgeClass}">${esc(estadoLabel)}</span></div>

  <div class="grid-2">
    ${card(
      "Información general",
      rows([
        ["ID nómina", esc(String(n.id))],
        ["Código nómina", esc(codigoNominaStr)],
        ["Colaborador", esc(colaborador)],
        ["Empresa", esc(empresaNombre || "—")],
        ["Período", esc(n.nombrePeriodoNomina || "—")],
        ["Fecha inicio", esc(fd(n.fechaInicio))],
        ["Fecha fin", esc(fd(n.fechaFin))],
        ["Estado", esc(estadoLabel)],
      ]),
    )}
    ${card(
      "Datos base",
      rows([
        ["Sueldo mensual", esc(fc(n.sueldoMensual))],
        ["Días laborados", esc(dias(n.diasLaborados))],
        ["Días vacaciones", esc(dias(n.diasVacaciones))],
        ["Días incap. empresa", esc(dias(n.diasIncapacidadEmpresa))],
        ["Días incap. IHSS", esc(dias(n.diasIncapacidadIHSS))],
        ["Horas compensatorias", esc(dias(n.horasCompensatorias))],
      ]),
    )}
  </div>

  <div class="grid-2">
    ${card(
      "Percepciones",
      rows([
        ["Subtotal quincena", esc(fc(n.subtotalQuincena))],
        ["Monto vacaciones", esc(fc(n.montoVacaciones))],
        ["Monto días laborados", esc(fc(n.montoDiasLaborados))],
        ["Monto excedente IHSS", esc(fc(n.montoExcedenteIHSS))],
        [
          "Monto incap. cubre empresa",
          esc(fc(n.montoIncapacidadCubreEmpresa)),
        ],
        ["Monto permisos justificados", esc(fc(n.montoPermisosJustificados))],
        [
          "Total bruto",
          `<span class="badge badge-perc">${esc(fc(calcularTotalBrutoNomina(n)))}</span>`,
        ],
      ]),
    )}
    ${card(
      "Horas extra",
      rows([
        ["OT 25%", esc(fc(n.montoHoras25))],
        ["OT 50%", esc(fc(n.montoHoras50))],
        ["OT 75%", esc(fc(n.montoHoras75))],
        ["OT 100%", esc(fc(n.montoHoras100))],
      ]),
    )}
  </div>

  <div class="grid-2">
    ${card(
      "Deducciones",
      rows([
        ["IHSS", esc(fc(n.deduccionIHSS))],
        ["ISR", esc(fc(n.deduccionISR))],
        ["RAP", esc(fc(n.deduccionRAP))],
        ["Alimentación", esc(fc(n.deduccionAlimentacion))],
        ["Alojamiento", esc(fc(n.deduccionAlojamiento))],
        ["Cobro préstamo", esc(fc(n.cobroPrestamo))],
        ["Impuesto vecinal", esc(fc(n.impuestoVecinal))],
        ["Otros", esc(fc(n.otros))],
        ["Ajuste", esc(fc(n.ajuste))],
        [
          "Total deducciones",
          `<span class="badge badge-ded">${esc(fc(n.totalDeducciones))}</span>`,
        ],
      ]),
    )}
    <section class="card card-comment"><h2>Comentario</h2><p class="comment-body">${
      n.comentario && String(n.comentario).trim() !== ""
        ? esc(n.comentario)
        : '<span class="muted">Sin comentario</span>'
    }</p></section>
  </div>

  <div class="total-footer"><span class="badge badge-neto">Total a pagar: ${esc(fc(calcularTotalAPagarNomina(n)))}</span></div>
  <p class="muted">Documento generado el ${esc(
    new Date().toLocaleString("es-HN", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  )}</p>`;
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
