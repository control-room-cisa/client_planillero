// Utilidades de formateo y sanitización numérica para el módulo de cálculo de nóminas.
// Extraídas de CalculoNominasDashboard.tsx sin alterar su lógica.

/** Redondeo a 2 decimales estable ante errores de punto flotante. */
export const roundTo2Decimals = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
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
