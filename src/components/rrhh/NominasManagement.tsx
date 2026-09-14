import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  IconButton,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Divider,
  Card,
  CardContent,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PrintIcon from "@mui/icons-material/Print";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PaymentsIcon from "@mui/icons-material/Payments";
import NominaService, { type NominaDto } from "../../services/nominaService";
import RegistroDiarioService from "../../services/registroDiarioService";
import { empresaService } from "../../services/empresaService";
import EmpleadoService from "../../services/empleadoService";
import CalculoHorasTrabajoService from "../../services/calculoHorasTrabajoService";
import type { Empresa } from "../../types/auth";
import type { Empleado } from "../../services/empleadoService";
import {
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  ListSubheader,
} from "@mui/material";
import ConfirmDialog from "../common/ConfirmDialog";
import NominaFormModal from "./NominaFormModal";
import { useAuth } from "../../hooks/useAuth";
import { Roles } from "../../enums/roles";
import { hasAnyRole, normalizeRolIds } from "../../utils/roles";
import {
  calcularTotalAPagarNomina,
  calcularTotalBrutoNomina,
  calcularTotalDeduccionesNomina,
  calcularTotalHorasExtraNomina,
} from "./gestion-empleados/calculo-nominas/utils/nominaTotales";
import {
  buildVoucherDocumentHtml,
  buildVoucherPageHtml,
} from "./voucherNominaHtml";

