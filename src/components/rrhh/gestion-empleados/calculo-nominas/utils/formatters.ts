// Utilidades de formateo y sanitización numérica para el módulo de cálculo de nóminas.
// Extraídas de CalculoNominasDashboard.tsx sin alterar su lógica.

/** Redondeo a 2 decimales estable ante errores de punto flotante. */
export const roundTo2Decimals = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/** Monto proporcional al salario quincenal por N días del período; redondeo solo al final. */
export const montoPorDiasQuincena = (
  salarioQuincenal: number,
  dias: number,
  periodoNomina: number,
): number =>
  roundTo2Decimals(
    (salarioQuincenal * dias) / (periodoNomina > 0 ? periodoNomina : 15),
  );

/**
 * Separa montoDiasLaborados entre horas de jobs normales y permiso justificado
 * con la misma tarifa horaria. El permiso no se muestra en tablas por job.
 */
export const repartirMontoDiasLaboradosConPermisoJustificado = (
  montoDiasLaborados: number,
  horasJobsNormales: number,
  horasPermisoJustificado: number,
): {
  precioHora: number;
  montoJobsNormales: number;
  montoPermisoJustificado: number;
} => {
  const monto = Number(montoDiasLaborados) || 0;
  const hJobs = Math.max(0, Number(horasJobsNormales) || 0);
  const hPermiso = Math.max(0, Number(horasPermisoJustificado) || 0);
  const hTotal = hJobs + hPermiso;

  if (monto <= 0 || hTotal <= 0) {
    return {
      precioHora: 0,
      montoJobsNormales: 0,
      montoPermisoJustificado: 0,
    };
  }

  const precioHora = monto / hTotal;
  const montoPermisoJustificado = roundTo2Decimals(hPermiso * precioHora);
  const montoJobsNormales = roundTo2Decimals(monto - montoPermisoJustificado);

  return {
    precioHora,
    montoJobsNormales,
    montoPermisoJustificado,
  };
};

/**
 * Sanitiza entrada mientras el usuario escribe: solo permite números y punto decimal.
 * - Permite un solo punto decimal.
 * - Limita a 2 dígitos decimales.
 * - Elimina ceros a la izquierda salvo "0" o "0.".
 */
export const sanitizeDecimalInput = (value: string): string => {
  if (!value) return "";

  // Eliminar todo excepto números y punto
  let cleaned = value.replace(/[^0-9.]/g, "");

  // Permitir solo un punto decimal
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }

  // Limitar decimales a 2 dígitos (pero permitir escribir el punto)
  if (parts.length === 2 && parts[1] && parts[1].length > 2) {
    cleaned = parts[0] + "." + parts[1].substring(0, 2);
  }

  // Eliminar ceros a la izquierda excepto "0." o "0" o si está vacío
  if (cleaned.length > 1 && cleaned[0] === "0" && cleaned[1] !== ".") {
    cleaned = cleaned.replace(/^0+/, "") || "0";
  }

  return cleaned;
};

/** Convierte string sanitizado a número redondeado (>= 0). */
export const parseDecimalValue = (value: string): number => {
  if (!value || value === "." || value === "") return 0;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return roundTo2Decimals(num);
};

/** Formato de moneda L (Lempira) para Honduras con 2 decimales. */
export const formatCurrency = (valor: number): string => {
  return `${(valor || 0).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} L`;
};
