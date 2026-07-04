export const CODIGO_JOB_VACACIONES = "E02";

const HOURS_EPS = 0.001;

export const E02_DUPLICATE_DAY_MESSAGE =
  "Solo se permite una actividad de vacaciones (E02) por día.";

export function isJobE02(
  job: { codigo?: string | null } | null | undefined
): boolean {
  return (job?.codigo ?? "").trim().toUpperCase() === CODIGO_JOB_VACACIONES;
}

export function isActivityE02(
  act: { job?: { codigo?: string }; jobId?: number },
  jobsById?: ReadonlyMap<number, { codigo?: string | null }>
): boolean {
  if (act.job?.codigo && isJobE02({ codigo: act.job.codigo })) return true;
  if (act.jobId != null && jobsById?.has(act.jobId)) {
    return isJobE02(jobsById.get(act.jobId)!);
  }
  return false;
}

export function getE02AllowedHours(
  horasNormales: number
): { media: number; completa: number } | null {
  if (!Number.isFinite(horasNormales) || horasNormales <= 0) return null;
  const completa = Math.round(horasNormales * 100) / 100;
  const media = Math.round((horasNormales / 2) * 100) / 100;
  return { media, completa };
}

export function isValidE02Hours(
  hours: number,
  horasNormales: number
): boolean {
  const allowed = getE02AllowedHours(horasNormales);
  if (!allowed || !Number.isFinite(hours)) return false;
  return (
    Math.abs(hours - allowed.media) < HOURS_EPS ||
    Math.abs(hours - allowed.completa) < HOURS_EPS
  );
}

export function formatE02HoursInvalidMessage(horasNormales: number): string {
  const allowed = getE02AllowedHours(horasNormales);
  if (!allowed) {
    return "Vacaciones (E02): seleccione media jornada o jornada completa.";
  }
  return `Vacaciones (E02): solo media jornada (${allowed.media}h) o jornada completa (${allowed.completa}h).`;
}

export function resolveE02JornadaTipo(
  hours: number,
  horasNormales: number
): "media" | "completa" | "" {
  const allowed = getE02AllowedHours(horasNormales);
  if (!allowed || !Number.isFinite(hours)) return "";
  if (Math.abs(hours - allowed.media) < HOURS_EPS) return "media";
  if (Math.abs(hours - allowed.completa) < HOURS_EPS) return "completa";
  return "";
}

export function dayHasOtherE02Activity(params: {
  activities: ReadonlyArray<{
    id?: number;
    jobId?: number;
    job?: { codigo?: string };
  }>;
  jobsById: ReadonlyMap<number, { codigo?: string | null }>;
  excludeActivityId?: number;
  excludeActivityIndex?: number;
}): boolean {
  const { activities, jobsById, excludeActivityId, excludeActivityIndex } =
    params;
  return activities.some((act, idx) => {
    if (excludeActivityId != null && act.id === excludeActivityId) return false;
    if (
      excludeActivityIndex != null &&
      excludeActivityIndex >= 0 &&
      idx === excludeActivityIndex
    ) {
      return false;
    }
    return isActivityE02(act, jobsById);
  });
}
