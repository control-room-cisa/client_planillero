import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Divider,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import NominaService, { type NominaDto } from "../../services/nominaService";
import EmpleadoService from "../../services/empleadoService";
import type { Empresa } from "../../types/auth";
import type { Empleado } from "../../services/empleadoService";

interface NominaFormModalProps {
  open: boolean;
  isCreating: boolean;
  nomina?: NominaDto | null;
  empresas: Empresa[];
  onClose: () => void;
  onSave: () => Promise<void>;
  showSnackbar: (message: string, severity: "success" | "error") => void;
}

const NominaFormModal: React.FC<NominaFormModalProps> = ({
  open,
  isCreating,
  nomina,
  empresas,
  onClose,
  onSave,
  showSnackbar,
}) => {
  // Texto crudo de inputs numéricos (para permitir estados intermedios como "12.")
  const [numericText, setNumericText] = useState<Record<string, string>>({});

  // Estados del formulario
  const [formEmpresaId, setFormEmpresaId] = useState<number | null>(null);
  const [formEmpleados, setFormEmpleados] = useState<Empleado[]>([]);
  const [formEmpleadoId, setFormEmpleadoId] = useState<number | null>(null);
  const [formAno, setFormAno] = useState<number | null>(null);
  const [formMes, setFormMes] = useState<number | null>(null);
  const [formPeriodo, setFormPeriodo] = useState<"A" | "B" | null>(null);
  const [formFechaInicio, setFormFechaInicio] = useState<string>("");
  const [formFechaFin, setFormFechaFin] = useState<string>("");
  const [formCodigoNomina, setFormCodigoNomina] = useState<string>("");
  const [formSueldoMensual, setFormSueldoMensual] = useState<number>(0);
  const [formNombrePeriodo, setFormNombrePeriodo] = useState<string>("");

  // Días
  const [formDiasLaborados, setFormDiasLaborados] = useState<number>(0);
  const [formDiasVacaciones, setFormDiasVacaciones] = useState<number>(0);
  const [formDiasIncapacidad, setFormDiasIncapacidad] = useState<number>(0);

  // Percepciones
  const [formSubtotalQuincena, setFormSubtotalQuincena] = useState<number>(0);
  const [formMontoVacaciones, setFormMontoVacaciones] = useState<number>(0);
  const [formMontoDiasLaborados, setFormMontoDiasLaborados] =
    useState<number>(0);
  const [formMontoExcedenteIHSS, setFormMontoExcedenteIHSS] =
    useState<number>(0);
  const [
    formMontoIncapacidadCubreEmpresa,
    setFormMontoIncapacidadCubreEmpresa,
  ] = useState<number>(0);
  const [formMontoPermisosJustificados, setFormMontoPermisosJustificados] =
    useState<number>(0);
  const [formTotalPercepciones, setFormTotalPercepciones] = useState<number>(0);

  // Horas Extra
  const [formMontoHoras25, setFormMontoHoras25] = useState<number>(0);
  const [formMontoHoras50, setFormMontoHoras50] = useState<number>(0);
  const [formMontoHoras75, setFormMontoHoras75] = useState<number>(0);
  const [formMontoHoras100, setFormMontoHoras100] = useState<number>(0);

  // Deducciones
  const [formAjuste, setFormAjuste] = useState<number>(0);
  const [formDeduccionIHSS, setFormDeduccionIHSS] = useState<number>(0);
  const [formDeduccionISR, setFormDeduccionISR] = useState<number>(0);
  const [formDeduccionRAP, setFormDeduccionRAP] = useState<number>(0);
  const [formDeduccionAlimentacion, setFormDeduccionAlimentacion] =
    useState<number>(0);
  const [formCobroPrestamo, setFormCobroPrestamo] = useState<number>(0);
  const [formImpuestoVecinal, setFormImpuestoVecinal] = useState<number>(0);
  const [formOtros, setFormOtros] = useState<number>(0);
  const [formTotalDeducciones, setFormTotalDeducciones] = useState<number>(0);
  const [formTotalNetoPagar, setFormTotalNetoPagar] = useState<number>(0);

  // Otros
  const [formComentario, setFormComentario] = useState<string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Años disponibles (año actual y los siguientes 5 años)
  const añosDisponibles = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear + i);
  }, []);

  // Meses disponibles
  const mesesDisponibles = React.useMemo(() => {
    return [
      { value: 1, label: "Enero" },
      { value: 2, label: "Febrero" },
      { value: 3, label: "Marzo" },
      { value: 4, label: "Abril" },
      { value: 5, label: "Mayo" },
      { value: 6, label: "Junio" },
      { value: 7, label: "Julio" },
      { value: 8, label: "Agosto" },
      { value: 9, label: "Septiembre" },
      { value: 10, label: "Octubre" },
      { value: 11, label: "Noviembre" },
      { value: 12, label: "Diciembre" },
    ];
  }, []);

  // Extraer año, mes y período del código de nómina
  const extraerAnoMesPeriodo = useCallback(
    (codigoNomina: string | null | undefined) => {
      if (!codigoNomina || codigoNomina.length !== 7) {
        return { ano: null, mes: null, periodo: null };
      }
      const ano = parseInt(codigoNomina.substring(0, 4));
      const mes = parseInt(codigoNomina.substring(4, 6));
      const periodo = codigoNomina.substring(6, 7) as "A" | "B";
      return { ano, mes, periodo };
    },
    []
  );

  // Calcular fechas y código basado en año, mes y período
  const calcularFechasYCodigo = useCallback(
    (ano: number | null, mes: number | null, periodo: "A" | "B" | null) => {
      if (!ano || !mes || !periodo) {
        setFormFechaInicio("");
        setFormFechaFin("");
        setFormCodigoNomina("");
        return;
      }

      const mesStr = String(mes).padStart(2, "0");
      const codigo = `${ano}${mesStr}${periodo}`;
      setFormCodigoNomina(codigo);

      let fechaInicio: Date;
      let fechaFin: Date;

      if (periodo === "A") {
        // Primera quincena: 27 del mes anterior al 11 del mes actual
        const mesAnterior = mes === 1 ? 12 : mes - 1;
        const anoInicio = mes === 1 ? ano - 1 : ano;
        fechaInicio = new Date(anoInicio, mesAnterior - 1, 27);
        fechaFin = new Date(ano, mes - 1, 11);
      } else {
        // Segunda quincena: 12 al 26 del mes seleccionado
        fechaInicio = new Date(ano, mes - 1, 12);
        fechaFin = new Date(ano, mes - 1, 26);
      }

      setFormFechaInicio(fechaInicio.toISOString().split("T")[0]);
      setFormFechaFin(fechaFin.toISOString().split("T")[0]);
    },
    []
  );

  // Efecto para calcular fechas cuando cambian año, mes o período
  useEffect(() => {
    calcularFechasYCodigo(formAno, formMes, formPeriodo);
  }, [formAno, formMes, formPeriodo, calcularFechasYCodigo]);

  const normalizeNumericText = useCallback((raw: string) => {
    // Convertir coma a punto (teclados ES)
    return raw.replace(/,/g, ".");
  }, []);

  const isValidNumericText = useCallback(
    (
      raw: string,
      opts: {
        allowNegative: boolean;
        allowDecimal: boolean;
        maxDecimals: number;
      }
    ) => {
      const { allowNegative, allowDecimal, maxDecimals } = opts;
      if (raw === "" || raw === "." || raw === "-" || raw === "-.") return true;

      // Solo chars permitidos
      const allowed = allowNegative ? /^[0-9.\-]+$/ : /^[0-9.]+$/;
      if (!allowed.test(raw)) return false;

      // Máximo un punto (y opcionalmente sin decimales)
      const dotCount = (raw.match(/\./g) || []).length;
      if (dotCount > 1) return false;
      if (!allowDecimal && dotCount > 0) return false;

      // Negativo: solo 1 '-' y solo al inicio
      if (allowNegative) {
        const negCount = (raw.match(/-/g) || []).length;
        if (negCount > 1) return false;
        if (negCount === 1 && raw[0] !== "-") return false;
      } else {
        if (raw.includes("-")) return false;
      }

      // Decimales: máximo N dígitos después del punto (permite estado intermedio "12.")
      if (allowDecimal && raw.includes(".")) {
        const decimals = raw.split(".")[1] ?? "";
        if (decimals.length > maxDecimals) return false;
      }

      return true;
    },
    []
  );

  const parseNumericOrNull = useCallback((raw: string) => {
    if (raw === "" || raw === "." || raw === "-" || raw === "-.") return null;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  }, []);

  // Cargar empleados cuando se selecciona una empresa
  useEffect(() => {
    const fetchEmpleados = async () => {
      if (!formEmpresaId) {
        setFormEmpleados([]);
        setFormEmpleadoId(null);
        return;
      }

      try {
        const data = await EmpleadoService.getAll(formEmpresaId);
        setFormEmpleados(data);
        // Si estamos editando y el empleado actual pertenece a esta empresa, mantenerlo seleccionado
        if (nomina && !isCreating) {
          const empleadoActual = data.find((e) => e.id === nomina.empleadoId);
          if (empleadoActual) {
            setFormEmpleadoId(nomina.empleadoId);
          } else {
            setFormEmpleadoId(null);
          }
        }
      } catch (err) {
        console.error("Error al cargar empleados:", err);
        showSnackbar("Error al cargar los colaboradores", "error");
      }
    };
    fetchEmpleados();
  }, [formEmpresaId, nomina, isCreating, showSnackbar]);

  // Inicializar formulario cuando se abre el modal o cambia la nómina
  useEffect(() => {
    if (!open) {
      return;
    }

    if (nomina && !isCreating) {
      // Modo edición
      setFormEmpresaId(nomina.empresaId);
      setFormEmpleadoId(nomina.empleadoId);

      // Extraer año, mes y período del código
      const { ano, mes, periodo } = extraerAnoMesPeriodo(nomina.codigoNomina);
      setFormAno(ano);
      setFormMes(mes);
      setFormPeriodo(periodo);

      // Las fechas se calcularán automáticamente con el useEffect
      setFormSueldoMensual(nomina.sueldoMensual || 0);
      setFormNombrePeriodo(nomina.nombrePeriodoNomina || "");

      // Cargar todos los campos adicionales
      setFormDiasLaborados(nomina.diasLaborados ?? 0);
      setFormDiasVacaciones(nomina.diasVacaciones ?? 0);
      setFormDiasIncapacidad(nomina.diasIncapacidad ?? 0);
      setFormSubtotalQuincena(nomina.subtotalQuincena ?? 0);
      setFormMontoVacaciones(nomina.montoVacaciones ?? 0);
      setFormMontoDiasLaborados(nomina.montoDiasLaborados ?? 0);
      setFormMontoExcedenteIHSS(nomina.montoExcedenteIHSS ?? 0);
      setFormMontoIncapacidadCubreEmpresa(
        nomina.montoIncapacidadCubreEmpresa ?? 0
      );
      setFormMontoPermisosJustificados(nomina.montoPermisosJustificados ?? 0);
      setFormTotalPercepciones(nomina.totalPercepciones ?? 0);
      setFormMontoHoras25(nomina.montoHoras25 ?? 0);
      setFormMontoHoras50(nomina.montoHoras50 ?? 0);
      setFormMontoHoras75(nomina.montoHoras75 ?? 0);
      setFormMontoHoras100(nomina.montoHoras100 ?? 0);
      setFormAjuste(nomina.ajuste ?? 0);
      setFormDeduccionIHSS(nomina.deduccionIHSS ?? 0);
      setFormDeduccionISR(nomina.deduccionISR ?? 0);
      setFormDeduccionRAP(nomina.deduccionRAP ?? 0);
      setFormDeduccionAlimentacion(nomina.deduccionAlimentacion ?? 0);
      setFormCobroPrestamo(nomina.cobroPrestamo ?? 0);
      setFormImpuestoVecinal(nomina.impuestoVecinal ?? 0);
      setFormOtros(nomina.otros ?? 0);
      setFormTotalDeducciones(nomina.totalDeducciones ?? 0);
      setFormTotalNetoPagar(nomina.totalNetoPagar ?? 0);
      setFormComentario(nomina.comentario || "");

      setNumericText({
        sueldoMensual:
          nomina.sueldoMensual != null ? String(nomina.sueldoMensual) : "",
        diasLaborados:
          nomina.diasLaborados != null ? String(nomina.diasLaborados) : "",
        diasVacaciones:
          nomina.diasVacaciones != null ? String(nomina.diasVacaciones) : "",
        diasIncapacidad:
          nomina.diasIncapacidad != null ? String(nomina.diasIncapacidad) : "",
        subtotalQuincena:
          nomina.subtotalQuincena != null
            ? String(nomina.subtotalQuincena)
            : "",
        montoVacaciones:
          nomina.montoVacaciones != null ? String(nomina.montoVacaciones) : "",
        montoDiasLaborados:
          nomina.montoDiasLaborados != null
            ? String(nomina.montoDiasLaborados)
            : "",
        montoExcedenteIHSS:
          nomina.montoExcedenteIHSS != null
            ? String(nomina.montoExcedenteIHSS)
            : "",
        montoIncapacidadCubreEmpresa:
          nomina.montoIncapacidadCubreEmpresa != null
            ? String(nomina.montoIncapacidadCubreEmpresa)
            : "",
        montoPermisosJustificados:
          nomina.montoPermisosJustificados != null
            ? String(nomina.montoPermisosJustificados)
            : "",
        montoHoras25:
          nomina.montoHoras25 != null ? String(nomina.montoHoras25) : "",
        montoHoras50:
          nomina.montoHoras50 != null ? String(nomina.montoHoras50) : "",
        montoHoras75:
          nomina.montoHoras75 != null ? String(nomina.montoHoras75) : "",
        montoHoras100:
          nomina.montoHoras100 != null ? String(nomina.montoHoras100) : "",
        ajuste: nomina.ajuste != null ? String(nomina.ajuste) : "",
        deduccionIHSS:
          nomina.deduccionIHSS != null ? String(nomina.deduccionIHSS) : "",
        deduccionISR:
          nomina.deduccionISR != null ? String(nomina.deduccionISR) : "",
        deduccionRAP:
          nomina.deduccionRAP != null ? String(nomina.deduccionRAP) : "",
        deduccionAlimentacion:
          nomina.deduccionAlimentacion != null
            ? String(nomina.deduccionAlimentacion)
            : "",
        cobroPrestamo:
          nomina.cobroPrestamo != null ? String(nomina.cobroPrestamo) : "",
        impuestoVecinal:
          nomina.impuestoVecinal != null ? String(nomina.impuestoVecinal) : "",
        otros: nomina.otros != null ? String(nomina.otros) : "",
      });
    } else {
      // Modo creación
      setFormEmpresaId(null);
      setFormEmpleadoId(null);
      setFormAno(null);
      setFormMes(null);
      setFormPeriodo(null);
      setFormFechaInicio("");
      setFormFechaFin("");
      setFormCodigoNomina("");
      setFormSueldoMensual(0);
      setFormNombrePeriodo("");

      // Resetear todos los campos adicionales
      setFormDiasLaborados(0);
      setFormDiasVacaciones(0);
      setFormDiasIncapacidad(0);
      setFormSubtotalQuincena(0);
      setFormMontoVacaciones(0);
      setFormMontoDiasLaborados(0);
      setFormMontoExcedenteIHSS(0);
      setFormMontoIncapacidadCubreEmpresa(0);
      setFormMontoPermisosJustificados(0);
      setFormTotalPercepciones(0);
      setFormMontoHoras25(0);
      setFormMontoHoras50(0);
      setFormMontoHoras75(0);
      setFormMontoHoras100(0);
      setFormAjuste(0);
      setFormDeduccionIHSS(0);
      setFormDeduccionISR(0);
      setFormDeduccionRAP(0);
      setFormDeduccionAlimentacion(0);
      setFormCobroPrestamo(0);
      setFormImpuestoVecinal(0);
      setFormOtros(0);
      setFormTotalDeducciones(0);
      setFormTotalNetoPagar(0);
      setFormComentario("");

      setNumericText({});
    }
    setFormErrors({});
  }, [open, nomina, isCreating, extraerAnoMesPeriodo]);

  // Sincronizar numericText.sueldoMensual con formSueldoMensual cuando cambia
  // (solo si el cambio viene de fuera del input, no del handleNumericChange)
  useEffect(() => {
    if (formSueldoMensual > 0) {
      const sueldoText = String(formSueldoMensual);
      setNumericText((prev) => {
        // Solo actualizar si es diferente para evitar loops infinitos
        if (prev.sueldoMensual !== sueldoText) {
          return {
            ...prev,
            sueldoMensual: sueldoText,
          };
        }
        return prev;
      });
    } else if (formSueldoMensual === 0) {
      setNumericText((prev) => {
        // Si se resetea a 0 y hay texto, limpiarlo
        if (prev.sueldoMensual) {
          return {
            ...prev,
            sueldoMensual: "",
          };
        }
        return prev;
      });
    }
  }, [formSueldoMensual]);

  // Calcular Total Percepciones automáticamente
  // Nota: montoExcedenteIHSS NO se incluye en totalPercepciones
  // totalPercepciones = subtotalQuincena + horas extra + ajuste
  useEffect(() => {
    const total =
      (formSubtotalQuincena ?? 0) +
      (formMontoHoras25 ?? 0) +
      (formMontoHoras50 ?? 0) +
      (formMontoHoras75 ?? 0) +
      (formMontoHoras100 ?? 0) +
      (formAjuste ?? 0);

    setFormTotalPercepciones(total);
  }, [
    formSubtotalQuincena,
    formMontoHoras25,
    formMontoHoras50,
    formMontoHoras75,
    formMontoHoras100,
    formAjuste,
  ]);

  // Calcular Total Deducciones automáticamente
  useEffect(() => {
    const total =
      (formDeduccionIHSS ?? 0) +
      (formDeduccionISR ?? 0) +
      (formDeduccionRAP ?? 0) +
      (formDeduccionAlimentacion ?? 0) +
      (formCobroPrestamo ?? 0) +
      (formImpuestoVecinal ?? 0) +
      (formOtros ?? 0);

    setFormTotalDeducciones(total);
  }, [
    formDeduccionIHSS,
    formDeduccionISR,
    formDeduccionRAP,
    formDeduccionAlimentacion,
    formCobroPrestamo,
    formImpuestoVecinal,
    formOtros,
  ]);

  // Calcular Total Neto a Pagar automáticamente
  useEffect(() => {
    const percepciones = formTotalPercepciones ?? 0;
    const deducciones = formTotalDeducciones ?? 0;
    const total = percepciones - deducciones;

    setFormTotalNetoPagar(total);
  }, [formTotalPercepciones, formTotalDeducciones]);

  // Handler para onChange de campos numéricos:
  // - Guarda texto crudo (permite "12."), y
  // - Solo actualiza el estado numérico si el texto es válido (si no, deja el estado anterior)
  const handleNumericChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      key: string,
      setter: (value: number) => void,
      opts?: {
        allowNegative?: boolean;
        allowDecimal?: boolean;
        maxDecimals?: number;
      }
    ) => {
      const allowNegative = opts?.allowNegative === true;
      const allowDecimal = opts?.allowDecimal !== false;
      const maxDecimals = opts?.maxDecimals ?? 2;

      const nextRaw = normalizeNumericText(e.target.value);
      if (
        !isValidNumericText(nextRaw, {
          allowNegative,
          allowDecimal,
          maxDecimals,
        })
      ) {
        return; // mantener estado anterior
      }

      setNumericText((prev) => ({ ...prev, [key]: nextRaw }));

      const parsed = parseNumericOrNull(nextRaw);
      setter(parsed ?? 0);
    },
    [isValidNumericText, normalizeNumericText, parseNumericOrNull]
  );

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

  // Validar formulario
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formEmpresaId) {
      errors.empresaId = "La empresa es requerida";
    }
    if (!formEmpleadoId) {
      errors.empleadoId = "El colaborador es requerido";
    }
    if (!formAno) {
      errors.ano = "El año es requerido";
    }
    if (!formMes) {
      errors.mes = "El mes es requerido";
    }
    if (!formPeriodo) {
      errors.periodo = "El período es requerido";
    }
    if (!formFechaInicio || !formFechaFin) {
      errors.fechaInicio = "Las fechas deben ser calculadas correctamente";
    }
    if (formSueldoMensual <= 0) {
      errors.sueldoMensual = "El sueldo mensual debe ser mayor a 0";
    }

    // Validaciones según schema.prisma
    if (!formNombrePeriodo || formNombrePeriodo.trim() === "") {
      errors.nombrePeriodo = "El nombre del período es requerido";
    } else if (formNombrePeriodo.length > 100) {
      errors.nombrePeriodo =
        "El nombre del período no puede exceder 100 caracteres";
    }

    if (formCodigoNomina && formCodigoNomina.length > 10) {
      errors.codigoNomina =
        "El código de nómina no puede exceder 10 caracteres";
    }

    if (formComentario && formComentario.length > 200) {
      errors.comentario = "El comentario no puede exceder 200 caracteres";
    }

    // Validar campos numéricos (no pueden ser negativos excepto ajuste)
    const camposNumericos = [
      {
        key: "diasLaborados",
        value: formDiasLaborados,
        label: "Días Laborados",
      },
      {
        key: "diasVacaciones",
        value: formDiasVacaciones,
        label: "Días Vacaciones",
      },
      {
        key: "diasIncapacidad",
        value: formDiasIncapacidad,
        label: "Días Incapacidad",
      },
      {
        key: "subtotalQuincena",
        value: formSubtotalQuincena,
        label: "Subtotal Quincena",
      },
      {
        key: "montoVacaciones",
        value: formMontoVacaciones,
        label: "Monto Vacaciones",
      },
      {
        key: "montoDiasLaborados",
        value: formMontoDiasLaborados,
        label: "Monto Días Laborados",
      },
      {
        key: "montoExcedenteIHSS",
        value: formMontoExcedenteIHSS,
        label: "Monto Excedente IHSS",
      },
      {
        key: "montoIncapacidadCubreEmpresa",
        value: formMontoIncapacidadCubreEmpresa,
        label: "Monto Incapacidad Cubre Empresa",
      },
      {
        key: "montoPermisosJustificados",
        value: formMontoPermisosJustificados,
        label: "Monto Permisos Justificados",
      },
      {
        key: "totalPercepciones",
        value: formTotalPercepciones,
        label: "Total Percepciones",
      },
      {
        key: "montoHoras25",
        value: formMontoHoras25,
        label: "Monto Horas 25%",
      },
      {
        key: "montoHoras50",
        value: formMontoHoras50,
        label: "Monto Horas 50%",
      },
      {
        key: "montoHoras75",
        value: formMontoHoras75,
        label: "Monto Horas 75%",
      },
      {
        key: "montoHoras100",
        value: formMontoHoras100,
        label: "Monto Horas 100%",
      },
      {
        key: "deduccionIHSS",
        value: formDeduccionIHSS,
        label: "Deducción IHSS",
      },
      { key: "deduccionISR", value: formDeduccionISR, label: "Deducción ISR" },
      { key: "deduccionRAP", value: formDeduccionRAP, label: "Deducción RAP" },
      {
        key: "deduccionAlimentacion",
        value: formDeduccionAlimentacion,
        label: "Deducción Alimentación",
      },
      {
        key: "cobroPrestamo",
        value: formCobroPrestamo,
        label: "Cobro Préstamo",
      },
      {
        key: "impuestoVecinal",
        value: formImpuestoVecinal,
        label: "Impuesto Vecinal",
      },
      { key: "otros", value: formOtros, label: "Otros" },
      {
        key: "totalDeducciones",
        value: formTotalDeducciones,
        label: "Total Deducciones",
      },
      {
        key: "totalNetoPagar",
        value: formTotalNetoPagar,
        label: "Total Neto a Pagar",
      },
    ];

    camposNumericos.forEach(({ key, value, label }) => {
      if (value !== null && value !== undefined && value < 0) {
        errors[key] = `${label} no puede ser negativo`;
      }
    });

    return errors;
  };

  // Guardar nómina (crear o actualizar)
  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const payload = {
        empleadoId: formEmpleadoId!,
        fechaInicio: formFechaInicio,
        fechaFin: formFechaFin,
        sueldoMensual: formSueldoMensual,
        nombrePeriodoNomina: formNombrePeriodo,
        diasLaborados: formDiasLaborados ?? 0,
        diasVacaciones: formDiasVacaciones ?? 0,
        diasIncapacidad: formDiasIncapacidad ?? 0,
        subtotalQuincena: formSubtotalQuincena ?? 0,
        montoVacaciones: formMontoVacaciones ?? 0,
        montoDiasLaborados: formMontoDiasLaborados ?? 0,
        montoExcedenteIHSS: formMontoExcedenteIHSS ?? 0,
        montoIncapacidadCubreEmpresa: formMontoIncapacidadCubreEmpresa ?? 0,
        montoPermisosJustificados: formMontoPermisosJustificados ?? 0,
        montoHoras25: formMontoHoras25 ?? 0,
        montoHoras50: formMontoHoras50 ?? 0,
        montoHoras75: formMontoHoras75 ?? 0,
        montoHoras100: formMontoHoras100 ?? 0,
        ajuste: formAjuste ?? 0,
        totalPercepciones: formTotalPercepciones ?? 0,
        deduccionIHSS: formDeduccionIHSS ?? 0,
        deduccionISR: formDeduccionISR ?? 0,
        deduccionRAP: formDeduccionRAP ?? 0,
        deduccionAlimentacion: formDeduccionAlimentacion ?? 0,
        cobroPrestamo: formCobroPrestamo ?? 0,
        impuestoVecinal: formImpuestoVecinal ?? 0,
        otros: formOtros ?? 0,
        totalDeducciones: formTotalDeducciones ?? 0,
        totalNetoPagar: formTotalNetoPagar ?? 0,
        comentario: formComentario || null,
      };

      if (isCreating) {
        await NominaService.create(payload);
        showSnackbar("Nómina creada exitosamente", "success");
      } else if (nomina) {
        await NominaService.update(nomina.id, payload);
        showSnackbar("Nómina actualizada exitosamente", "success");
      }
      onClose();
      await onSave();
    } catch (err: any) {
      console.error("Error al guardar nómina:", err);
      const errorMessage =
        err?.response?.data?.message || "Error al guardar la nómina";
      showSnackbar(errorMessage, "error");

      // Si hay errores de validación del backend, mostrarlos
      if (err?.response?.data?.errors) {
        const backendErrors: Record<string, string> = {};
        err.response.data.errors.forEach(
          (error: { field: string; message: string }) => {
            backendErrors[error.field] = error.message;
          }
        );
        setFormErrors(backendErrors);
      }
    }
  };

  // Obtener nombre del empleado
  const getEmpleadoNombre = (empleadoId: number) => {
    const empleado = formEmpleados.find((e) => e.id === empleadoId);
    return empleado
      ? `${empleado.nombre} ${empleado.apellido}`.trim()
      : `ID: ${empleadoId}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isCreating ? "Crear Nómina" : "Editar Nómina"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Fila 1: Empresa y Colaborador */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            {/* Empresa - Solo lectura al editar */}
            <Autocomplete
              options={empresas}
              getOptionLabel={(opt) => opt.nombre || ""}
              value={empresas.find((e) => e.id === formEmpresaId) || null}
              onChange={(_, value) => {
                setFormEmpresaId(value?.id || null);
                setFormEmpleadoId(null);
              }}
              disabled={!isCreating}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Empresa"
                  required
                  error={!!formErrors.empresaId}
                  helperText={formErrors.empresaId}
                />
              )}
            />

            {/* Empleado - Solo lectura al editar */}
            {isCreating ? (
              <Autocomplete
                options={formEmpleados}
                getOptionLabel={(opt) =>
                  `${opt.nombre} ${opt.apellido}`.trim() || ""
                }
                value={
                  formEmpleados.find((e) => e.id === formEmpleadoId) || null
                }
                onChange={(_, value) => {
                  setFormEmpleadoId(value?.id || null);
                  if (value) {
                    const sueldo = value.sueldoMensual || 0;
                    setFormSueldoMensual(sueldo);
                    // Actualizar también el texto numérico para que se muestre en el input
                    setNumericText((prev) => ({
                      ...prev,
                      sueldoMensual: sueldo > 0 ? String(sueldo) : "",
                    }));
                  } else {
                    // Si se deselecciona, limpiar el sueldo
                    setFormSueldoMensual(0);
                    setNumericText((prev) => ({
                      ...prev,
                      sueldoMensual: "",
                    }));
                  }
                }}
                disabled={!formEmpresaId}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Colaborador"
                    required
                    error={!!formErrors.empleadoId}
                    helperText={formErrors.empleadoId}
                  />
                )}
              />
            ) : (
              <TextField
                label="Colaborador"
                value={nomina ? getEmpleadoNombre(nomina.empleadoId) : ""}
                disabled
                fullWidth
              />
            )}
          </Box>

          {/* Fila 2: Año, Mes y Período */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            {/* Año */}
            <FormControl fullWidth required error={!!formErrors.ano}>
              <InputLabel>Año</InputLabel>
              <Select
                value={formAno || ""}
                onChange={(e) =>
                  setFormAno(e.target.value ? Number(e.target.value) : null)
                }
                label="Año"
                disabled={!isCreating}
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
              {formErrors.ano && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 0.5, ml: 1.75 }}
                >
                  {formErrors.ano}
                </Typography>
              )}
            </FormControl>

            {/* Mes */}
            <FormControl fullWidth required error={!!formErrors.mes}>
              <InputLabel>Mes</InputLabel>
              <Select
                value={formMes || ""}
                onChange={(e) =>
                  setFormMes(e.target.value ? Number(e.target.value) : null)
                }
                label="Mes"
                disabled={!isCreating}
              >
                <MenuItem value="">
                  <em>Seleccione</em>
                </MenuItem>
                {mesesDisponibles.map((mes) => (
                  <MenuItem key={mes.value} value={mes.value}>
                    {mes.label}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.mes && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 0.5, ml: 1.75 }}
                >
                  {formErrors.mes}
                </Typography>
              )}
            </FormControl>

            {/* Período */}
            <FormControl fullWidth required error={!!formErrors.periodo}>
              <InputLabel>Período</InputLabel>
              <Select
                value={formPeriodo || ""}
                onChange={(e) =>
                  setFormPeriodo(e.target.value as "A" | "B" | null)
                }
                label="Período"
                disabled={!isCreating}
              >
                <MenuItem value="">
                  <em>Seleccione</em>
                </MenuItem>
                <MenuItem value="A">Primera Quincena</MenuItem>
                <MenuItem value="B">Segunda Quincena</MenuItem>
              </Select>
              {formErrors.periodo && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 0.5, ml: 1.75 }}
                >
                  {formErrors.periodo}
                </Typography>
              )}
            </FormControl>
          </Box>

          {/* Fila 3: Código, Fecha Inicio y Fecha Fin */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            {/* Código de Nómina (solo lectura) */}
            <TextField
              label="Código de Nómina"
              value={formCodigoNomina}
              disabled
              fullWidth
              error={!!formErrors.codigoNomina}
              helperText={
                formErrors.codigoNomina ||
                "Generado automáticamente (máx. 10 caracteres)"
              }
            />

            {/* Fecha Inicio (solo lectura) */}
            <TextField
              label="Fecha Inicio"
              type="date"
              value={formFechaInicio}
              disabled
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Calculada automáticamente"
            />

            {/* Fecha Fin (solo lectura) */}
            <TextField
              label="Fecha Fin"
              type="date"
              value={formFechaFin}
              disabled
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Calculada automáticamente"
            />
          </Box>

          {/* Sueldo Mensual */}
          <TextField
            label="Sueldo Mensual"
            type="text"
            value={
              numericText.sueldoMensual ??
              (formSueldoMensual ? String(formSueldoMensual) : "")
            }
            onChange={(e) => {
              handleNumericChange(
                e,
                "sueldoMensual",
                (v) => setFormSueldoMensual(v),
                {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 2,
                }
              );
            }}
            onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
            required
            fullWidth
            error={!!formErrors.sueldoMensual}
            helperText={formErrors.sueldoMensual}
          />

          {/* Nombre Período */}
          <TextField
            label="Nombre Período"
            value={formNombrePeriodo}
            onChange={(e) => setFormNombrePeriodo(e.target.value)}
            fullWidth
            required
            inputProps={{ maxLength: 100 }}
            error={!!formErrors.nombrePeriodo}
            helperText={
              formErrors.nombrePeriodo ||
              "Ej: Enero - Primera Quincena (máx. 100 caracteres)"
            }
          />

          <Divider sx={{ my: 2 }} />

          {/* Sección: Días */}
          <Typography variant="h6" sx={{ mt: 1 }}>
            Días
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Días Laborados"
              type="text"
              value={numericText.diasLaborados ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "diasLaborados", setFormDiasLaborados, {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 3,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.diasLaborados}
              helperText={formErrors.diasLaborados}
            />
            <TextField
              label="Días Vacaciones"
              type="text"
              value={numericText.diasVacaciones ?? ""}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  "diasVacaciones",
                  setFormDiasVacaciones,
                  {
                    allowNegative: false,
                    allowDecimal: true,
                    maxDecimals: 3,
                  }
                )
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.diasVacaciones}
              helperText={formErrors.diasVacaciones}
            />
            <TextField
              label="Días Incapacidad"
              type="text"
              value={numericText.diasIncapacidad ?? ""}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  "diasIncapacidad",
                  setFormDiasIncapacidad,
                  {
                    allowNegative: false,
                    allowDecimal: false,
                    maxDecimals: 0,
                  }
                )
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, false)}
              fullWidth
              error={!!formErrors.diasIncapacidad}
              helperText={formErrors.diasIncapacidad}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Sección: Percepciones */}
          <Typography variant="h6" sx={{ mt: 1 }}>
            Percepciones
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Subtotal Quincena"
              type="text"
              value={numericText.subtotalQuincena ?? ""}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  "subtotalQuincena",
                  setFormSubtotalQuincena,
                  {
                    allowNegative: false,
                    allowDecimal: true,
                    maxDecimals: 2,
                  }
                )
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.subtotalQuincena}
              helperText={formErrors.subtotalQuincena}
            />
            <TextField
              label="Monto Vacaciones"
              type="text"
              value={numericText.montoVacaciones ?? ""}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  "montoVacaciones",
                  setFormMontoVacaciones,
                  {
                    allowNegative: false,
                    allowDecimal: true,
                    maxDecimals: 2,
                  }
                )
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.montoVacaciones}
              helperText={formErrors.montoVacaciones}
            />
            <TextField
              label="Monto Días Laborados"
              type="text"
              value={numericText.montoDiasLaborados ?? ""}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  "montoDiasLaborados",
                  setFormMontoDiasLaborados,
                  {
                    allowNegative: false,
                    allowDecimal: true,
                    maxDecimals: 2,
                  }
                )
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.montoDiasLaborados}
              helperText={formErrors.montoDiasLaborados}
            />
            <TextField
              label="Monto Excedente IHSS"
              type="text"
              value={numericText.montoExcedenteIHSS ?? ""}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  "montoExcedenteIHSS",
                  setFormMontoExcedenteIHSS,
                  {
                    allowNegative: false,
                    allowDecimal: true,
                    maxDecimals: 2,
                  }
                )
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.montoExcedenteIHSS}
              helperText={formErrors.montoExcedenteIHSS}
            />
            <TextField
              label="Monto Incapacidad Cubre Empresa"
              type="text"
              value={numericText.montoIncapacidadCubreEmpresa ?? ""}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  "montoIncapacidadCubreEmpresa",
                  setFormMontoIncapacidadCubreEmpresa,
                  {
                    allowNegative: false,
                    allowDecimal: true,
                    maxDecimals: 2,
                  }
                )
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.montoIncapacidadCubreEmpresa}
              helperText={formErrors.montoIncapacidadCubreEmpresa}
            />
            <TextField
              label="Monto Permisos Justificados"
              type="text"
              value={numericText.montoPermisosJustificados ?? ""}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  "montoPermisosJustificados",
                  setFormMontoPermisosJustificados,
                  {
                    allowNegative: false,
                    allowDecimal: true,
                    maxDecimals: 2,
                  }
                )
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.montoPermisosJustificados}
              helperText={formErrors.montoPermisosJustificados}
            />
            <TextField
              label="Total Percepciones"
              type="text"
              value={formTotalPercepciones ?? ""}
              disabled
              fullWidth
              helperText="Calculado automáticamente"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Sección: Horas Extra */}
          <Typography variant="h6" sx={{ mt: 1 }}>
            Horas Extra
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Monto Horas 25%"
              type="text"
              value={numericText.montoHoras25 ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "montoHoras25", setFormMontoHoras25, {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 2,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.montoHoras25}
              helperText={formErrors.montoHoras25}
            />
            <TextField
              label="Monto Horas 50%"
              type="text"
              value={numericText.montoHoras50 ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "montoHoras50", setFormMontoHoras50, {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 2,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.montoHoras50}
              helperText={formErrors.montoHoras50}
            />
            <TextField
              label="Monto Horas 75%"
              type="text"
              value={numericText.montoHoras75 ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "montoHoras75", setFormMontoHoras75, {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 2,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.montoHoras75}
              helperText={formErrors.montoHoras75}
            />
            <TextField
              label="Monto Horas 100%"
              type="text"
              value={numericText.montoHoras100 ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "montoHoras100", setFormMontoHoras100, {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 2,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.montoHoras100}
              helperText={formErrors.montoHoras100}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Sección: Deducciones */}
          <Typography variant="h6" sx={{ mt: 1 }}>
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
              label="Ajuste"
              type="text"
              value={numericText.ajuste ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "ajuste", setFormAjuste, {
                  allowNegative: true,
                  allowDecimal: true,
                  maxDecimals: 2,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, true, true)}
              fullWidth
              helperText="Puede ser positivo o negativo"
            />
            <TextField
              label="Deducción IHSS"
              type="text"
              value={numericText.deduccionIHSS ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "deduccionIHSS", setFormDeduccionIHSS, {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 2,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.deduccionIHSS}
              helperText={formErrors.deduccionIHSS}
            />
            <TextField
              label="Deducción ISR"
              type="text"
              value={numericText.deduccionISR ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "deduccionISR", setFormDeduccionISR, {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 2,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.deduccionISR}
              helperText={formErrors.deduccionISR}
            />
            <TextField
              label="Deducción RAP"
              type="text"
              value={numericText.deduccionRAP ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "deduccionRAP", setFormDeduccionRAP, {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 2,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.deduccionRAP}
              helperText={formErrors.deduccionRAP}
            />
            <TextField
              label="Deducción Alimentación"
              type="text"
              value={numericText.deduccionAlimentacion ?? ""}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  "deduccionAlimentacion",
                  setFormDeduccionAlimentacion,
                  {
                    allowNegative: false,
                    allowDecimal: true,
                    maxDecimals: 2,
                  }
                )
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.deduccionAlimentacion}
              helperText={formErrors.deduccionAlimentacion}
            />
            <TextField
              label="Cobro Préstamo"
              type="text"
              value={numericText.cobroPrestamo ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "cobroPrestamo", setFormCobroPrestamo, {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 2,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.cobroPrestamo}
              helperText={formErrors.cobroPrestamo}
            />
            <TextField
              label="Impuesto Vecinal"
              type="text"
              value={numericText.impuestoVecinal ?? ""}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  "impuestoVecinal",
                  setFormImpuestoVecinal,
                  {
                    allowNegative: false,
                    allowDecimal: true,
                    maxDecimals: 2,
                  }
                )
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.impuestoVecinal}
              helperText={formErrors.impuestoVecinal}
            />
            <TextField
              label="Otros"
              type="text"
              value={numericText.otros ?? ""}
              onChange={(e) =>
                handleNumericChange(e, "otros", setFormOtros, {
                  allowNegative: false,
                  allowDecimal: true,
                  maxDecimals: 2,
                })
              }
              onKeyPress={(e) => handleNumericKeyPress(e, false, true)}
              fullWidth
              error={!!formErrors.otros}
              helperText={formErrors.otros}
            />
            <TextField
              label="Total Deducciones"
              type="text"
              value={formTotalDeducciones ?? ""}
              disabled
              fullWidth
              helperText="Calculado automáticamente"
            />
            <TextField
              label="Total Neto a Pagar"
              type="text"
              value={formTotalNetoPagar ?? ""}
              disabled
              fullWidth
              helperText="Calculado automáticamente (Percepciones - Deducciones)"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Comentario */}
          <TextField
            label="Comentario"
            value={formComentario}
            onChange={(e) => setFormComentario(e.target.value)}
            multiline
            rows={3}
            fullWidth
            inputProps={{ maxLength: 200 }}
            error={!!formErrors.comentario}
            helperText={
              formErrors.comentario || `${formComentario.length}/200 caracteres`
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">
          {isCreating ? "Crear" : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NominaFormModal;
