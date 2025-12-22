import * as React from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Drawer,
  TextField,
  FormControlLabel,
  Checkbox,
  Divider,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import type { Activity, ActivityData } from "../../types";
import type { JobConJerarquia } from "../hooks/useDailyTimesheet";

type ActivityDrawerProps = {
  drawerOpen: boolean;
  editingActivity: Activity | null;
  formData: ActivityData;
  formErrors: { [key: string]: string };
  jobs: JobConJerarquia[];
  loadingJobs: boolean;
  selectedJob: JobConJerarquia | null;
  readOnly: boolean;
  loading: boolean;
  horasDisponiblesValidacionForm: number;
  canAddExtraHours: boolean;
  forceExtra: boolean;
  shouldForceExtra: boolean;
  isProgressComplete: boolean;
  isProgressIncomplete: boolean;
  handleDrawerClose: () => void;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleTimeKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleJobChange: (
    _e: React.SyntheticEvent,
    value: JobConJerarquia | null
  ) => void;
  handleHorasBlur: () => void;
  handleSubmit: () => void;
};

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({
  drawerOpen,
  editingActivity,
  formData,
  formErrors,
  jobs,
  loadingJobs,
  selectedJob,
  readOnly,
  loading,
  horasDisponiblesValidacionForm,
  canAddExtraHours,
  forceExtra,
  shouldForceExtra,
  isProgressComplete,
  isProgressIncomplete,
  handleDrawerClose,
  handleInputChange,
  handleHorasBlur,
  handleTimeKeyDown,
  handleJobChange,
  handleSubmit,
}) => {
  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={handleDrawerClose}
      PaperProps={{
        sx: { width: { xs: "100%", sm: 400 }, maxWidth: "100vw" },
      }}
    >
      <Box
        sx={{
          p: 3,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Typography variant="h6" component="h2" fontWeight="bold">
            {editingActivity ? "Editar Actividad" : "Nueva Actividad"} - Hoy
          </Typography>
          <IconButton onClick={handleDrawerClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* Formulario */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Descripción de la Actividad */}
          <TextField
            disabled={readOnly}
            fullWidth
            required
            multiline
            rows={4}
            name="descripcion"
            label="Descripción de la Actividad"
            placeholder="Describe la actividad realizada..."
            value={formData.descripcion}
            onChange={handleInputChange}
            error={!!formErrors.descripcion}
            helperText={
              formErrors.descripcion ||
              `${formData.descripcion.length}/200 caracteres`
            }
            inputProps={{ maxLength: 200 }}
            sx={{ mb: 3 }}
          />

          {/* Inputs de hora solo se muestran si se marca Hora Extra */}
          {formData.horaExtra && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
                mb: 3,
              }}
            >
              <TextField
                disabled={readOnly}
                fullWidth
                required
                type="time"
                name="horaInicio"
                label="Hora inicio actividad"
                value={formData.horaInicio}
                onChange={handleInputChange}
                onKeyDown={handleTimeKeyDown}
                error={!!formErrors.horaInicio}
                helperText={formErrors.horaInicio}
                InputLabelProps={{ shrink: true }}
                size="small"
                inputProps={{
                  step: 900, // 15 minutos en segundos
                }}
              />
              <TextField
                disabled={readOnly}
                fullWidth
                required
                type="time"
                name="horaFin"
                label="Hora fin actividad (00:00 = fin del día)"
                value={
                  formData.horaFin === "24:00" ? "00:00" : formData.horaFin
                }
                onChange={handleInputChange}
                onKeyDown={handleTimeKeyDown}
                error={!!formErrors.horaFin}
                helperText={
                  formErrors.horaFin ||
                  "00:00 representa el final del día (24:00)"
                }
                InputLabelProps={{ shrink: true }}
                size="small"
                inputProps={{
                  step: 900, // 15 minutos en segundos
                }}
              />
            </Box>
          )}

          {/* Input de horas invertidas */}
          {/* Horas Normales: editable manualmente (solo múltiplos positivos de 0.25h = 15 min). Hora Extra: calculado automáticamente (readonly) */}
          <TextField
            disabled={
              readOnly ||
              formData.horaExtra ||
              horasDisponiblesValidacionForm <= 0
            }
            fullWidth
            required={formData.horaExtra}
            name="horasInvertidas"
            label="Horas Invertidas"
            placeholder={
              formData.horaExtra
                ? "Calculado automáticamente"
                : "Ej: 2.5 (múltiplos de 0.25h)"
            }
            type="text"
            error={!!formErrors.horasInvertidas}
            helperText={
              formErrors.horasInvertidas ||
              (formData.horaExtra
                ? "Calculado automáticamente desde las horas de inicio y fin"
                : `Horas restantes: ${Math.max(
                    0,
                    horasDisponiblesValidacionForm
                  ).toFixed(2)}h. Solo múltiplos positivos de 0.25h (15 min)`)
            }
            InputProps={{
              readOnly: formData.horaExtra,
              endAdornment: formData.horaExtra && (
                <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Auto
                  </Typography>
                </Box>
              ),
            }}
            value={formData.horasInvertidas}
            onChange={handleInputChange}
            onBlur={handleHorasBlur}
            onKeyDown={(e) => {
              if (formData.horaExtra) return;
              // Bloquear teclas no numéricas directamente para mejorar UX
              const allowedKeys = [
                "Backspace",
                "Delete",
                "Tab",
                "Escape",
                "Enter",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
                ".",
                ",",
              ];
              const isNumber = /^\d$/.test(e.key);
              const isAllowed = allowedKeys.includes(e.key);
              const isModifier = e.ctrlKey || e.metaKey || e.altKey;

              if (!isNumber && !isAllowed && !isModifier) {
                e.preventDefault();
              }
            }}
            sx={{ mb: 3 }}
          />

          {/* Job */}
          {/* Excepción: deshabilitar job cuando es compensatorio en hora normal (Tomar hora libre compensatoria) */}
          {(() => {
            const esCompensatorioHoraNormal =
              formData.esCompensatorio && !formData.horaExtra;
            return (
              <Box sx={{ mb: 3 }}>
                <Autocomplete
                  options={jobs}
                  getOptionLabel={(o) => (o ? `${o.codigo} - ${o.nombre}` : "")}
                  value={selectedJob}
                  onChange={handleJobChange}
                  loading={loadingJobs}
                  disabled={
                    loadingJobs || readOnly || esCompensatorioHoraNormal
                  }
                  isOptionEqualToValue={(o, v) =>
                    !!o && !!v ? o.id === v.id : false
                  }
                  groupBy={(option) =>
                    option?.mostrarEmpresaId && option?.empresa?.nombre
                      ? option.empresa.nombre
                      : "— Especiales —"
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Job"
                      required={!esCompensatorioHoraNormal}
                      error={!!formErrors.job}
                      helperText={
                        formErrors.job ||
                        (esCompensatorioHoraNormal
                          ? "No requerido para hora libre compensatoria"
                          : undefined)
                      }
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingJobs ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box sx={{ pl: (option?.indentLevel ?? 0) * 4 }}>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={
                            option?.mostrarEmpresaId && option?.empresa?.nombre
                              ? "text.primary"
                              : "error.main"
                          }
                        >
                          {option?.codigo} - {option?.nombre}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option?.descripcion || "Sin descripción"}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderGroup={(params) => (
                    <Box key={params.key}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          color:
                            params.group === "— Especiales —"
                              ? "error.main"
                              : "primary.main",
                          backgroundColor: "background.paper",
                          px: 2,
                          py: 1,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {params.group}
                      </Typography>
                      <Box component="li" sx={{ p: 0 }}>
                        <ul style={{ padding: 0, margin: 0 }}>
                          {params.children}
                        </ul>
                      </Box>
                    </Box>
                  )}
                  noOptionsText={
                    loadingJobs
                      ? "Cargando jobs..."
                      : "No hay jobs activos disponibles"
                  }
                />
              </Box>
            );
          })()}

          {/* Class (opcional) */}
          <TextField
            disabled={readOnly}
            fullWidth
            name="class"
            label="Class"
            placeholder="Clasificación (opcional)"
            value={formData.class}
            onChange={handleInputChange}
            sx={{ mb: 3 }}
          />

          {/* Hora Extra */}
          <FormControlLabel
            control={
              <Checkbox
                disabled={true}
                name="horaExtra"
                checked={
                  forceExtra
                    ? true
                    : shouldForceExtra
                    ? isProgressComplete
                      ? true
                      : false
                    : formData.horaExtra
                }
                onChange={undefined}
                color="primary"
              />
            }
            label={`Hora Extra (fuera del horario)${
              !canAddExtraHours && !forceExtra
                ? " - Completa primero las horas normales"
                : shouldForceExtra && isProgressIncomplete
                ? " - Completa primero las horas normales del día"
                : shouldForceExtra && isProgressComplete
                ? " - Día laboral completo, solo horas extra"
                : ""
            }`}
            sx={{ mb: 0.5 }}
          />

          {/* Es Compensatorio */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  disabled={readOnly}
                  name="esCompensatorio"
                  checked={formData.esCompensatorio}
                  onChange={handleInputChange}
                  color="primary"
                />
              }
              label={
                formData.horaExtra
                  ? "Devolver hora compensatoria"
                  : "Tomar hora libre compensatoria"
              }
            />
            {formData.esCompensatorio && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5, ml: 4 }}
              >
                {formData.horaExtra
                  ? "Se suma al saldo de horas compensatorias (No se paga como extra)"
                  : "Se resta del saldo de horas compensatorias."}
              </Typography>
            )}
          </Box>

          {/* Botones */}
          <Box sx={{ mt: "auto", pt: 3, pb: 3 }}>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleDrawerClose}
                sx={{ py: 1.5 }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={handleSubmit}
                sx={{ py: 1.5 }}
                disabled={loading}
              >
                {loading
                  ? "Guardando..."
                  : editingActivity
                  ? "Actualizar"
                  : "Guardar"}
              </Button>
            </Box>

            {/* Mensaje informativo sobre horas extra */}
            {!canAddExtraHours && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 2, textAlign: "center", fontSize: "0.875rem" }}
              >
                Completa las horas normales al 100% para poder ingresar horas
                extra
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};
