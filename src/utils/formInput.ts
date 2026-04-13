const PASSWORD_FIELD_NAMES = new Set<string>([
  "contrasena",
  "contrasenaActual",
  "nuevaContrasena",
]);

/**
 * Recorta espacios al inicio y final. No aplica a contraseñas
 * (type password o nombres de campo conocidos).
 */
export function trimFormTextValue(
  name: string,
  value: string,
  inputType: string
): string {
  if (inputType === "password") return value;
  if (PASSWORD_FIELD_NAMES.has(name)) return value;
  return value.trim();
}
