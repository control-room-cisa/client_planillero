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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import NominaService, { type NominaDto } from "../../services/nominaService";
import { empresaService } from "../../services/empresaService";
import EmpleadoService from "../../services/empleadoService";
import CalculoHorasTrabajoService from "../../services/calculoHorasTrabajoService";
import type { Empresa } from "../../types/auth";
import type { Empleado } from "../../services/empleadoService";
import { Select, MenuItem, InputLabel, FormControl } from "@mui/material";

const NominasManagement: React.FC = () => {
  const [nominas, setNominas] = useState<NominaDto[]>([]);
  const [allNominas, setAllNominas] = useState<NominaDto[]>([]); // Todas las nóminas para filtrado
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);

  // Estados para modales
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDetailModal, setOpenDetailModal] = useState(false);
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
    const periodos: Array<{ value: string; label: string }> = [];

    // Generar períodos en orden descendente (meses 12 a 1)
    for (let mes = 12; mes >= 1; mes--) {
      const mesStr = String(mes).padStart(2, "0");
      // Primero segunda quincena (B), luego primera quincena (A) para cada mes
      periodos.push({
        value: `${mesStr}B`,
        label: `${meses[mes - 1]} - Segunda Quincena`,
      });
      periodos.push({
        value: `${mesStr}A`,
        label: `${meses[mes - 1]} - Primera Quincena`,
      });
    }
    return periodos;
  }, []);

  // Generar años disponibles (últimos 20 años, máximo hasta el año actual)
  const añosDisponibles = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const años: number[] = [];
    for (let i = currentYear; i >= currentYear - 19; i--) {
      años.push(i);
    }
    return años;
  }, []);

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

  // Filtrar nóminas por búsqueda en frontend
  const filteredNominas = useMemo(() => {
    if (!searchTerm.trim()) {
      return allNominas;
    }

    const searchLower = searchTerm.toLowerCase();
    return allNominas.filter((nomina) => {
      const empleadoNombre = getEmpleadoNombre(nomina.empleadoId).toLowerCase();
      const periodoNombre = (nomina.nombrePeriodoNomina || "").toLowerCase();
      return (
        empleadoNombre.includes(searchLower) ||
        periodoNombre.includes(searchLower)
      );
    });
  }, [allNominas, searchTerm, getEmpleadoNombre]);

  // Actualizar nominas cuando cambia el filtro
  useEffect(() => {
    setNominas(filteredNominas);
  }, [filteredNominas]);

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Formatear moneda
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
    }).format(amount);
  };

  const calcularTotalHorasExtra = useCallback((nomina: NominaDto) => {
    return (
      (nomina.montoHoras25 ?? 0) +
      (nomina.montoHoras50 ?? 0) +
      (nomina.montoHoras75 ?? 0) +
      (nomina.montoHoras100 ?? 0)
    );
  }, []);

  const aggregatedTotals = useMemo(() => {
    return nominas.reduce(
      (acc, nomina) => {
        const sueldoQuincenal = (nomina.sueldoMensual ?? 0) / 2;
        acc.sueldoQuincenal += sueldoQuincenal;
        acc.subtotal += nomina.subtotalQuincena ?? 0;
        acc.horasExtra += calcularTotalHorasExtra(nomina);
        acc.ajustes += nomina.ajuste ?? 0;
        acc.totalDeducciones += nomina.totalDeducciones ?? 0;
        acc.totalNeto += nomina.totalNetoPagar ?? 0;
        return acc;
      },
      {
        sueldoQuincenal: 0,
        subtotal: 0,
        horasExtra: 0,
        ajustes: 0,
        totalDeducciones: 0,
        totalNeto: 0,
      }
    );
  }, [nominas, calcularTotalHorasExtra]);

  // Abrir modal de edición
  const handleOpenEditModal = async (nomina: NominaDto) => {
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
      await NominaService.update(currentNomina.id, editFormData);
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

  // Eliminar nómina
  const handleDelete = async (nomina: NominaDto) => {
    if (nomina.pagado === true) {
      showSnackbar(
        "No se puede eliminar una nómina que ya está pagada",
        "error"
      );
      return;
    }

    if (
      !window.confirm(
        `¿Está seguro que desea eliminar la nómina del período ${
          nomina.nombrePeriodoNomina || "sin nombre"
        }?`
      )
    ) {
      return;
    }

    try {
      await NominaService.delete(nomina.id);
      showSnackbar("Nómina eliminada exitosamente", "success");
      fetchNominas();
    } catch (err: any) {
      console.error("Error al eliminar nómina:", err);
      const errorMessage =
        err?.response?.data?.message || "Error al eliminar la nómina";
      showSnackbar(errorMessage, "error");
    }
  };

  const handleCloseSnackbar = () => {
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
      <Typography variant="h4" gutterBottom sx={{ flexShrink: 0 }}>
        Gestión de Nóminas
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3, flexShrink: 0 }}>
        <Box
          sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}
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
              onChange={(e) => setSelectedPeriodo(e.target.value || null)}
              label="Período"
            >
              <MenuItem value="">
                <em>Seleccione</em>
              </MenuItem>
              {periodosDisponibles.map((periodo) => (
                <MenuItem key={periodo.value} value={periodo.value}>
                  {periodo.label}
                </MenuItem>
              ))}
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

          <Button
            variant="outlined"
            onClick={() => {
              setSelectedEmpresaId(null);
              setSearchTerm("");
              setSelectedYear(null);
              setSelectedPeriodo(null);
            }}
          >
            Limpiar
          </Button>
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
          <Table stickyHeader sx={{ minWidth: 1600 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 220 }}>Período</TableCell>
                <TableCell>Colaborador</TableCell>
                <TableCell>Fecha Inicio</TableCell>
                <TableCell>Fecha Fin</TableCell>
                <TableCell align="right">Sueldo Quincenal</TableCell>
                <TableCell align="right">Subtotal</TableCell>
                <TableCell align="right">Total Horas Extra</TableCell>
                <TableCell align="right">Ajustes</TableCell>
                <TableCell align="right">Total Percepciones</TableCell>
                <TableCell align="right">Deducción IHSS</TableCell>
                <TableCell align="right">Deducción ISR</TableCell>
                <TableCell align="right">Deducción RAP</TableCell>
                <TableCell align="right">Deducción Alimentación</TableCell>
                <TableCell align="right">Préstamo</TableCell>
                <TableCell align="right">Impuesto Vecinal</TableCell>
                <TableCell align="right">Otros</TableCell>
                <TableCell align="right">Total Deducciones</TableCell>
                <TableCell align="right">Total a Pagar</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nominas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={20} align="center">
                    No hay nóminas registradas
                  </TableCell>
                </TableRow>
              ) : (
                nominas.map((nomina) => (
                  <TableRow key={nomina.id} hover>
                    <TableCell sx={{ maxWidth: 260, whiteSpace: "nowrap" }}>
                      {nomina.nombrePeriodoNomina || "Sin nombre"}
                    </TableCell>
                    <TableCell>
                      {getEmpleadoNombre(nomina.empleadoId)}
                    </TableCell>
                    <TableCell>{formatDate(nomina.fechaInicio)}</TableCell>
                    <TableCell>{formatDate(nomina.fechaFin)}</TableCell>
                    <TableCell align="right">
                      {formatCurrency((nomina.sueldoMensual ?? 0) / 2)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.subtotalQuincena)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(calcularTotalHorasExtra(nomina))}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.ajuste)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.totalPercepciones)}
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
                      {formatCurrency(nomina.cobroPrestamo)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.impuestoVecinal)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.otros)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.totalDeducciones)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(nomina.totalNetoPagar)}
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
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDetailModal(nomina)}
                        color="info"
                        title="Ver detalles"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditModal(nomina)}
                        disabled={nomina.pagado === true}
                        color="primary"
                        title="Editar"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(nomina)}
                        disabled={nomina.pagado === true}
                        color="error"
                        title="Eliminar"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {nominas.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} sx={{ fontWeight: 600 }}>
                    Totales
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.sueldoQuincenal)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.subtotal)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.horasExtra)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.ajustes)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.totalDeducciones)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(aggregatedTotals.totalNeto)}
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
                type="number"
                value={editFormData.ajuste ?? ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    ajuste: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
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
                type="number"
                value={editFormData.deduccionIHSS ?? ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    deduccionIHSS: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Deducción ISR"
                type="number"
                value={editFormData.deduccionISR ?? ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    deduccionISR: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Deducción RAP"
                type="number"
                value={editFormData.deduccionRAP ?? ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    deduccionRAP: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Deducción Alimentación"
                type="number"
                value={editFormData.deduccionAlimentacion ?? ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    deduccionAlimentacion: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                fullWidth
                size="small"
                disabled={
                  (errorAlimentacion?.tieneError !== true) ||
                  loadingAlimentacion
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
                type="number"
                value={editFormData.cobroPrestamo ?? ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    cobroPrestamo: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Impuesto Vecinal"
                type="number"
                value={editFormData.impuestoVecinal ?? ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    impuestoVecinal: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Otros"
                type="number"
                value={editFormData.otros ?? ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    otros: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
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
                          Días Incapacidad
                        </Typography>
                        <Typography variant="body1">
                          {currentNomina.diasIncapacidad ?? "-"}
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
                          Total Percepciones
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color="primary"
                        >
                          {formatCurrency(currentNomina.totalPercepciones)}
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
                          {formatCurrency(currentNomina.totalDeducciones)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Total Neto */}
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
                      Total Neto a Pagar
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="inherit">
                      {formatCurrency(currentNomina.totalNetoPagar)}
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
          <Button onClick={handleCloseDetailModal}>Cerrar</Button>
        </DialogActions>
      </Dialog>

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
