export type ValidationErrorsMap = {
  fechasNoAprobadas?: string[];
  fechasSinRegistro?: string[];
  fechasConJobDesconocido?: string[];
  erroresIncapacidad?: string[];
  [key: string]: string[] | undefined;
};

const KNOWN_KEYS = [
  "fechasNoAprobadas",
  "fechasSinRegistro",
  "fechasConJobDesconocido",
  "erroresIncapacidad",
] as const;

export const formatFechaValidacion = (fecha: string) =>
  new Date(fecha + "T00:00:00").toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const hasPendingValidations = (
  ve?: ValidationErrorsMap | null,
): boolean => {
  if (!ve) return false;
  return Object.values(ve).some(
    (arr) => Array.isArray(arr) && arr.length > 0,
  );
};

export const getValidationErrorsFromError = (
  error: unknown,
): ValidationErrorsMap | null => {
  const ve = (error as any)?.response?.data?.validationErrors;
  return hasPendingValidations(ve) ? (ve as ValidationErrorsMap) : null;
};

export const buildValidationErrorsMessage = (
  ve?: ValidationErrorsMap | null,
): string | null => {
  if (!hasPendingValidations(ve) || !ve) return null;
  const parts: string[] = [];
  if (ve.fechasNoAprobadas?.length) {
    parts.push(
      `Fechas no aprobadas: ${ve.fechasNoAprobadas.map(formatFechaValidacion).join(", ")}`,
    );
  }
  if (ve.fechasSinRegistro?.length) {
    parts.push(
      `Fechas sin registro: ${ve.fechasSinRegistro.map(formatFechaValidacion).join(", ")}`,
    );
  }
  if (ve.fechasConJobDesconocido?.length) {
    parts.push(
      `Fechas con Job desconocido: ${ve.fechasConJobDesconocido.map(formatFechaValidacion).join(", ")}`,
    );
  }
  if (ve.erroresIncapacidad?.length) {
    parts.push(`Incapacidad IHSS: ${ve.erroresIncapacidad.join("; ")}`);
  }
  for (const [key, values] of Object.entries(ve)) {
    if ((KNOWN_KEYS as readonly string[]).includes(key)) continue;
    if (Array.isArray(values) && values.length > 0) {
      parts.push(`${key}: ${values.join(", ")}`);
    }
  }
  return parts.length ? parts.join(". ") : null;
};

export const otherValidationEntries = (
  ve?: ValidationErrorsMap | null,
): [string, string[]][] => {
  if (!ve) return [];
  return Object.entries(ve).filter(
    ([k, v]) =>
      !(KNOWN_KEYS as readonly string[]).includes(k) &&
      Array.isArray(v) &&
      v.length > 0,
  ) as [string, string[]][];
};
