import * as React from "react";
import { GlobalConfigService } from "../../../../../services/globalConfigService";
import {
  DEFAULT_POLITICA_DEDUCCIONES,
  GLOBAL_CONFIG_KEYS_DEDUCCION_MODO,
  parseModoDeduccionQuincena,
  type PoliticaDeduccionesQuincena,
} from "../utils/deduccionesQuincena";

export interface UseGlobalConfigNominaReturn {
  cfgPisoIhss: number;
  cfgDeduccionIhssFija: number;
  politicaDeducciones: PoliticaDeduccionesQuincena;
}

/**
 * Carga desde `global_config` los parámetros:
 *  - PISO_IHSS (fallback 11903.13)
 *  - DEDUCCION_IHSS_FIJA (fallback 595.16)
 *  - Modos de reparto IHSS / RAP / ISR / impuesto vecinal (fallback SOLO_B)
 */
export function useGlobalConfigNomina(): UseGlobalConfigNominaReturn {
  const [cfgPisoIhss, setCfgPisoIhss] = React.useState<number>(11903.13);
  const [cfgDeduccionIhssFija, setCfgDeduccionIhssFija] =
    React.useState<number>(595.16);
  const [politicaDeducciones, setPoliticaDeducciones] =
    React.useState<PoliticaDeduccionesQuincena>(DEFAULT_POLITICA_DEDUCCIONES);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [piso, ded, modoIhss, modoRap, modoIsr, modoVecinal] =
          await Promise.all([
            GlobalConfigService.get("PISO_IHSS"),
            GlobalConfigService.get("DEDUCCION_IHSS_FIJA"),
            GlobalConfigService.get(GLOBAL_CONFIG_KEYS_DEDUCCION_MODO.ihss),
            GlobalConfigService.get(GLOBAL_CONFIG_KEYS_DEDUCCION_MODO.rap),
            GlobalConfigService.get(GLOBAL_CONFIG_KEYS_DEDUCCION_MODO.isr),
            GlobalConfigService.get(
              GLOBAL_CONFIG_KEYS_DEDUCCION_MODO.impuestoVecinal,
            ),
          ]);
        const pisoN = piso ? Number(piso.value) : NaN;
        const dedN = ded ? Number(ded.value) : NaN;
        if (!mounted) return;
        if (Number.isFinite(pisoN) && pisoN > 0) setCfgPisoIhss(pisoN);
        if (Number.isFinite(dedN) && dedN >= 0) setCfgDeduccionIhssFija(dedN);
        setPoliticaDeducciones({
          ihss: parseModoDeduccionQuincena(modoIhss?.value),
          rap: parseModoDeduccionQuincena(modoRap?.value),
          isr: parseModoDeduccionQuincena(modoIsr?.value),
          impuestoVecinal: parseModoDeduccionQuincena(modoVecinal?.value),
        });
      } catch {
        // Silencioso: se mantienen fallbacks
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { cfgPisoIhss, cfgDeduccionIhssFija, politicaDeducciones };
}
