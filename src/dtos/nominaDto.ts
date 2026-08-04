// src/dtos/nominaDto.ts
export type BancoCompensatoriaAplicadaDto = {
  jobId: number | null;
  horas: number;
};

export interface NominaDto {
  id: number;
  empleadoId: number;
  empresaId: number;
  nombrePeriodoNomina?: string | null;
  codigoNomina?: string | null;
  fechaInicio: string; // ISO YYYY-MM-DD
  fechaFin: string; // ISO YYYY-MM-DD
  sueldoMensual: number;

  diasLaborados?: number | null;
  diasVacaciones?: number | null;
  diasIncapacidadEmpresa?: number | null;
  diasIncapacidadIHSS?: number | null;
  horasCompensatorias?: number | null;
  /** Snapshot inmutable de lo aplicado al banco al crear */
  bancoCompensatoriasAplicadas?: BancoCompensatoriaAplicadaDto[] | null;

  subtotalQuincena?: number | null;
  montoVacaciones?: number | null;
  montoDiasLaborados?: number | null;
  montoExcedenteIHSS?: number | null;
  montoIncapacidadCubreEmpresa?: number | null;
  montoPermisosJustificados?: number | null;

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
  deduccionAlojamiento?: number | null;
  cobroPrestamo?: number | null;
  impuestoVecinal?: number | null;
  otros?: number | null;
  totalDeducciones?: number | null;
  totalNetoPagar?: number | null;

  comentario?: string | null;
  pagado?: boolean;

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
  diasIncapacidadEmpresa?: number | null;
  diasIncapacidadIHSS?: number | null;
  horasCompensatorias?: number | null;
  /** Desglose de horas acumuladas por job (horas crudas > 0) */
  bancoCompensatoriasAplicadas?: BancoCompensatoriaAplicadaDto[];

  subtotalQuincena?: number | null;
  montoVacaciones?: number | null;
  montoDiasLaborados?: number | null;
  montoExcedenteIHSS?: number | null;
  montoIncapacidadCubreEmpresa?: number | null;
  montoPermisosJustificados?: number | null;

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
  deduccionAlojamiento?: number | null;
  cobroPrestamo?: number | null;
  impuestoVecinal?: number | null;
  otros?: number | null;
  totalDeducciones?: number | null;
  totalNetoPagar?: number | null;

  comentario?: string | null;
}

/** En actualización no se permiten cambiar empleado, horas compensatorias ni el snapshot del banco. */
export type ActualizarNominaDto = Partial<
  Omit<
    CrearNominaDto,
    "empleadoId" | "horasCompensatorias" | "bancoCompensatoriasAplicadas"
  >
>;
