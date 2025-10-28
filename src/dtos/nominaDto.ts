// src/dtos/nominaDto.ts
export interface NominaDto {
  id: number;
  empleadoId: number;
  empresaId: number;
  nombrePeriodoNomina?: string | null;
  fechaInicio: string; // ISO YYYY-MM-DD
  fechaFin: string; // ISO YYYY-MM-DD
  sueldoMensual: number;

  diasLaborados?: number | null;
  diasVacaciones?: number | null;
  diasIncapacidad?: number | null;

  subtotalQuincena?: number | null;
  montoVacaciones?: number | null;
  montoDiasLaborados?: number | null;
  montoExcedenteIHSS?: number | null;
  montoIncapacidadCubreEmpresa?: number | null;

  montoHoras25?: number | null;
  montoHoras50?: number | null;
  montoHoras75?: number | null;
  montoHoras100?: number | null;

  ajuste?: number | null;
  totalPercepciones?: number | null;
  deduccionIHSS?: number | null;
  deduccionISR?: number | null;
  deduccionRAP?: number | null;
  deduccionAlimentacion?: number | null;
  cobroPrestamo?: number | null;
  impuestoVecinal?: number | null;
  otros?: number | null;
  totalDeducciones?: number | null;
  totalNetoPagar?: number | null;

  comentario?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CrearNominaDto {
  empleadoId: number;
  // empresaId se resuelve en backend
  nombrePeriodoNomina?: string | null;
  fechaInicio: string; // ISO YYYY-MM-DD
  fechaFin: string; // ISO YYYY-MM-DD
  sueldoMensual: number;

  diasLaborados?: number | null;
  diasVacaciones?: number | null;
  diasIncapacidad?: number | null;

  subtotalQuincena?: number | null;
  montoVacaciones?: number | null;
  montoDiasLaborados?: number | null;
  montoExcedenteIHSS?: number | null;
  montoIncapacidadCubreEmpresa?: number | null;

  montoHoras25?: number | null;
  montoHoras50?: number | null;
  montoHoras75?: number | null;
  montoHoras100?: number | null;

  ajuste?: number | null;
  totalPercepciones?: number | null;
  deduccionIHSS?: number | null;
  deduccionISR?: number | null;
  deduccionRAP?: number | null;
  deduccionAlimentacion?: number | null;
  cobroPrestamo?: number | null;
  impuestoVecinal?: number | null;
  otros?: number | null;
  totalDeducciones?: number | null;
  totalNetoPagar?: number | null;

  comentario?: string | null;
}

export interface ActualizarNominaDto extends Partial<CrearNominaDto> {}
