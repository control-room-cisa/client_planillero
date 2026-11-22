import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Snackbar, Alert } from "@mui/material";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import EmpleadoService from "../../services/empleadoService";
import { empresaService } from "../../services/empresaService";
import ProrrateoService from "../../services/prorrateoService";
import type { Empleado } from "../../services/empleadoService";
import type { Empresa } from "../../types/auth";
import EmpleadosList from "./gestion-prorrateo/EmpleadosList";
import EmpleadosFilters from "./gestion-prorrateo/EmpleadosFilters";
import VerProrrateoGeneradoModal from "./gestion-prorrateo/VerProrrateoGeneradoModal";
import DescargarProrrateoExcelModal from "./gestion-prorrateo/DescargarProrrateoExcelModal";
import type { LayoutOutletCtx } from "../Layout";
import ModuleTitle from "../common/ModuleTitle";
import {
  persistProrrateoIndexSession,
  resolveEmpleadosIndexForNomina,
} from "../../utils/nominasEmpleadosIndexSession";
import {
  quincenaBYaEmpezo,
  type PeriodosNominaConfig,
} from "../rrhh/gestion-empleados/calculo-nominas/utils/periodos";
import { usePeriodosNominaConfig } from "../../contexts/PeriodosNominaConfigContext";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function buildPeriodosDisponibles(
  selectedYear: number,
  currentYear: number,
  currentMonth: number,
  currentDay: number,
  periodosConfig: PeriodosNominaConfig,
) {
  const grupos: Array<{
    mesLabel: string;
    periodos: Array<{ value: string; label: string }>;
  }> = [];
  const maxMes = selectedYear === currentYear ? currentMonth : 12;
  const hoyRef = new Date(currentYear, currentMonth - 1, currentDay);

  for (let mes = maxMes; mes >= 1; mes--) {
    const mesStr = String(mes).padStart(2, "0");
    const periodosMes: Array<{ value: string; label: string }> = [];
    const esMesActual = selectedYear === currentYear && mes === currentMonth;

    if (!esMesActual || quincenaBYaEmpezo(hoyRef, periodosConfig)) {
      periodosMes.push({
        value: `${mesStr}B`,
        label: "Segunda Quincena",
      });
    }
    periodosMes.push({
      value: `${mesStr}A`,
      label: "Primera Quincena",
    });

    grupos.push({
      mesLabel: MESES[mes - 1],
      periodos: periodosMes,
    });
  }
  return grupos;
}

/** Primer período de la lista = el más reciente disponible. */
function primerPeriodoDisponible(
  grupos: ReturnType<typeof buildPeriodosDisponibles>
): string | null {
  return grupos[0]?.periodos[0]?.value ?? null;
}

const ProrrateoManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { setSelectedEmpleado, setEmpleadosIndex } =
    useOutletContext<LayoutOutletCtx>();
  const { config: periodosConfig } = usePeriodosNominaConfig();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [showInactivos, setShowInactivos] = useState(false);
  const [openExcelModal, setOpenExcelModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [verProrrateoEmpleado, setVerProrrateoEmpleado] =
    useState<Empleado | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error") => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  const añosDisponibles = useMemo(() => {
    const años: number[] = [];
    for (let i = currentYear; i >= currentYear - 19; i--) {
      años.push(i);
    }
    return años;
  }, [currentYear]);

  const periodosDisponibles = useMemo(
    () =>
      buildPeriodosDisponibles(
        selectedYear,
        currentYear,
        currentMonth,
        currentDay,
        periodosConfig,
      ),
    [selectedYear, currentYear, currentMonth, currentDay, periodosConfig],
  );

  useEffect(() => {
    if (
      selectedPeriodo &&
      !periodosDisponibles.some((g) =>
        g.periodos.some((p) => p.value === selectedPeriodo)
      )
    ) {
      setSelectedPeriodo(primerPeriodoDisponible(periodosDisponibles));
    }
  }, [selectedPeriodo, periodosDisponibles]);

  const codigoNominaFiltro = useMemo(() => {
    if (!selectedYear || !selectedPeriodo) return null;
    return `${selectedYear}${selectedPeriodo}`;
  }, [selectedYear, selectedPeriodo]);

  const fetchEmpleados = useCallback(async () => {
    if (!selectedEmpresaId) {
      setEmpleados([]);
      return;
    }
    setLoading(true);
    try {
      const empresaId = parseInt(selectedEmpresaId);
      const data = await EmpleadoService.getAll(empresaId);
      setEmpleados(data);
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      showSnackbar("Error al cargar los colaboradores", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedEmpresaId, showSnackbar]);

  const fetchEmpresas = useCallback(async () => {
    try {
      const response = await empresaService.getEmpresas();
      if (response.success) setEmpresas(response.data);
    } catch (err) {
      console.error("Error al cargar empresas:", err);
      showSnackbar("Error al cargar las empresas", "error");
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  useEffect(() => {
    if (location.state?.selectedEmpresaId) {
      setSelectedEmpresaId(location.state.selectedEmpresaId);
    }
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  const filteredEmpleados = empleados.filter((empleado) => {
    if (!showInactivos && !empleado.activo) return false;
    const q = searchTerm.toLowerCase();
    return (
      empleado.nombre?.toLowerCase().includes(q) ||
      empleado.apellido?.toLowerCase().includes(q) ||
      empleado.codigo?.toLowerCase().includes(q) ||
      empleado.correoElectronico?.toLowerCase().includes(q) ||
      empleado.cargo?.toLowerCase().includes(q)
    );
  });

  const empleadosActivosIndexList = React.useMemo(() => {
    return empleados
      .filter((e) => e.activo)
      .map((e) => ({
        id: e.id,
        codigo: e.codigo ?? null,
        nombreCompleto: `${e.nombre ?? ""} ${e.apellido ?? ""}`.trim(),
      }))
      .sort((a, b) =>
        a.nombreCompleto
          .toLowerCase()
          .localeCompare(b.nombreCompleto.toLowerCase())
      );
  }, [empleados]);

  const handleProrrateoClick = (empleado: Empleado) => {
    const codigo = empleado.codigo?.trim();
    if (!codigo) {
      showSnackbar(
        "Este colaborador no tiene código asignado; no se puede abrir el prorrateo por enlace.",
        "error"
      );
      return;
    }

    const indexForNavigation = resolveEmpleadosIndexForNomina(
      empleado,
      empleadosActivosIndexList
    );
    setEmpleadosIndex(indexForNavigation);
    persistProrrateoIndexSession(indexForNavigation);
    setSelectedEmpleado(empleado);

    navigate(`/prorrateo/${encodeURIComponent(codigo)}`, {
      state: {
        fromProrrateoList: true,
        selectedEmpresaId,
        searchTerm,
      },
    });
  };

  const handleOpenExcelModal = () => {
    if (!selectedEmpresaId) return;
    const year = currentYear;
    const periodos = buildPeriodosDisponibles(
      year,
      currentYear,
      currentMonth,
      currentDay,
      periodosConfig,
    );
    setSelectedYear(year);
    setSelectedPeriodo(primerPeriodoDisponible(periodos));
    setOpenExcelModal(true);
  };

  const handleCloseExcelModal = () => {
    if (downloadingExcel) return;
    setOpenExcelModal(false);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const periodos = buildPeriodosDisponibles(
      year,
      currentYear,
      currentMonth,
      currentDay,
      periodosConfig,
    );
    setSelectedPeriodo(primerPeriodoDisponible(periodos));
  };

  const handleDownloadExcel = async () => {
    if (!selectedEmpresaId || !codigoNominaFiltro) {
      showSnackbar("Seleccione empresa y período", "error");
      return;
    }
    setDownloadingExcel(true);
    try {
      const empresa = empresas.find(
        (e) => e.id.toString() === selectedEmpresaId
      );
      const blob = await ProrrateoService.downloadExcel(
        Number(selectedEmpresaId),
        codigoNominaFiltro
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const nombreEmpresa = (empresa?.nombre ?? "Empresa")
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      link.download = `Prorrateo ${codigoNominaFiltro} ${nombreEmpresa}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSnackbar("Prorrateo Excel descargado", "success");
      setOpenExcelModal(false);
    } catch (err: any) {
      console.error("Error al descargar prorrateo Excel:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo descargar el Excel de prorrateo";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          showSnackbar(parsed?.message || msg, "error");
        } catch {
          showSnackbar(msg, "error");
        }
      } else {
        showSnackbar(msg, "error");
      }
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleCloseSnackbar = (): void => {
    setSnackbar((s) => ({ ...s, open: false }));
  };

  return (
    <Box
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <ModuleTitle>Gestión de Prorrateo</ModuleTitle>

      <Box sx={{ mb: 3, flexShrink: 0 }}>
        <EmpleadosFilters
          searchTerm={searchTerm}
          selectedEmpresaId={selectedEmpresaId}
          empresas={empresas}
          showInactivos={showInactivos}
          onSearchChange={setSearchTerm}
          onEmpresaChange={setSelectedEmpresaId}
          onShowInactivosChange={setShowInactivos}
          onOpenDownloadExcel={handleOpenExcelModal}
        />
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <EmpleadosList
          empleados={filteredEmpleados}
          loading={loading}
          onProrrateoClick={handleProrrateoClick}
          onVerProrrateoGeneradoClick={setVerProrrateoEmpleado}
        />
      </Box>

      <VerProrrateoGeneradoModal
        open={!!verProrrateoEmpleado}
        onClose={() => setVerProrrateoEmpleado(null)}
        empleado={verProrrateoEmpleado}
      />

      <DescargarProrrateoExcelModal
        open={openExcelModal}
        downloading={downloadingExcel}
        selectedYear={selectedYear}
        selectedPeriodo={selectedPeriodo}
        añosDisponibles={añosDisponibles}
        periodosDisponibles={periodosDisponibles}
        onClose={handleCloseExcelModal}
        onYearChange={handleYearChange}
        onPeriodoChange={setSelectedPeriodo}
        onConfirm={handleDownloadExcel}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProrrateoManagement;
