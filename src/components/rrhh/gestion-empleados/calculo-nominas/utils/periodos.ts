// Utilidades de períodos (quincenas) para el módulo de cálculo de nóminas.
// Extraídas de CalculoNominasDashboard.tsx sin alterar su lógica.

/** Año mínimo del selector de nómina (inclusive). */
export const MIN_AÑO_NOMINA = 2025;

export type IntervaloNominaCalculo = {
  label: string;
  fechaInicio: string;
  fechaFin: string;
  valor: string;
};

/** YYYY-MM-DD en calendario local (evita corrimientos con toISOString). */
export const toYmdLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const MESES_LARGOS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/** Nombre del mes de la fecha de fin (ISO YYYY-MM-DD), para encabezados de grupo. */
export function nombreMesFinIso(fechaFinIso: string): string {
  const m = Number(fechaFinIso.slice(5, 7));
  if (!m || m < 1 || m > 12) return "";
  return MESES_LARGOS_ES[m - 1];
}

/** A = primera quincena (fin día 11), B = segunda (fin día 26). */
export function etiquetaQuincenaAB(fin: Date): "A" | "B" {
  return fin.getDate() === 11 ? "A" : "B";
}

/**
 * Intervalos de quincena para un año de nómina atribuido por fecha de fin:
 * - Segunda quincena: 12–26 del mes M (fin día 26, mismo mes).
 * - Primera quincena: 27 del mes M−1 al 11 del mes M (fin día 11; ej. 27 dic – 11 ene → enero del año de fin).
 * Si `año` es el año calendario actual, se incluyen períodos cerrados
 * (fechaFin <= hoy) y también el período en curso.
 */
export function construirIntervalosParaAño(
  año: number,
  hoy: Date = new Date(),
): IntervaloNominaCalculo[] {
  const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const esAñoActual = año === hoyNorm.getFullYear();
  const intervalos: IntervaloNominaCalculo[] = [];

  const formatearFecha = (fecha: Date) => {
    const dia = fecha.getDate().toString().padStart(2, "0");
    const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
    const yy = String(fecha.getFullYear() % 100).padStart(2, "0");
    return `${dia}/${mes}/${yy}`;
  };
  const incluirIntervalo = (inicio: Date, fin: Date) => {
    if (!esAñoActual) return true;
    const periodoCerrado = fin <= hoyNorm;
    const periodoEnCurso = hoyNorm >= inicio && hoyNorm <= fin;
    return periodoCerrado || periodoEnCurso;
  };

  for (let m = 0; m < 12; m++) {
    const inicio2q = new Date(año, m, 12);
    const fin2q = new Date(año, m, 26);
    if (incluirIntervalo(inicio2q, fin2q)) {
      const fi = toYmdLocal(inicio2q);
      const ff = toYmdLocal(fin2q);
      intervalos.push({
        label: `${formatearFecha(inicio2q)} - ${formatearFecha(fin2q)} ${etiquetaQuincenaAB(fin2q)}`,
        fechaInicio: fi,
        fechaFin: ff,
        valor: `${fi}_${ff}`,
      });
    }

    const inicio1q = new Date(año, m - 1, 27);
    const fin1q = new Date(año, m, 11);
    if (incluirIntervalo(inicio1q, fin1q)) {
      const fi = toYmdLocal(inicio1q);
      const ff = toYmdLocal(fin1q);
      intervalos.push({
        label: `${formatearFecha(inicio1q)} - ${formatearFecha(fin1q)} ${etiquetaQuincenaAB(fin1q)}`,
        fechaInicio: fi,
        fechaFin: ff,
        valor: `${fi}_${ff}`,
      });
    }
  }

  intervalos.sort((a, b) =>
    a.fechaFin < b.fechaFin ? 1 : a.fechaFin > b.fechaFin ? -1 : 0,
  );
  return intervalos;
}

/** YYYY-MM de fechaFin: agrupa A y B del mismo mes sin línea entre ellas. */
export function claveMesFinIso(fechaFin: string): string {
  return fechaFin.length >= 7 ? fechaFin.slice(0, 7) : fechaFin;
}

/**
 * Devuelve el nombre humano del período de nómina según las fechas inicio/fin.
 * - 27..11 → "Primera quincena de <mes fin> de <año fin>"
 * - 12..26 → "Segunda quincena de <mes fin> de <año fin>"
 */
export function getNombrePeriodoNomina(iniISO: string, finISO: string): string {
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const ini = new Date(iniISO + (iniISO.length === 10 ? "T00:00:00" : ""));
  const fin = new Date(finISO + (finISO.length === 10 ? "T00:00:00" : ""));
  const diaFin = fin.getDate();
  const mesFin = meses[fin.getMonth()];
  const añoFin = fin.getFullYear();
  if (diaFin === 11) return `Primera quincena de ${mesFin} de ${añoFin}`;
  if (diaFin === 26) return `Segunda quincena de ${mesFin} de ${añoFin}`;
  const diaIni = ini.getDate();
  if (diaIni === 27) return `Primera quincena de ${mesFin} de ${añoFin}`;
  if (diaIni === 12) return `Segunda quincena de ${mesFin} de ${añoFin}`;
  return `Quincena de ${mesFin} de ${añoFin}`;
}
