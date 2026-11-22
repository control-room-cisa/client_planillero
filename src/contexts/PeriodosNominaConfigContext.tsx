import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PeriodosNominaService } from "../services/periodosNominaService";
import {
  DEFAULT_PERIODOS_NOMINA_CONFIG,
  describirCortes,
  type PeriodosNominaConfig,
} from "../components/rrhh/gestion-empleados/calculo-nominas/utils/periodos";
import { useAuth } from "../hooks/useAuth";

type PeriodosNominaConfigContextValue = {
  config: PeriodosNominaConfig;
  descripcionCortes: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const PeriodosNominaConfigContext = createContext<
  PeriodosNominaConfigContextValue | undefined
>(undefined);

export function PeriodosNominaConfigProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const [config, setConfig] = useState<PeriodosNominaConfig>(
    DEFAULT_PERIODOS_NOMINA_CONFIG,
  );
  const [descripcion, setDescripcion] = useState(() =>
    describirCortes(DEFAULT_PERIODOS_NOMINA_CONFIG),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const data = await PeriodosNominaService.getConfig();
      setConfig({ a: data.a, b: data.b });
      setDescripcion(data.descripcionCortes || describirCortes(data));
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message || "")
          : "No se pudieron cargar los cortes de quincena";
      setError(msg || "No se pudieron cargar los cortes de quincena");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refresh();
    } else {
      setConfig(DEFAULT_PERIODOS_NOMINA_CONFIG);
      setDescripcion(describirCortes(DEFAULT_PERIODOS_NOMINA_CONFIG));
      setError(null);
    }
  }, [isAuthenticated, refresh]);

  const value = useMemo(
    () => ({
      config,
      descripcionCortes: descripcion,
      loading,
      error,
      refresh,
    }),
    [config, descripcion, loading, error, refresh],
  );

  return (
    <PeriodosNominaConfigContext.Provider value={value}>
      {children}
    </PeriodosNominaConfigContext.Provider>
  );
}

export function usePeriodosNominaConfig(): PeriodosNominaConfigContextValue {
  const ctx = useContext(PeriodosNominaConfigContext);
  if (!ctx) {
    throw new Error(
      "usePeriodosNominaConfig debe usarse dentro de PeriodosNominaConfigProvider",
    );
  }
  return ctx;
}