const renderPeriodosSelectItems = (
  grupos: Array<{
    mesLabel: string;
    periodos: Array<{ value: string; label: string }>;
  }>
) =>
  grupos.flatMap((grupo) => [
    <ListSubheader
      key={`sub-${grupo.mesLabel}`}
      disableSticky
      sx={{
        fontWeight: 600,
        fontSize: "0.8125rem",
        lineHeight: 2,
        py: 0.25,
        color: "text.secondary",
        bgcolor: "transparent",
        backgroundImage: "none",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {grupo.mesLabel}
    </ListSubheader>,
    ...grupo.periodos.map((periodo) => (
      <MenuItem key={periodo.value} value={periodo.value} sx={{ pl: 3 }}>
        {periodo.label}
      </MenuItem>
    )),
  ]);

const NominasManagement: React.FC = () => {
  const { user } = useAuth();
  const rolIds = normalizeRolIds(user);
  const isRrhh = hasAnyRole(rolIds, Roles.RRHH);
  const isSupervisorContabilidad = hasAnyRole(
    rolIds,
    Roles.SUPERVISOR_CONTABILIDAD,
  );

  const [nominas, setNominas] = useState<NominaDto[]>([]);
  const [allNominas, setAllNominas] = useState<NominaDto[]>([]); // Todas las nóminas para filtrado
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);

  // Estados para modales
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [openDetailTableModal, setOpenDetailTableModal] = useState(false);
  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentNomina, setCurrentNomina] = useState<NominaDto | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<NominaDto>>({});
  const [errorAlimentacion, setErrorAlimentacion] = useState<{
    tieneError: boolean;
    mensajeError: string;
  } | null>(null);
  const [loadingAlimentacion, setLoadingAlimentacion] = useState(false);

  // Estado para notificaciones
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Estado para diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    nomina: NominaDto | null;
    warningNegativo: boolean;
  }>({
    open: false,
    nomina: null,
    warningNegativo: false,
  });
  const [printingNominaId, setPrintingNominaId] = useState<number | null>(null);
  const [downloadingDetalleId, setDownloadingDetalleId] = useState<number | null>(
    null,
  );
  const [downloadingPlantilla, setDownloadingPlantilla] = useState(false);
  const [downloadingTablaDetalles, setDownloadingTablaDetalles] =
    useState(false);
  const [downloadingVouchersPdf, setDownloadingVouchersPdf] = useState(false);
  const [payingPlanilla, setPayingPlanilla] = useState(false);
  const [confirmPagarPlanilla, setConfirmPagarPlanilla] = useState(false);

  // Función para mostrar notificaciones
  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error") => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  // Cargar empresas (solo consorcios)
  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const response = await empresaService.getEmpresas();
        if (response.success) {
          // Filtrar solo empresas con esConsorcio === true
          const empresasConsorcio = response.data.filter(
            (empresa) => empresa.esConsorcio === true
          );
          setEmpresas(empresasConsorcio);
        }
      } catch (err) {
        console.error("Error al cargar empresas:", err);
        showSnackbar("Error al cargar las empresas", "error");
      }
    };
    fetchEmpresas();
  }, [showSnackbar]);

  // Cargar empleados cuando se selecciona una empresa
  useEffect(() => {
    const fetchEmpleados = async () => {
      if (!selectedEmpresaId) {
        setEmpleados([]);
        return;
      }
      try {
        const data = await EmpleadoService.getAll(selectedEmpresaId);
        setEmpleados(data);
      } catch (err) {
        console.error("Error al cargar empleados:", err);
        showSnackbar("Error al cargar los colaboradores", "error");
      }
    };
    fetchEmpleados();
  }, [selectedEmpresaId, showSnackbar]);

  // Generar lista de períodos (meses del año divididos en primera y segunda quincena)
  // Ordenados con los más recientes primero (meses descendentes, luego quincenas B antes de A)
  const periodosDisponibles = useMemo(() => {
    if (!selectedYear) return [];

    const meses = [
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
    const grupos: Array<{
      mesLabel: string;
      periodos: Array<{ value: string; label: string }>;
    }> = [];
    const esAnoActual = selectedYear === currentYear;
    const mesHasta = esAnoActual ? currentMonth : 12;

    // Generar períodos agrupados por mes (orden descendente)
    for (let mes = 12; mes >= 1; mes--) {
      if (mes > mesHasta) continue;
      const mesStr = String(mes).padStart(2, "0");
      const esMesActual = esAnoActual && mes === currentMonth;
      const periodosMes: Array<{ value: string; label: string }> = [];

      // Segunda quincena: ocultar si aún no ha iniciado (día 1-15 del mes actual)
      if (!esMesActual || currentDay > 15) {
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
        mesLabel: meses[mes - 1],
        periodos: periodosMes,
      });
    }
    return grupos;
  }, [selectedYear, currentYear, currentMonth, currentDay]);

  // Generar años disponibles (últimos 20 años, máximo hasta el año actual)
  const añosDisponibles = useMemo(() => {
    const años: number[] = [];
    for (let i = currentYear; i >= currentYear - 19; i--) {
      años.push(i);
    }
    return años;
  }, [currentYear]);

  // Si el período seleccionado ya no está en la lista (p. ej. al cambiar de año), limpiarlo
  useEffect(() => {
    if (
      selectedPeriodo &&
      !periodosDisponibles.some((g) =>
        g.periodos.some((p) => p.value === selectedPeriodo)
      )
    ) {
      setSelectedPeriodo(null);
    }
  }, [selectedPeriodo, periodosDisponibles]);

  // Generar código de nómina desde año y período seleccionados
  const codigoNominaFiltro = useMemo(() => {
    if (!selectedYear || !selectedPeriodo) return null;
    return `${selectedYear}${selectedPeriodo}`;
  }, [selectedYear, selectedPeriodo]);

  // Cargar nóminas solo si hay empresa, año y período seleccionados
  const fetchNominas = useCallback(async () => {
    if (!selectedEmpresaId || !codigoNominaFiltro) {
      setAllNominas([]);
      setNominas([]);
      return;
    }

    setLoading(true);
    try {
      const params: {
        empresaId?: number;
        codigoNomina?: string;
      } = {};

      params.empresaId = selectedEmpresaId;
      params.codigoNomina = codigoNominaFiltro;

      const data = await NominaService.list(params);
      setAllNominas(data);
    } catch (err) {
      console.error("Error al cargar nóminas:", err);
      showSnackbar("Error al cargar las nóminas", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedEmpresaId, codigoNominaFiltro, showSnackbar]);

  useEffect(() => {
    fetchNominas();
  }, [fetchNominas]);

  // Obtener nombre del empleado
  const getEmpleadoNombre = useCallback(
    (empleadoId: number) => {
      const empleado = empleados.find((e) => e.id === empleadoId);
      return empleado
        ? `${empleado.nombre} ${empleado.apellido}`.trim()
        : `ID: ${empleadoId}`;
    },
    [empleados]
  );

  // Filtrar y ordenar nóminas alfabéticamente por colaborador (A → Z)
  const filteredNominas = useMemo(() => {
    const base = !searchTerm.trim()
      ? allNominas
      : allNominas.filter((nomina) => {
          const empleadoNombre = getEmpleadoNombre(
            nomina.empleadoId,
          ).toLowerCase();
          const periodoNombre = (nomina.nombrePeriodoNomina || "").toLowerCase();
          const searchLower = searchTerm.toLowerCase();
          return (
            empleadoNombre.includes(searchLower) ||
            periodoNombre.includes(searchLower)
          );
        });

    return [...base].sort((a, b) =>
      getEmpleadoNombre(a.empleadoId).localeCompare(
        getEmpleadoNombre(b.empleadoId),
        "es",
        { sensitivity: "base" },
      ),
    );
  }, [allNominas, searchTerm, getEmpleadoNombre]);

  // Actualizar nominas cuando cambia el filtro
  useEffect(() => {
    setNominas(filteredNominas);
  }, [filteredNominas]);

  // Formatear fecha
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Formatear rango de fechas
  const formatDateRange = (fechaInicio: string, fechaFin: string) => {
    return `${formatDate(fechaInicio)} - ${formatDate(fechaFin)}`;
  };

  // Formatear moneda
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
    }).format(amount);
  };

  const aggregatedTotals = useMemo(() => {
    return nominas.reduce(
      (acc, nomina) => {
        const sueldoQuincenal = (nomina.sueldoMensual ?? 0) / 2;
        acc.sueldoQuincenal += sueldoQuincenal;
        acc.subtotal += nomina.subtotalQuincena ?? 0;
        acc.extra25 += nomina.montoHoras25 ?? 0;
        acc.extra50 += nomina.montoHoras50 ?? 0;
        acc.extra75 += nomina.montoHoras75 ?? 0;
        acc.extra100 += nomina.montoHoras100 ?? 0;
        acc.totalBruto += calcularTotalBrutoNomina(nomina);
        acc.horasExtra += calcularTotalHorasExtraNomina(nomina);
        acc.ajustes += nomina.ajuste ?? 0;
        acc.deduccionIHSS += nomina.deduccionIHSS ?? 0;
        acc.deduccionISR += nomina.deduccionISR ?? 0;
        acc.deduccionRAP += nomina.deduccionRAP ?? 0;
        acc.deduccionAlimentacion += nomina.deduccionAlimentacion ?? 0;
        acc.deduccionAlojamiento += nomina.deduccionAlojamiento ?? 0;
        acc.cobroPrestamo += nomina.cobroPrestamo ?? 0;
        acc.impuestoVecinal += nomina.impuestoVecinal ?? 0;
        acc.otros += nomina.otros ?? 0;
        acc.totalDeducciones += calcularTotalDeduccionesNomina(nomina);
        acc.totalAPagar += calcularTotalAPagarNomina(nomina);
        return acc;
      },
      {
        sueldoQuincenal: 0,
        subtotal: 0,
        extra25: 0,
        extra50: 0,
        extra75: 0,
        extra100: 0,
        totalBruto: 0,
        horasExtra: 0,
        ajustes: 0,
        deduccionIHSS: 0,
        deduccionISR: 0,
        deduccionRAP: 0,
        deduccionAlimentacion: 0,
        deduccionAlojamiento: 0,
        cobroPrestamo: 0,
        impuestoVecinal: 0,
        otros: 0,
        totalDeducciones: 0,
        totalAPagar: 0,
      }
    );
  }, [nominas]);

  // Abrir modal de crear/editar nómina
  const handleOpenCreateEditModal = async (nomina?: NominaDto) => {
    if (nomina) {
      setIsCreating(false);
      try {
        const completa = await NominaService.getById(nomina.id);
        setCurrentNomina(completa);
      } catch (err) {
        console.error("Error al cargar la nómina para editar:", err);
        setCurrentNomina(nomina);
      }
    } else {
      setIsCreating(true);
      setCurrentNomina(null);
    }
    setOpenCreateEditModal(true);
  };

  // Cerrar modal de crear/editar
  const handleCloseCreateEditModal = () => {
    setOpenCreateEditModal(false);
    setCurrentNomina(null);
  };

  // Función para refrescar nóminas después de guardar
  const handleRefreshNominas = useCallback(async () => {
    await fetchNominas();
  }, [fetchNominas]);

  // Handler para onKeyPress - previene entrada de caracteres no numéricos
  const handleNumericKeyPress = (
    e: React.KeyboardEvent<any>,
    allowNegative: boolean = false,
    allowDecimal: boolean = true
  ) => {
    const char = e.key;
    const charLower = typeof char === "string" ? char.toLowerCase() : "";
    const target = e.target as HTMLInputElement;

    // Permitir teclas de control
    if (
      char === "Backspace" ||
      char === "Delete" ||
      char === "ArrowLeft" ||
      char === "ArrowRight" ||
      char === "ArrowUp" ||
      char === "ArrowDown" ||
      char === "Tab" ||
      char === "Enter" ||
      (e.ctrlKey &&
        (charLower === "a" ||
          charLower === "c" ||
          charLower === "v" ||
          charLower === "x"))
    ) {
      return;
    }

    // Permitir números
    if (/[0-9]/.test(char)) {
      return;
    }

    // Permitir separador decimal:
    // - "." (teclado normal)
    // - "," (teclado ES, luego se convierte a ".")
    // - "Decimal" (teclado numérico en algunos navegadores/OS)
    if (char === "." || char === "," || charLower === "decimal") {
      if (!allowDecimal) {
        e.preventDefault();
        return;
      }
      if (target.value && target.value.includes(".")) {
        e.preventDefault();
      }
      return;
    }

    // Permitir signo negativo solo al inicio y si está permitido
    if (allowNegative && char === "-") {
      const selectionStart = target.selectionStart ?? 0;
      if (selectionStart === 0 && !target.value?.includes("-")) {
        return;
      }
      e.preventDefault();
      return;
    }

    // Bloquear cualquier otro carácter
    e.preventDefault();
  };

  // Abrir modal de edición (solo deducciones)
  // Nota: Esta función se mantiene para compatibilidad con el modal de edición existente
  // aunque actualmente no se llama desde ningún lugar externo
  // @ts-ignore - Función mantenida para compatibilidad con modal existente
  const _handleOpenEditModal = async (nomina: NominaDto) => {
    if (nomina.pagado === true) {
      showSnackbar("No se puede editar una nómina que ya está pagada", "error");
      return;
    }
    setCurrentNomina(nomina);
    setErrorAlimentacion(null);
    setLoadingAlimentacion(true);

    // Obtener conteo de horas para calcular deducciones de alimentación
    try {
      const conteoHoras = await CalculoHorasTrabajoService.getConteoHoras(
        nomina.empleadoId,
        nomina.fechaInicio,
        nomina.fechaFin
      );

      // Si hay error en la alimentación, mostrar mensaje y permitir edición
      if (conteoHoras.errorAlimentacion?.tieneError) {
        setErrorAlimentacion(conteoHoras.errorAlimentacion);
        // Si hay error, establecer el campo en 0 y habilitar edición
        setEditFormData({
          ajuste: nomina.ajuste,
          deduccionIHSS: nomina.deduccionIHSS,
          deduccionISR: nomina.deduccionISR,
          deduccionRAP: nomina.deduccionRAP,
          deduccionAlimentacion: 0,
          deduccionAlojamiento: nomina.deduccionAlojamiento ?? 0,
          cobroPrestamo: nomina.cobroPrestamo,
          impuestoVecinal: nomina.impuestoVecinal,
          otros: nomina.otros,
          comentario: nomina.comentario,
        });
      } else {
        // Si no hay error (success = true), usar el valor del conteo de horas (no editable)
        setErrorAlimentacion(null);
        setEditFormData({
          ajuste: nomina.ajuste,
          deduccionIHSS: nomina.deduccionIHSS,
          deduccionISR: nomina.deduccionISR,
          deduccionRAP: nomina.deduccionRAP,
          deduccionAlimentacion: conteoHoras.deduccionesAlimentacion ?? 0,
          deduccionAlojamiento: nomina.deduccionAlojamiento ?? 0,
          cobroPrestamo: nomina.cobroPrestamo,
          impuestoVecinal: nomina.impuestoVecinal,
          otros: nomina.otros,
          comentario: nomina.comentario,
        });
      }
    } catch (err: any) {
      // Error general del cálculo de horas - NO mostrar error en el campo de alimentación
      // Solo limpiar el estado de error de alimentación
      setErrorAlimentacion(null);
      // Si hay error general, mantener el valor actual de la nómina
      setEditFormData({
        ajuste: nomina.ajuste,
        deduccionIHSS: nomina.deduccionIHSS,
        deduccionISR: nomina.deduccionISR,
        deduccionRAP: nomina.deduccionRAP,
        deduccionAlimentacion: nomina.deduccionAlimentacion,
        deduccionAlojamiento: nomina.deduccionAlojamiento ?? 0,
        cobroPrestamo: nomina.cobroPrestamo,
        impuestoVecinal: nomina.impuestoVecinal,
        otros: nomina.otros,
        comentario: nomina.comentario,
      });
    } finally {
      setLoadingAlimentacion(false);
    }

    setOpenEditModal(true);
  };

  // Abrir modal de detalles
  const handleOpenDetailModal = async (nomina: NominaDto) => {
    try {
      // Cargar datos completos de la nómina
      const nominaCompleta = await NominaService.getById(nomina.id);
      setCurrentNomina(nominaCompleta);
      setOpenDetailModal(true);
    } catch (err) {
      console.error("Error al cargar detalles de la nómina:", err);
      showSnackbar("Error al cargar los detalles de la nómina", "error");
    }
  };

  const handlePrintVoucher = async (nomina: NominaDto) => {
    setPrintingNominaId(nomina.id);
    try {
      const n = await NominaService.getById(nomina.id);
      const colaborador = getEmpleadoNombre(n.empleadoId);
      const empresaNombre =
        empresas.find((e) => e.id === n.empresaId)?.nombre ?? "";

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showSnackbar("Permita ventanas emergentes para imprimir", "error");
        return;
      }

      const html = buildVoucherDocumentHtml({
        title: `Voucher ${colaborador} ${n.nombrePeriodoNomina || ""}`,
        bodyInnerHtml: buildVoucherPageHtml(n, colaborador, empresaNombre, {
          formatCurrency,
          formatDate,
        }),
      });

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 200);
    } catch (err) {
      console.error("Error al imprimir voucher:", err);
      showSnackbar("Error al preparar la impresión", "error");
    } finally {
      setPrintingNominaId(null);
    }
  };

  const handleDownloadVouchersPdf = () => {
    if (!selectedEmpresaId || !codigoNominaFiltro || allNominas.length === 0) {
      return;
    }

    setDownloadingVouchersPdf(true);
    try {
      const nominasPeriodo = [...allNominas].sort((a, b) =>
        getEmpleadoNombre(a.empleadoId).localeCompare(
          getEmpleadoNombre(b.empleadoId),
          "es",
          { sensitivity: "base" },
        ),
      );

      const empresaNombre =
        empresas.find((e) => e.id === selectedEmpresaId)?.nombre ?? "";
      const periodoLabel =
        nominasPeriodo[0]?.nombrePeriodoNomina || codigoNominaFiltro;

      const pagesHtml = nominasPeriodo
        .map((n) => {
          const colaborador = getEmpleadoNombre(n.empleadoId);
          const page = buildVoucherPageHtml(
            n,
            colaborador,
            empresaNombre,
            { formatCurrency, formatDate },
          );
          return `<div class="voucher-page">${page}</div>`;
        })
        .join("");

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showSnackbar(
          "Permita ventanas emergentes para descargar el PDF",
          "error",
        );
        return;
      }

      const html = buildVoucherDocumentHtml({
        title: `Vouchers ${periodoLabel}`,
        bodyInnerHtml: pagesHtml,
      });

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
      showSnackbar(
        `PDF listo: ${nominasPeriodo.length} voucher(s). Elija "Guardar como PDF" en el diálogo de impresión.`,
        "success",
      );
    } catch (err) {
      console.error("Error al generar PDF de vouchers:", err);
      showSnackbar("Error al preparar el PDF de vouchers", "error");
    } finally {
      setDownloadingVouchersPdf(false);
    }
  };

  // Cerrar modales
  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setCurrentNomina(null);
    setEditFormData({});
    setErrorAlimentacion(null);
    setLoadingAlimentacion(false);
  };

  const handleCloseDetailModal = () => {
    setOpenDetailModal(false);
    setCurrentNomina(null);
  };

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!currentNomina) return;

    try {
      const {
        bancoCompensatoriasAplicadas: _banco,
        horasCompensatorias: _horasComp,
        empleadoId: _empleadoId,
        ...updatePayload
      } = editFormData;
      await NominaService.update(currentNomina.id, updatePayload);
      showSnackbar("Nómina actualizada exitosamente", "success");
      handleCloseEditModal();
      fetchNominas();
    } catch (err: any) {
      console.error("Error al actualizar nómina:", err);
      const errorMessage =
        err?.response?.data?.message || "Error al actualizar la nómina";
      showSnackbar(errorMessage, "error");
    }
  };

  // Abrir diálogo de confirmación para eliminar
  const handleDelete = async (nomina: NominaDto) => {
    if (nomina.pagado === true) {
      showSnackbar(
        "No se puede eliminar una nómina que ya está pagada",
        "error"
      );
      return;
    }

    let warningNegativo = false;
    try {
      const completa = await NominaService.getById(nomina.id);
      const snapshot = completa.bancoCompensatoriasAplicadas ?? [];
      if (snapshot.length > 0) {
        const banco = await RegistroDiarioService.getTiempoCompensatorio(
          completa.empleadoId
        );
        const saldoPorJob = new Map<string, number>();
        for (const row of banco.porJob) {
          const key = row.jobId == null ? "null" : String(row.jobId);
          saldoPorJob.set(key, Number(row.horasAcumuladas || 0));
        }
        warningNegativo = snapshot.some((item) => {
          const key = item.jobId == null ? "null" : String(item.jobId);
          const actual = saldoPorJob.get(key) ?? 0;
          return actual - Number(item.horas || 0) < 0;
        });
      }
    } catch (err) {
      console.error("Error al evaluar saldos del banco antes de eliminar:", err);
    }

    setConfirmDialog({
      open: true,
      nomina,
      warningNegativo,
    });
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!confirmDialog.nomina) return;

    try {
      await NominaService.delete(confirmDialog.nomina.id);
      showSnackbar("Nómina eliminada exitosamente", "success");
      fetchNominas();
      setConfirmDialog({ open: false, nomina: null, warningNegativo: false });
    } catch (err: any) {
      console.error("Error al eliminar nómina:", err);
      const errorMessage =
        err?.response?.data?.message || "Error al eliminar la nómina";
      showSnackbar(errorMessage, "error");
      setConfirmDialog({ open: false, nomina: null, warningNegativo: false });
    }
  };

  // Cancelar eliminación
  const handleCancelDelete = () => {
    setConfirmDialog({ open: false, nomina: null, warningNegativo: false });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((s) => ({ ...s, open: false }));
  };

  const nominasPendientesCount = useMemo(
    () => nominas.filter((n) => !n.pagado).length,
    [nominas]
  );

  const handleDownloadDetalleExcel = async (nomina: NominaDto) => {
    setDownloadingDetalleId(nomina.id);
    try {
      const blob = await NominaService.downloadDetalleExcel(nomina.id);
      const codigo = nomina.codigoNomina ?? String(nomina.id);
      const empleadoSlug = getEmpleadoNombre(nomina.empleadoId)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `detalle-nomina-${codigo}${
        empleadoSlug ? `-${empleadoSlug}` : ""
      }.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSnackbar("Detalle de nómina descargado", "success");
    } catch (err: any) {
      console.error("Error al descargar detalle de nómina:", err);
      const errorMessage =
        err?.response?.data?.message ||
        "Error al descargar el detalle de la nómina";
      showSnackbar(errorMessage, "error");
    } finally {
      setDownloadingDetalleId(null);
    }
  };

  const handleDownloadTablaDetalles = async () => {
    if (!selectedEmpresaId || !codigoNominaFiltro) return;
    setDownloadingTablaDetalles(true);
    try {
      const blob = await NominaService.downloadTablaDetalles(
        selectedEmpresaId,
        codigoNominaFiltro
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `detalles-nominas-${codigoNominaFiltro}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSnackbar("Tabla de detalles descargada", "success");
    } catch (err: any) {
      console.error("Error al descargar tabla de detalles:", err);
      const errorMessage =
        err?.response?.data?.message ||
        "Error al descargar la tabla de detalles";
      showSnackbar(errorMessage, "error");
    } finally {
      setDownloadingTablaDetalles(false);
    }
  };

  const handleDownloadPlantillaPago = async () => {
    if (!selectedEmpresaId || !codigoNominaFiltro) return;
    setDownloadingPlantilla(true);
    try {
      const blob = await NominaService.downloadPlantillaPago(
        selectedEmpresaId,
        codigoNominaFiltro
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `plantilla-pago-${codigoNominaFiltro}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSnackbar("Plantilla de pago descargada", "success");
    } catch (err: any) {
      console.error("Error al descargar plantilla de pago:", err);
      const errorMessage =
        err?.response?.data?.message || "Error al descargar la plantilla de pago";
      showSnackbar(errorMessage, "error");
    } finally {
      setDownloadingPlantilla(false);
    }
  };

  const handleConfirmPagarPlanilla = async () => {
    if (!selectedEmpresaId || !codigoNominaFiltro) return;
    setPayingPlanilla(true);
    try {
      const result = await NominaService.pagarPlanilla(
        selectedEmpresaId,
        codigoNominaFiltro
      );
      showSnackbar(
        `${result.actualizadas} nómina(s) marcada(s) como pagada(s)`,
        "success"
      );
      setConfirmPagarPlanilla(false);
      await fetchNominas();
    } catch (err: any) {
      console.error("Error al pagar planilla:", err);
      const errorMessage =
        err?.response?.data?.message || "Error al pagar la planilla";
      showSnackbar(errorMessage, "error");
    } finally {
      setPayingPlanilla(false);
    }
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
      <Typography variant="h4" gutterBottom sx={{ flexShrink: 0 }}>
        Gestión de Nóminas
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3, flexShrink: 0 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "flex-end",
            mb: 2,
          }}
        >
          <Autocomplete
            options={empresas}
            getOptionLabel={(opt) => opt.nombre || ""}
            value={empresas.find((e) => e.id === selectedEmpresaId) || null}
            onChange={(_, value) => {
              setSelectedEmpresaId(value?.id || null);
              setSearchTerm("");
            }}
            sx={{ minWidth: 200 }}
            renderInput={(params) => (
              <TextField {...params} label="Empresa" size="small" required />
            )}
          />

          <FormControl
            size="small"
            sx={{ minWidth: 120 }}
            disabled={!selectedEmpresaId}
          >
            <InputLabel>Año</InputLabel>
            <Select
              value={selectedYear || ""}
              onChange={(e) => {
                setSelectedYear(e.target.value ? Number(e.target.value) : null);
                if (!e.target.value) setSelectedPeriodo(null);
              }}
              label="Año"
            >
              <MenuItem value="">
                <em>Seleccione</em>
              </MenuItem>
              {añosDisponibles.map((año) => (
                <MenuItem key={año} value={año}>
                  {año}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            size="small"
            sx={{ minWidth: 250 }}
            disabled={!selectedEmpresaId || !selectedYear}
          >
            <InputLabel>Período</InputLabel>
            <Select
              value={selectedPeriodo || ""}
              onChange={(e) =>
                setSelectedPeriodo(
                  e.target.value ? String(e.target.value) : null
                )
              }
              label="Período"
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 300 },
                },
              }}
              renderValue={(value) => {
                if (!value) return "";
                for (const grupo of periodosDisponibles) {
                  const periodo = grupo.periodos.find(
                    (p) => p.value === value
                  );
                  if (periodo) {
                    return `${grupo.mesLabel} - ${periodo.label}`;
                  }
                }
                return String(value);
              }}
            >
              <MenuItem value="">
                <em>Seleccione</em>
              </MenuItem>
              {renderPeriodosSelectItems(periodosDisponibles)}
            </Select>
          </FormControl>

          <TextField
            label="Buscar colaborador"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            disabled={!selectedEmpresaId || !codigoNominaFiltro}
            sx={{ minWidth: 250 }}
            placeholder="Buscar por nombre..."
          />

          <Tooltip title="Limpiar filtros aplicados">
            <span>
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedEmpresaId(null);
                  setSearchTerm("");
                  setSelectedYear(currentYear);
                  setSelectedPeriodo(null);
                }}
              >
                Limpiar
              </Button>
            </span>
          </Tooltip>

          <Tooltip
            title={
              !selectedEmpresaId || !codigoNominaFiltro
                ? "Seleccionar filtros primero"
                : nominas.length === 0
                ? "Sin nóminas listadas"
                : "Tabla ampliada período"
            }
          >
            <span>
              <Button
                variant="contained"
                onClick={() => setOpenDetailTableModal(true)}
                disabled={
                  !selectedEmpresaId ||
                  !codigoNominaFiltro ||
                  nominas.length === 0
                }
              >
                Ver Detalles
              </Button>
            </span>
          </Tooltip>

          <Tooltip
            title={
              !selectedEmpresaId || !codigoNominaFiltro
                ? "Seleccionar filtros primero"
                : nominas.length === 0
                ? "Sin nóminas listadas"
                : "Descargar tabla de detalles (todos los colaboradores)"
            }
          >
            <span>
              <Button
                variant="outlined"
                onClick={handleDownloadTablaDetalles}
                disabled={
                  downloadingTablaDetalles ||
                  !selectedEmpresaId ||
                  !codigoNominaFiltro ||
                  nominas.length === 0
                }
                startIcon={
                  downloadingTablaDetalles ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <FileDownloadIcon />
                  )
                }
              >
                Planilla Excel
              </Button>
            </span>
          </Tooltip>

          <Tooltip
            title={
              !selectedEmpresaId || !codigoNominaFiltro
                ? "Seleccionar filtros primero"
                : allNominas.length === 0
                ? "Sin nóminas listadas"
                : "Descargar PDF con un voucher por colaborador del período"
            }
          >
            <span>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleDownloadVouchersPdf}
                disabled={
                  downloadingVouchersPdf ||
                  !selectedEmpresaId ||
                  !codigoNominaFiltro ||
                  allNominas.length === 0
                }
                startIcon={
                  downloadingVouchersPdf ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <PictureAsPdfIcon />
                  )
                }
              >
                Descargar PDF
              </Button>
            </span>
          </Tooltip>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            flexWrap: "wrap",
            gap: 1,
            mt: 1,
          }}
        >
          {isRrhh && (
            <Tooltip title="Registrar nueva nómina">
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  onClick={() => handleOpenCreateEditModal()}
                  sx={{ minWidth: 150 }}
                >
                  Crear Nómina
                </Button>
              </span>
            </Tooltip>
          )}

          {isSupervisorContabilidad && (
            <>
              <Tooltip
                title={
                  !selectedEmpresaId || !codigoNominaFiltro
                    ? "Seleccionar filtros primero"
                    : nominas.length === 0
                    ? "Sin nóminas listadas"
                    : "Descargar plantilla de pago"
                }
              >
                <span>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="medium"
                    startIcon={
                      downloadingPlantilla ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <FileDownloadIcon />
                      )
                    }
                    onClick={handleDownloadPlantillaPago}
                    disabled={
                      downloadingPlantilla ||
                      !selectedEmpresaId ||
                      !codigoNominaFiltro ||
                      nominas.length === 0
                    }
                  >
                    Plantilla de pago
                  </Button>
                </span>
              </Tooltip>

              <Tooltip
                title={
                  !selectedEmpresaId || !codigoNominaFiltro
                    ? "Seleccionar filtros primero"
                    : nominasPendientesCount === 0
                    ? "No hay nóminas pendientes de pago"
                    : "Marcar todas las nóminas del período como pagadas"
                }
              >
                <span>
                  <Button
                    variant="contained"
                    color="success"
                    size="medium"
                    startIcon={
                      payingPlanilla ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <PaymentsIcon />
                      )
                    }
                    onClick={() => setConfirmPagarPlanilla(true)}
                    disabled={
                      payingPlanilla ||
                      !selectedEmpresaId ||
                      !codigoNominaFiltro ||
                      nominasPendientesCount === 0
                    }
                  >
                    Pagar planilla
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
        </Box>
      </Paper>

      {/* Tabla */}
      <TableContainer
        component={Paper}
        sx={{ flex: 1, minHeight: 0, overflowX: "auto" }}
      >
        {!selectedEmpresaId || !codigoNominaFiltro ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 4,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              {!selectedEmpresaId
                ? "Seleccione una empresa para ver las nóminas"
                : "Seleccione año y período para ver las nóminas"}
            </Typography>
          </Box>
        ) : loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Table stickyHeader sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                <TableCell>Colaborador</TableCell>
                <TableCell>Fecha de Corte</TableCell>
                <TableCell align="right">Subtotal</TableCell>
                <TableCell align="right">Total Horas Extra</TableCell>
                <TableCell align="right">Total Bruto</TableCell>
                <TableCell align="right">Total Deducciones</TableCell>
                <TableCell align="right">Total a Pagar</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nominas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No hay nóminas registradas
                  </TableCell>
                </TableRow>
              ) : (
                nominas.map((nomina) => (
                  <TableRow key={nomina.id} hover>
                    <TableCell>
                      {getEmpleadoNombre(nomina.empleadoId)}
                    </TableCell>
                    <TableCell>
                      {formatDateRange(nomina.fechaInicio, nomina.fechaFin)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.subtotalQuincena)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(calcularTotalHorasExtraNomina(nomina))}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(calcularTotalBrutoNomina(nomina))}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(calcularTotalDeduccionesNomina(nomina))}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(calcularTotalAPagarNomina(nomina))}
                    </TableCell>
                    <TableCell align="center">
                      {nomina.pagado ? (
                        <Chip label="Pagado" color="success" size="small" />
                      ) : (
                        <Chip
                          label="Pendiente"
                          size="small"
                          sx={{
                            bgcolor: "grey.300",
                            color: "text.primary",
                            fontWeight: 500,
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver detalle nómina">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDetailModal(nomina)}
                          color="info"
                          aria-label="Ver detalles de la nómina"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Descargar detalle Excel">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadDetalleExcel(nomina)}
                            disabled={downloadingDetalleId !== null}
                            color="info"
                            aria-label="Descargar detalle de nómina en Excel"
                          >
                            {downloadingDetalleId === nomina.id ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <FileDownloadIcon />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip
                        title={
                          nomina.pagado
                            ? "Imprimir voucher pago"
                            : "Imprimir voucher pendiente"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handlePrintVoucher(nomina)}
                            disabled={printingNominaId !== null}
                            color="info"
                            aria-label="Imprimir voucher de nómina"
                          >
                            {printingNominaId === nomina.id ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <PrintIcon />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                      {isRrhh && (
                        <>
                          <Tooltip
                            title={
                              nomina.pagado
                                ? "Nómina ya pagada"
                                : "Modificar esta nómina"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenCreateEditModal(nomina)}
                                disabled={nomina.pagado === true}
                                color="primary"
                                aria-label="Editar nómina"
                              >
                                <EditIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            title={
                              nomina.pagado
                                ? "Nómina ya pagada"
                                : "Eliminar esta nómina"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(nomina)}
                                disabled={nomina.pagado === true}
                                color="error"
                                aria-label="Eliminar nómina"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {nominas.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 600 }}>
                    Totales
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.subtotal)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.horasExtra)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.totalBruto)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.totalDeducciones)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.totalAPagar)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </TableContainer>

      {/* Modal de edición - Solo deducciones y ajustes */}
      <Dialog
        open={openEditModal}
        onClose={handleCloseEditModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Editar Nómina - Deducciones y Ajustes</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Período: {currentNomina?.nombrePeriodoNomina || "Sin nombre"}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Colaborador:{" "}
              {currentNomina ? getEmpleadoNombre(currentNomina.empleadoId) : ""}
            </Typography>
            <Divider />

            <Typography variant="h6" sx={{ mt: 2 }}>
              Ajustes
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Ajuste"
                type="text"
                value={editFormData.ajuste ?? ""}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.-]/g, "");
                  const parts = value.split(".");
                  value =
                    parts.length > 2
                      ? parts[0] + "." + parts.slice(1).join("")
                      : value;
                  if (value.includes("-")) {
                    const negParts = value.split("-");
                    value = "-" + negParts.slice(1).join("").replace(/-/g, "");
                  }
                  setEditFormData({
                    ...editFormData,
                    ajuste:
                      value === "" || value === "-" || value === "."
                        ? null
                        : parseFloat(value) || null,
                  });
                }}
                onKeyPress={(e) => handleNumericKeyPress(e, true)}
                fullWidth
                size="small"
              />
            </Box>

            <Typography variant="h6" sx={{ mt: 2 }}>
              Deducciones
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Deducción IHSS"
                type="text"
                value={editFormData.deduccionIHSS ?? ""}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = value.split(".");
                  value =
                    parts.length > 2
                      ? parts[0] + "." + parts.slice(1).join("")
                      : value;
                  setEditFormData({
                    ...editFormData,
                    deduccionIHSS:
                      value === "" || value === "."
                        ? null
                        : parseFloat(value) || null,
                  });
                }}
                onKeyPress={(e) => handleNumericKeyPress(e, false)}
                fullWidth
                size="small"
              />
              <TextField
                label="Deducción ISR"
                type="text"
                value={editFormData.deduccionISR ?? ""}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = value.split(".");
                  value =
                    parts.length > 2
                      ? parts[0] + "." + parts.slice(1).join("")
                      : value;
                  setEditFormData({
                    ...editFormData,
                    deduccionISR:
                      value === "" || value === "."
                        ? null
                        : parseFloat(value) || null,
                  });
                }}
                onKeyPress={(e) => handleNumericKeyPress(e, false)}
                fullWidth
                size="small"
              />
              <TextField
                label="Deducción RAP"
                type="text"
                value={editFormData.deduccionRAP ?? ""}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = value.split(".");
                  value =
                    parts.length > 2
                      ? parts[0] + "." + parts.slice(1).join("")
                      : value;
                  setEditFormData({
                    ...editFormData,
                    deduccionRAP:
                      value === "" || value === "."
                        ? null
                        : parseFloat(value) || null,
                  });
                }}
                onKeyPress={(e) => handleNumericKeyPress(e, false)}
                fullWidth
                size="small"
              />
              <TextField
                label="Deducción Alimentación"
                type="text"
                value={editFormData.deduccionAlimentacion ?? ""}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = value.split(".");
                  value =
                    parts.length > 2
                      ? parts[0] + "." + parts.slice(1).join("")
                      : value;
                  setEditFormData({
                    ...editFormData,
                    deduccionAlimentacion:
                      value === "" || value === "."
                        ? null
                        : parseFloat(value) || null,
                  });
                }}
                onKeyPress={(e) => handleNumericKeyPress(e, false)}
                fullWidth
                size="small"
                disabled={
                  errorAlimentacion?.tieneError !== true || loadingAlimentacion
                }
                helperText={
                  loadingAlimentacion
                    ? "Cargando..."
                    : errorAlimentacion?.tieneError
                    ? errorAlimentacion.mensajeError
                    : undefined
                }
                error={errorAlimentacion?.tieneError === true}
              />
              <TextField
                label="Cobro Préstamo"
                type="text"
                value={editFormData.cobroPrestamo ?? ""}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = value.split(".");
                  value =
                    parts.length > 2
                      ? parts[0] + "." + parts.slice(1).join("")
                      : value;
                  setEditFormData({
                    ...editFormData,
                    cobroPrestamo:
                      value === "" || value === "."
                        ? null
                        : parseFloat(value) || null,
                  });
                }}
                onKeyPress={(e) => handleNumericKeyPress(e, false)}
                fullWidth
                size="small"
              />
              <TextField
                label="Impuesto Vecinal"
                type="text"
                value={editFormData.impuestoVecinal ?? ""}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = value.split(".");
                  value =
                    parts.length > 2
                      ? parts[0] + "." + parts.slice(1).join("")
                      : value;
                  setEditFormData({
                    ...editFormData,
                    impuestoVecinal:
                      value === "" || value === "."
                        ? null
                        : parseFloat(value) || null,
                  });
                }}
                onKeyPress={(e) => handleNumericKeyPress(e, false)}
                fullWidth
                size="small"
              />
              <TextField
                label="Otros"
                type="text"
                value={editFormData.otros ?? ""}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = value.split(".");
                  value =
                    parts.length > 2
                      ? parts[0] + "." + parts.slice(1).join("")
                      : value;
                  setEditFormData({
                    ...editFormData,
                    otros:
                      value === "" || value === "."
                        ? null
                        : parseFloat(value) || null,
                  });
                }}
                onKeyPress={(e) => handleNumericKeyPress(e, false)}
                fullWidth
                size="small"
              />
              <TextField
                label="Deducción Alojamiento"
                type="text"
                value={editFormData.deduccionAlojamiento ?? ""}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = value.split(".");
                  value =
                    parts.length > 2
                      ? parts[0] + "." + parts.slice(1).join("")
                      : value;
                  setEditFormData({
                    ...editFormData,
                    deduccionAlojamiento:
                      value === "" || value === "."
                        ? null
                        : parseFloat(value) || null,
                  });
                }}
                onKeyPress={(e) => handleNumericKeyPress(e, false)}
                fullWidth
                size="small"
              />
            </Box>

            <TextField
              label="Comentario"
              value={editFormData.comentario || ""}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  comentario: e.target.value,
                })
              }
              multiline
              rows={3}
              fullWidth
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de tabla completa */}
      <Dialog
        open={openDetailTableModal}
        onClose={() => setOpenDetailTableModal(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography
            component="div"
            variant="h5"
            sx={{ fontWeight: 700, lineHeight: 1.2 }}
          >
            {empresas.find((e) => e.id === selectedEmpresaId)?.nombre ||
              "Empresa"}
          </Typography>
          <Typography
            component="div"
            variant="subtitle1"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {nominas[0]?.nombrePeriodoNomina || "Sin nombre"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TableContainer sx={{ mt: 2, maxHeight: "70vh" }}>
            <Table stickyHeader sx={{ minWidth: 1900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Colaborador</TableCell>
                  <TableCell>Fecha de Corte</TableCell>
                  <TableCell align="right">Sueldo Quincenal</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell align="right">Extra 25%</TableCell>
                  <TableCell align="right">Extra 50%</TableCell>
                  <TableCell align="right">Extra 75%</TableCell>
                  <TableCell align="right">Extra 100%</TableCell>
                  <TableCell align="right">Ajustes</TableCell>
                  <TableCell align="right">Total Bruto</TableCell>
                  <TableCell align="right">Deducción IHSS</TableCell>
                  <TableCell align="right">Deducción ISR</TableCell>
                  <TableCell align="right">Deducción RAP</TableCell>
                  <TableCell align="right">Deducción Alimentación</TableCell>
                  <TableCell align="right">Deducción Alojamiento</TableCell>
                  <TableCell align="right">Préstamo</TableCell>
                  <TableCell align="right">Impuesto Vecinal</TableCell>
                  <TableCell align="right">Otros</TableCell>
                  <TableCell align="right">Total Deducciones</TableCell>
                  <TableCell align="right">Total a Pagar</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nominas.map((nomina) => (
                  <TableRow key={nomina.id} hover>
                    <TableCell>
                      {getEmpleadoNombre(nomina.empleadoId)}
                    </TableCell>
                    <TableCell>
                      {formatDateRange(nomina.fechaInicio, nomina.fechaFin)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency((nomina.sueldoMensual ?? 0) / 2)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.subtotalQuincena)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.montoHoras25)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.montoHoras50)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.montoHoras75)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.montoHoras100)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.ajuste)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(calcularTotalBrutoNomina(nomina))}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.deduccionIHSS)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.deduccionISR)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.deduccionRAP)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.deduccionAlimentacion)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.deduccionAlojamiento)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.cobroPrestamo)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.impuestoVecinal)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.otros)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(calcularTotalDeduccionesNomina(nomina))}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(calcularTotalAPagarNomina(nomina))}
                    </TableCell>
                    <TableCell>
                      {nomina.pagado ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Pagado"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<CancelIcon />}
                          label="Pendiente"
                          color="warning"
                          size="small"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Totales</TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.sueldoQuincenal)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.subtotal)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.extra25)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.extra50)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.extra75)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.extra100)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.ajustes)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.totalBruto)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.deduccionIHSS)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.deduccionISR)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.deduccionRAP)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.deduccionAlimentacion)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.deduccionAlojamiento)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.cobroPrestamo)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.impuestoVecinal)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.otros)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.totalDeducciones)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.totalAPagar)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDownloadTablaDetalles}
            disabled={downloadingTablaDetalles || nominas.length === 0}
            startIcon={
              downloadingTablaDetalles ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <FileDownloadIcon />
              )
            }
          >
            Planilla Excel
          </Button>
          <Button
            onClick={handleDownloadVouchersPdf}
            disabled={downloadingVouchersPdf || allNominas.length === 0}
            startIcon={
              downloadingVouchersPdf ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <PictureAsPdfIcon />
              )
            }
          >
            Descargar PDF
          </Button>
          <Button onClick={() => setOpenDetailTableModal(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de detalles */}
      <Dialog
        open={openDetailModal}
        onClose={handleCloseDetailModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Detalles de Nómina -{" "}
          {currentNomina?.nombrePeriodoNomina || "Sin nombre"}
        </DialogTitle>
        <DialogContent>
          {currentNomina && (
            <Box
              sx={{
                mt: 2,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                gap: 3,
              }}
            >
              {/* Información General */}
              <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      Información General
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Colaborador
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {getEmpleadoNombre(currentNomina.empleadoId)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Período
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {currentNomina.nombrePeriodoNomina || "Sin nombre"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Estado
                        </Typography>
                        {currentNomina.pagado ? (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Pagado"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<CancelIcon />}
                            label="Pendiente"
                            color="warning"
                            size="small"
                          />
                        )}
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Fecha Inicio
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(currentNomina.fechaInicio)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Fecha Fin
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(currentNomina.fechaFin)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Datos Base */}
              <Box>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      Datos Base
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Sueldo Mensual
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {formatCurrency(currentNomina.sueldoMensual)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Días Laborados
                        </Typography>
                        <Typography variant="body1">
                          {currentNomina.diasLaborados ?? "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Días Vacaciones
                        </Typography>
                        <Typography variant="body1">
                          {currentNomina.diasVacaciones ?? "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Días incap. empresa
                        </Typography>
                        <Typography variant="body1">
                          {currentNomina.diasIncapacidadEmpresa ?? "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Días incap. IHSS
                        </Typography>
                        <Typography variant="body1">
                          {currentNomina.diasIncapacidadIHSS ?? "-"}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Percepciones */}
              <Box>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      Percepciones
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Subtotal Quincena
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.subtotalQuincena)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Monto Vacaciones
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.montoVacaciones)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Monto Días Laborados
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.montoDiasLaborados)}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Total Bruto
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color="primary"
                        >
                          {formatCurrency(calcularTotalBrutoNomina(currentNomina))}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Horas Extra */}
              <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      Horas Extra
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          OT 25%
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.montoHoras25)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          OT 50%
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.montoHoras50)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          OT 75%
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.montoHoras75)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          OT 100%
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.montoHoras100)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Deducciones */}
              <Box sx={{ gridColumn: { xs: "1", md: "span 1" } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      Deducciones
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Deducción IHSS
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.deduccionIHSS)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Deducción ISR
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.deduccionISR)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Deducción RAP
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.deduccionRAP)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Deducción Alimentación
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.deduccionAlimentacion)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Deducción Alojamiento
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.deduccionAlojamiento)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Cobro Préstamo
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.cobroPrestamo)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Impuesto Vecinal
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.impuestoVecinal)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Otros
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.otros)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Ajuste
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentNomina.ajuste)}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Total Deducciones
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color="error"
                        >
                          {formatCurrency(
                            calcularTotalDeduccionesNomina(currentNomina),
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Total a Pagar */}
              <Box>
                <Card
                  variant="outlined"
                  sx={{
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ mb: 2, color: "inherit" }}
                    >
                      Total a Pagar
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="inherit">
                      {formatCurrency(calcularTotalAPagarNomina(currentNomina))}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Comentario */}
              {currentNomina.comentario && (
                <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        Comentario
                      </Typography>
                      <Typography variant="body1">
                        {currentNomina.comentario}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              currentNomina && handleDownloadDetalleExcel(currentNomina)
            }
            disabled={!currentNomina || downloadingDetalleId !== null}
            startIcon={
              downloadingDetalleId === currentNomina?.id ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <FileDownloadIcon />
              )
            }
          >
            Descargar Excel
          </Button>
          <Button onClick={handleCloseDetailModal}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de crear/editar nómina */}
      <NominaFormModal
        open={openCreateEditModal}
        isCreating={isCreating}
        nomina={currentNomina}
        empresas={empresas}
        defaultEmpresaId={selectedEmpresaId}
        defaultYear={selectedYear}
        defaultPeriodoCode={selectedPeriodo}
        onClose={handleCloseCreateEditModal}
        onSave={handleRefreshNominas}
        showSnackbar={showSnackbar}
      />

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Confirmar eliminación"
        message={
          confirmDialog.warningNegativo
            ? `¿Está seguro que desea eliminar la nómina del período ${
                confirmDialog.nomina?.nombrePeriodoNomina || "sin nombre"
              }? Advertencia: al revertir el banco de compensatorias se aplicará un saldo negativo en uno o más jobs.`
            : `¿Está seguro que desea eliminar la nómina del período ${
                confirmDialog.nomina?.nombrePeriodoNomina || "sin nombre"
              }?`
        }
        confirmText="Eliminar"
        cancelText="Conservar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <ConfirmDialog
        open={confirmPagarPlanilla}
        title="Confirmar pago de planilla"
        message={`¿Desea marcar como pagadas las ${nominasPendientesCount} nómina(s) pendiente(s) del período seleccionado? Esta acción no se puede deshacer.`}
        confirmText="Pagar planilla"
        cancelText="Cancelar"
        confirmColor="primary"
        onConfirm={handleConfirmPagarPlanilla}
        onCancel={() => setConfirmPagarPlanilla(false)}
      />

      {/* Snackbar */}
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

export default NominasManagement;
