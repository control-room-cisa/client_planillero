import type { Empleado } from "../../../../services/empleadoService";

export const MAX_CAMPOS_EDICION_MASIVA = 5;

export type BulkEditFieldKey =
  | "telefono"
  | "direccion"
  | "correoElectronico"
  | "numeroCuenta"
  | "banco"
  | "tipoCuenta"
  | "cargo"
  | "profesion"
  | "estadoCivil"
  | "nombreConyugue"
  | "condicionSalud"
  | "nombreContactoEmergencia"
  | "numeroContactoEmergencia"
  | "muerteBeneficiario"
  | "nombreMadre"
  | "nombrePadre"
  | "fechaInicioIngreso";

export type BulkFieldInputKind = "text" | "select" | "date";

export type BulkFieldOption = { value: string; label: string };

export type BulkEditFieldDef = {
  key: BulkEditFieldKey;
  label: string;
  group: string;
  kind: BulkFieldInputKind;
  maxLength?: number;
  options?: BulkFieldOption[];
};

const TIPO_CUENTA_OPTIONS: BulkFieldOption[] = [
  { value: "AHORROS_MONEDA_NACIONAL", label: "Ahorros moneda nacional" },
  { value: "AHORROS_MONEDA_EXTRANJERA", label: "Ahorros moneda extranjera" },
  { value: "CHEQUES_MONEDA_NACIONAL", label: "Cheques moneda nacional" },
  { value: "CHEQUES_MONEDA_EXTRANJERA", label: "Cheques moneda extranjera" },
];

const ESTADO_CIVIL_OPTIONS: BulkFieldOption[] = [
  { value: "SOLTERO", label: "Soltero" },
  { value: "CASADO", label: "Casado" },
  { value: "UNION_LIBRE", label: "Unión Libre" },
];

export const BULK_EDIT_FIELDS: BulkEditFieldDef[] = [
  { key: "telefono", label: "Teléfono", group: "Contacto", kind: "text", maxLength: 45 },
  { key: "direccion", label: "Dirección", group: "Contacto", kind: "text", maxLength: 250 },
  {
    key: "correoElectronico",
    label: "Correo electrónico",
    group: "Contacto",
    kind: "text",
    maxLength: 120,
  },
  { key: "numeroCuenta", label: "Número de cuenta", group: "Bancario", kind: "text", maxLength: 20 },
  { key: "banco", label: "Banco", group: "Bancario", kind: "text", maxLength: 25 },
  {
    key: "tipoCuenta",
    label: "Tipo de cuenta",
    group: "Bancario",
    kind: "select",
    options: TIPO_CUENTA_OPTIONS,
  },
  { key: "cargo", label: "Cargo", group: "Laboral", kind: "text", maxLength: 30 },
  { key: "profesion", label: "Profesión", group: "Laboral", kind: "text", maxLength: 30 },
  {
    key: "fechaInicioIngreso",
    label: "Fecha de ingreso",
    group: "Laboral",
    kind: "date",
  },
  {
    key: "estadoCivil",
    label: "Estado civil",
    group: "Personal",
    kind: "select",
    options: ESTADO_CIVIL_OPTIONS,
  },
  {
    key: "nombreConyugue",
    label: "Nombre del cónyuge",
    group: "Personal",
    kind: "text",
    maxLength: 40,
  },
  {
    key: "condicionSalud",
    label: "Condición de salud",
    group: "Personal",
    kind: "text",
    maxLength: 50,
  },
  {
    key: "nombreContactoEmergencia",
    label: "Contacto emergencia (nombre)",
    group: "Emergencia / familia",
    kind: "text",
    maxLength: 40,
  },
  {
    key: "numeroContactoEmergencia",
    label: "Contacto emergencia (número)",
    group: "Emergencia / familia",
    kind: "text",
    maxLength: 20,
  },
  {
    key: "muerteBeneficiario",
    label: "Beneficiario por muerte",
    group: "Emergencia / familia",
    kind: "text",
    maxLength: 40,
  },
  { key: "nombreMadre", label: "Nombre de la madre", group: "Emergencia / familia", kind: "text", maxLength: 40 },
  { key: "nombrePadre", label: "Nombre del padre", group: "Emergencia / familia", kind: "text", maxLength: 40 },
];

const TIPO_CUENTA_FROM_LABEL: Record<string, string> = {
  "Ahorros moneda nacional": "AHORROS_MONEDA_NACIONAL",
  "Ahorros moneda extranjera": "AHORROS_MONEDA_EXTRANJERA",
  "Cheques moneda nacional": "CHEQUES_MONEDA_NACIONAL",
  "Cheques moneda extranjera": "CHEQUES_MONEDA_EXTRANJERA",
};

export function normalizeTipoCuenta(value: string | null | undefined): string {
  if (!value) return "";
  if (TIPO_CUENTA_FROM_LABEL[value]) return TIPO_CUENTA_FROM_LABEL[value];
  if (TIPO_CUENTA_OPTIONS.some((o) => o.value === value)) return value;
  return value;
}

export function toDateInputValue(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

export function readBulkFieldValue(
  empleado: Empleado,
  key: BulkEditFieldKey,
): string {
  switch (key) {
    case "tipoCuenta":
      return normalizeTipoCuenta(empleado.tipoCuenta);
    case "fechaInicioIngreso":
      return toDateInputValue(empleado.fechaInicioIngreso);
    default: {
      const raw = empleado[key];
      return raw == null ? "" : String(raw);
    }
  }
}

export function valuesEqual(a: string, b: string): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

export function validateBulkField(
  key: BulkEditFieldKey,
  value: string,
): string | null {
  const v = value.trim();
  switch (key) {
    case "correoElectronico":
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return "Correo inválido";
      }
      break;
    case "telefono":
      if (v && !/^\+?\d+$/.test(v)) {
        return "Solo números y opcionalmente + al inicio";
      }
      if (v.length > 45) return "Máximo 45 caracteres";
      break;
    case "direccion":
      if (v.length > 250) return "Máximo 250 caracteres";
      break;
    case "profesion":
    case "cargo":
      if (v.length > 30) return "Máximo 30 caracteres";
      break;
    case "banco":
      if (v.length > 25) return "Máximo 25 caracteres";
      break;
    case "numeroCuenta":
    case "numeroContactoEmergencia":
      if (v.length > 20) return "Máximo 20 caracteres";
      break;
    case "condicionSalud":
      if (v.length > 50) return "Máximo 50 caracteres";
      break;
    case "nombreConyugue":
    case "nombreContactoEmergencia":
    case "muerteBeneficiario":
    case "nombreMadre":
    case "nombrePadre":
      if (v.length > 40) return "Máximo 40 caracteres";
      break;
    default:
      break;
  }
  return null;
}

export function groupedBulkFields(): Array<{
  group: string;
  fields: BulkEditFieldDef[];
}> {
  const order: string[] = [];
  const map = new Map<string, BulkEditFieldDef[]>();
  for (const field of BULK_EDIT_FIELDS) {
    if (!map.has(field.group)) {
      map.set(field.group, []);
      order.push(field.group);
    }
    map.get(field.group)!.push(field);
  }
  return order.map((group) => ({ group, fields: map.get(group)! }));
}
