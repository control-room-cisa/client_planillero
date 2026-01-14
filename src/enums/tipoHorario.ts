export const TipoHorario = {
  H1_1: "H1_1",
  H1_2: "H1_2",
  H1_3: "H1_3",
  H1_4: "H1_4",
  H1_5: "H1_5",
  H1_6: "H1_6",
  H2_1: "H2_1",
  H2_2: "H2_2",
} as const;

export type TipoHorario = (typeof TipoHorario)[keyof typeof TipoHorario];

export const TIPOS_HORARIO: readonly TipoHorario[] = [
  TipoHorario.H1_1,
  TipoHorario.H1_2,
  TipoHorario.H1_3,
  TipoHorario.H1_4,
  TipoHorario.H1_5,
  TipoHorario.H1_6,
  TipoHorario.H2_1,
  TipoHorario.H2_2,
] as const;

export const TIPO_HORARIO_LABEL: Record<TipoHorario, string> = {
  [TipoHorario.H1_1]: "(H1.1) Lunes a Viernes",
  [TipoHorario.H1_2]: "(H1.2) Martes a Sábado",
  [TipoHorario.H1_3]: "(H1.3) Miércoles a Domingo",
  [TipoHorario.H1_4]: "(H1.4) Días alternos Cocina",
  [TipoHorario.H1_5]: "(H1.5) Días alternos Medio Ambiente",
  [TipoHorario.H1_6]: "(H1.6) Lunes a Sábado",
  [TipoHorario.H2_1]: "(H2.1) Turnos 7x7 Copenergy",
  [TipoHorario.H2_2]: "(H2.2) Lunes a Viernes Copenergy",
};

export function getTipoHorarioLabel(tipoHorario?: string | null): string {
  if (!tipoHorario) return "N/A";
  return (TIPO_HORARIO_LABEL as Record<string, string>)[tipoHorario] || tipoHorario;
}


