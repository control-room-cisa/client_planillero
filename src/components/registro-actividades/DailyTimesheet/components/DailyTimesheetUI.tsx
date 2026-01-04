import * as React from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Fab,
  TextField,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Stack,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  Add,
  Settings,
  AccessTime,
} from "@mui/icons-material";
import { useDailyTimesheet } from "../hooks/useDailyTimesheet";
import { ActivityList } from "./ActivityList";
import { ActivityDrawer } from "./ActivityDrawer";

// Tipo para las props del componente UI
type DailyTimesheetUIProps = ReturnType<typeof useDailyTimesheet>;

export const DailyTimesheetUI: React.FC<DailyTimesheetUIProps> = (props) => {
  const {
    // Estados
    currentDate,
    drawerOpen,
    editingActivity,
    formData,
    formErrors,
    jobs,
    loadingJobs,
    selectedJob,
    registroDiario,
    dayConfigData,
    dayConfigErrors,
    loading,
    initialLoading,
    snackbar,
    horarioValidado,
    horarioData,
    readOnly,
    user,

    // Flags y valores calculados
    isH2,
    showDiaNoLaborable,
    workedHoursNormales,
    horasNormales,
    progressPercentage,
    horasFaltantesMessage,
    horasDisponiblesValidacionForm,
    canAddExtraHours,
    disableHoraCorrida,
    disableTimeFields,
    exceededNormalHours,
    hasExceededNormalHours,
    hasDayRecord,
    isIncapacidad,
    disableCreateEditActivities,
    dayConfigHasChanges,
    forceExtra,
    horasCero,
    shouldForceExtra,
    isProgressComplete,
    isProgressIncomplete,

    // Handlers
    handleDrawerOpen,
    handleDrawerClose,
    handleEditActivity,
    handleDeleteActivity,
    handleDayConfigTimeKeyDown,
    handleDayConfigInputChange,
    handleDayConfigSubmit,
    handleTimeKeyDown,
    handleInputChange,
    handleHorasBlur,
    handleJobChange,
    handleSubmit,
    navigateDate,
    goToToday,
    isToday,

    // Funciones de utilidad
    computeHorasActividadForDisplayWrapper,
    formatTimeLocal,
    formatDate,
    timeToMinutes,
    horarioRules,
    isMobile,
    setSnackbar,
  } = props;

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        maxWidth: "100%",
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography
          variant={isMobile ? "h5" : "h5"}
          component="h1"
          sx={{ fontWeight: "bold", minWidth: 0 }}
        >
          Registro de Actividades
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <IconButton onClick={() => navigateDate("prev")} size="small">
            <ChevronLeft />
          </IconButton>
          <Button
            variant={isToday() ? "contained" : "outlined"}
            startIcon={<CalendarToday />}
            onClick={goToToday}
            size="small"
            sx={{ minWidth: "auto" }}
          >
            {isToday() ? "Hoy" : "Hoy"}
          </Button>
          <IconButton onClick={() => navigateDate("next")} size="small">
            <ChevronRight />
          </IconButton>
          <Button
            variant={hasDayRecord ? "outlined" : "contained"}
            startIcon={
              initialLoading ? <CircularProgress size={16} /> : <Settings />
            }
            onClick={handleDayConfigSubmit}
            size="small"
            color={hasDayRecord ? "success" : "primary"}
            sx={{
              ml: 1,
              minWidth: "140px",
              whiteSpace: "nowrap",
            }}
            disabled={
              initialLoading ||
              loading ||
              (hasDayRecord && !dayConfigHasChanges)
            }
          >
            {initialLoading
              ? "Cargando..."
              : loading
              ? "Guardando..."
              : hasDayRecord
              ? "Actualizar Día"
              : "Guardar Día"}
          </Button>
        </Box>
      </Box>

      {/* Fecha actual */}
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 1, textAlign: "center" }}
      >
        {formatDate(currentDate)}
      </Typography>

      {/* Info del día */}
      {registroDiario && (
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          sx={{ mb: 2 }}
        >
          {horarioValidado?.mostrarJornada && (
            <Chip
              label={`Jornada: ${
                registroDiario.jornada === "D"
                  ? "Dia"
                  : registroDiario.jornada === "N"
                  ? "Noche"
                  : ""
              }`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          <Chip
            label={`${formatTimeLocal(
              registroDiario.horaEntrada
            )} - ${formatTimeLocal(registroDiario.horaSalida)}`}
            size="small"
            color="secondary"
            variant="outlined"
          />
          {registroDiario.esDiaLibre && (
            <Chip
              label="Día Libre"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {registroDiario.esIncapacidad && (
            <Chip
              label="Incapacidad"
              size="small"
              color="error"
              variant="outlined"
            />
          )}
          {/* Mostrar Hora Corrida solo si NO es H2 (para H2 ocultar) */}
          {!isH2 && registroDiario.esHoraCorrida && (
            <Chip
              label="Hora Corrida"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Stack>
      )}

      {/* Mostrar nombre del día festivo si es festivo */}
      {horarioValidado?.mostrarNombreFestivo &&
        horarioValidado.nombreDiaFestivo && (
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Chip
              label={`🎉 ${horarioValidado.nombreDiaFestivo}`}
              size="medium"
              color="success"
              variant="filled"
            />
            {/* Mostrar horas feriado: usar las horas normales que se habrían trabajado si no fuera feriado */}
            {horarioData?.esFestivo &&
              horarioData.cantidadHorasLaborablesNormales !== undefined &&
              horarioData.cantidadHorasLaborablesNormales > 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Horas laborables asignadas a feriado:{" "}
                  <strong>
                    {horarioData.cantidadHorasLaborablesNormales.toFixed(2)}h
                  </strong>
                </Typography>
              )}
          </Box>
        )}

      {/* Saludo */}
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ mb: 3, textAlign: "center", fontWeight: "medium" }}
      >
        ¡Buen día, {user?.nombre}! 👋
      </Typography>

      {/* Configuración del día */}
      <Card sx={{ mb: 3, bgcolor: "background.paper" }}>
        <CardContent>
          <Typography
            variant="h6"
            component="h2"
            sx={{ mb: 3, fontWeight: "bold" }}
          >
            Configuración del Día Laboral
          </Typography>
          {/* Los valores se configuran automáticamente desde la API cuando no hay datos existentes */}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            <TextField
              disabled={
                readOnly ||
                initialLoading ||
                disableTimeFields ||
                !horarioRules.utils.isFieldEnabled("horaEntrada")
              }
              fullWidth
              required
              type="time"
              name="horaEntrada"
              label="Hora de Entrada"
              value={initialLoading ? "" : dayConfigData.horaEntrada}
              onChange={handleDayConfigInputChange}
              onKeyDown={handleDayConfigTimeKeyDown}
              error={!!dayConfigErrors.horaEntrada}
              helperText={dayConfigErrors.horaEntrada}
              InputLabelProps={{ shrink: true }}
              size="small"
              inputProps={{
                step: 900, // 15 minutos en segundos
              }}
              placeholder={initialLoading ? "Cargando..." : ""}
            />

            {/* Hora de Salida */}
            <TextField
              disabled={
                readOnly ||
                initialLoading ||
                disableTimeFields ||
                !horarioRules.utils.isFieldEnabled("horaSalida")
              }
              fullWidth
              required
              type="time"
              name="horaSalida"
              label="Hora de Salida"
              value={initialLoading ? "" : dayConfigData.horaSalida}
              onChange={handleDayConfigInputChange}
              onKeyDown={handleDayConfigTimeKeyDown}
              error={!!dayConfigErrors.horaSalida}
              helperText={dayConfigErrors.horaSalida}
              InputLabelProps={{ shrink: true }}
              size="small"
              inputProps={{
                step: 900, // 15 minutos en segundos
              }}
              placeholder={initialLoading ? "Cargando..." : ""}
            />

            {/* Jornada según reglas */}
            {horarioRules.utils.isFieldVisible("jornada") && (
              <FormControl fullWidth size="small">
                <InputLabel>Jornada</InputLabel>
                <Select
                  disabled={
                    readOnly ||
                    initialLoading ||
                    dayConfigData.esDiaLibre ||
                    !horarioRules.utils.isFieldEnabled("jornada")
                  }
                  name="jornada"
                  value={initialLoading ? "" : dayConfigData.jornada}
                  onChange={(e) =>
                    handleDayConfigInputChange(
                      e as React.ChangeEvent<HTMLInputElement>
                    )
                  }
                  label="Jornada"
                >
                  <MenuItem value="D">Día</MenuItem>
                  <MenuItem value="N">Noche</MenuItem>
                </Select>
              </FormControl>
            )}
            {/* Es Día Libre */}
            {horarioRules.utils.isFieldVisible("esDiaLibre") && (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "40px" }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      disabled={
                        readOnly ||
                        initialLoading ||
                        !horarioRules.utils.isFieldEnabled("esDiaLibre") ||
                        (isH2 && isIncapacidad) // En H2, deshabilitar Día Libre cuando hay incapacidad
                      }
                      name="esDiaLibre"
                      checked={dayConfigData.esDiaLibre}
                      onChange={handleDayConfigInputChange}
                      color="primary"
                    />
                  }
                  label="Día Libre"
                />
              </Box>
            )}

            {/* Día no laborable (client-only): solo para tipos que NO usan Día Libre pero sí editan horas */}
            {showDiaNoLaborable && (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "40px" }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      disabled={
                        readOnly ||
                        initialLoading ||
                        Boolean(
                          horarioData?.esFestivo || horarioValidado?.esFestivo
                        )
                      }
                      name="esDiaNoLaborable"
                      checked={dayConfigData.esDiaNoLaborable || false}
                      onChange={handleDayConfigInputChange}
                      color="primary"
                    />
                  }
                  label="Día no laborable"
                />
              </Box>
            )}
            {/* Es Incapacidad */}
            <Box sx={{ display: "flex", alignItems: "center", height: "40px" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    disabled={readOnly || initialLoading}
                    name="esIncapacidad"
                    checked={dayConfigData.esIncapacidad || false}
                    onChange={handleDayConfigInputChange}
                    color="primary"
                  />
                }
                label="Incapacidad"
              />
            </Box>
            {/* Es Hora Corrida */}
            {horarioRules.utils.isFieldVisible("esHoraCorrida") && (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "40px" }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      disabled={
                        readOnly ||
                        initialLoading ||
                        horasCero ||
                        disableHoraCorrida ||
                        !horarioRules.utils.isFieldEnabled("esHoraCorrida")
                      }
                      name="esHoraCorrida"
                      checked={
                        initialLoading ? false : dayConfigData.esHoraCorrida
                      }
                      onChange={handleDayConfigInputChange}
                      color="primary"
                    />
                  }
                  label="Hora Corrida"
                />
              </Box>
            )}
          </Box>

          {/* Comentario del Colaborador */}
          <TextField
            disabled={readOnly || initialLoading}
            fullWidth
            multiline
            rows={2}
            name="comentarioEmpleado"
            label="Comentario (opcional)"
            placeholder={
              initialLoading
                ? "Cargando..."
                : "Agregar comentarios adicionales..."
            }
            value={initialLoading ? "" : dayConfigData.comentarioEmpleado}
            onChange={handleDayConfigInputChange}
            size="small"
            inputProps={{ maxLength: 500 }}
            helperText={`${
              (dayConfigData.comentarioEmpleado || "").length
            }/500 caracteres`}
          />
        </CardContent>
      </Card>

      {/* Comentarios de Supervisor y RRHH (solo si fueron rechazados) */}
      {(registroDiario?.aprobacionSupervisor === false ||
        registroDiario?.aprobacionRrhh === false) && (
        <Box sx={{ mb: 3 }}>
          {registroDiario.aprobacionSupervisor === false && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                "& .MuiAlert-message": {
                  width: "100%",
                },
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 1, color: "error.main" }}
              >
                Rechazado por Supervisor
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "error.dark",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {registroDiario.comentarioSupervisor || "Sin comentario"}
              </Typography>
            </Alert>
          )}

          {registroDiario.aprobacionRrhh === false && (
            <Alert
              severity="error"
              sx={{
                "& .MuiAlert-message": {
                  width: "100%",
                },
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 1, color: "error.main" }}
              >
                Rechazado por RRHH
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "error.dark",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {registroDiario.comentarioRrhh || "Sin comentario"}
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* Progreso */}
      <Card sx={{ mb: 3, bgcolor: "background.paper" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <AccessTime sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6" component="h2">
              Progreso del Día Laboral
            </Typography>
            <Box sx={{ ml: "auto" }}>
              {initialLoading ? (
                <CircularProgress size={20} />
              ) : (
                <Typography
                  variant="body2"
                  color={hasExceededNormalHours ? "error.main" : "primary.main"}
                  fontWeight="bold"
                >
                  {workedHoursNormales.toFixed(2)} / {horasNormales.toFixed(2)}{" "}
                  horas
                </Typography>
              )}
              {/* Las horas normales se obtienen desde la API usando cantidadHorasLaborables */}
            </Box>
          </Box>

          {initialLoading ? (
            <LinearProgress sx={{ height: 8, borderRadius: 4, mb: 2 }} />
          ) : (
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              color={hasExceededNormalHours ? "error" : "primary"}
              sx={{
                height: 8,
                borderRadius: 4,
                mb: 2,
                bgcolor: "grey.200",
                "& .MuiLinearProgress-bar": { borderRadius: 4 },
              }}
            />
          )}

          {initialLoading ? (
            <Typography variant="body2" color="warning.main">
              Calculando progreso...
            </Typography>
          ) : hasExceededNormalHours ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                {horasNormales === 0
                  ? `Se superan las horas normales requeridas. Hay ${workedHoursNormales.toFixed(
                      2
                    )} horas trabajadas pero no hay horas normales disponibles para este día.`
                  : `Se superan las horas normales requeridas. Se exceden ${exceededNormalHours.toFixed(
                      2
                    )} horas normales.`}
              </Typography>
            </Alert>
          ) : (
            <Typography variant="body2" color="warning.main">
              {horasFaltantesMessage}
            </Typography>
          )}
          {/* El mensaje se calcula usando las horas normales obtenidas desde la API */}
        </CardContent>
      </Card>

      {/* Lista de actividades */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" component="h2">
          Actividades de Hoy
        </Typography>
        {!isMobile && (
          <Button
            disabled={disableCreateEditActivities || initialLoading}
            variant="contained"
            startIcon={
              initialLoading ? <CircularProgress size={16} /> : <Add />
            }
            sx={{ borderRadius: 2 }}
            onClick={handleDrawerOpen}
            title={
              isIncapacidad
                ? "No se pueden crear nuevas actividades cuando hay incapacidad"
                : undefined
            }
          >
            {initialLoading ? "Cargando..." : "Nueva Actividad"}
          </Button>
        )}
      </Box>

      {/* Activities list or empty state */}
      <ActivityList
        initialLoading={initialLoading}
        registroDiario={registroDiario}
        readOnly={readOnly}
        disableCreateEditActivities={disableCreateEditActivities}
        isIncapacidad={isIncapacidad}
        handleDrawerOpen={handleDrawerOpen}
        handleEditActivity={handleEditActivity}
        handleDeleteActivity={handleDeleteActivity}
        formatTimeLocal={formatTimeLocal}
        timeToMinutes={timeToMinutes}
        computeHorasActividadForDisplayWrapper={
          computeHorasActividadForDisplayWrapper
        }
      />

      {/* FAB */}
      {isMobile && !initialLoading && (
        <Fab
          variant="extended"
          color="primary"
          aria-label="add"
          onClick={handleDrawerOpen}
          disabled={disableCreateEditActivities}
          title={
            isIncapacidad
              ? "No se pueden crear nuevas actividades cuando hay incapacidad"
              : undefined
          }
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            textTransform: "none",
          }}
        >
          <Add sx={{ mr: 1 }} />
          Agregar Actividad
        </Fab>
      )}

      {/* Drawer actividad */}
      <ActivityDrawer
        drawerOpen={drawerOpen}
        editingActivity={editingActivity}
        formData={formData}
        formErrors={formErrors}
        jobs={jobs}
        loadingJobs={loadingJobs}
        selectedJob={selectedJob}
        readOnly={readOnly}
        loading={loading}
        horasDisponiblesValidacionForm={horasDisponiblesValidacionForm}
        canAddExtraHours={canAddExtraHours}
        forceExtra={forceExtra}
        shouldForceExtra={shouldForceExtra}
        isProgressComplete={isProgressComplete}
        isProgressIncomplete={isProgressIncomplete}
        handleDrawerClose={handleDrawerClose}
        handleInputChange={handleInputChange}
        handleHorasBlur={handleHorasBlur}
        handleTimeKeyDown={handleTimeKeyDown}
        handleJobChange={handleJobChange}
        handleSubmit={handleSubmit}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
