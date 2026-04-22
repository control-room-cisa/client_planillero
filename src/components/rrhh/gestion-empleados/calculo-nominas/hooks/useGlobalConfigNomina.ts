import * as React from "react";
import { GlobalConfigService } from "../../../../../services/globalConfigService";

export interface UseGlobalConfigNominaReturn {
  cfgPisoIhss: number;
  cfgDeduccionIhssFija: number;
}

/**
 * Carga desde `global_config` los parámetros:
 *  - PISO_IHSS (fallback 11903.13)
 *  - DEDUCCION_IHSS_FIJA (fallback 595.16)
 */
export function useGlobalConfigNomina(): UseGlobalConfigNominaReturn {
  const [cfgPisoIhss, setCfgPisoIhss] = React.useState<number>(11903.13);
  const [cfgDeduccionIhssFija, setCfgDeduccionIhssFija] =
    React.useState<number>(595.16);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [piso, ded] = await Promise.all([
          GlobalConfigService.get("PISO_IHSS"),
          GlobalConfigService.get("DEDUCCION_IHSS_FIJA"),
        ]);
        const pisoN = piso ? Number(piso.value) : NaN;
        const dedN = ded ? Number(ded.value) : NaN;
        if (!mounted) return;
        if (Number.isFinite(pisoN) && pisoN > 0) setCfgPisoIhss(pisoN);
        if (Number.isFinite(dedN) && dedN >= 0) setCfgDeduccionIhssFija(dedN);
      } catch {
        // Silencioso: se mantienen fallbacks
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { cfgPisoIhss, cfgDeduccionIhssFija };
}
