import * as React from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
} from "@mui/material";
import { GlobalConfigService } from "../../services/globalConfigService";

const ParametrosNominaManagement: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadedKeys, setLoadedKeys] = React.useState<{
    pisoIhss: boolean;
    deduccionIhssFija: boolean;
  }>({ pisoIhss: false, deduccionIhssFija: false });

  const [pisoIhss, setPisoIhss] = React.useState<string>("");
  const [deduccionIhssFija, setDeduccionIhssFija] = React.useState<string>("");

  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [piso, ded] = await Promise.all([
        GlobalConfigService.get("PISO_IHSS"),
        GlobalConfigService.get("DEDUCCION_IHSS_FIJA"),
      ]);
      setLoadedKeys({
        pisoIhss: Boolean(piso),
        deduccionIhssFija: Boolean(ded),
      });
      setPisoIhss(piso?.value ?? "11903.13");
      setDeduccionIhssFija(ded?.value ?? "595.16");
    } catch (e: any) {
      setSnackbar({
        open: true,
        message: e?.message || "Error cargando parámetros",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const parseNum = (s: string) => {
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const handleSave = async () => {
    const piso = parseNum(pisoIhss);
    const ded = parseNum(deduccionIhssFija);
    if (!Number.isFinite(piso) || piso <= 0) {
      setSnackbar({
        open: true,
        message: "PISO_IHSS inválido",
        severity: "error",
      });
      return;
    }
    if (!Number.isFinite(ded) || ded < 0) {
      setSnackbar({
        open: true,
        message: "DEDUCCION_IHSS_FIJA inválida",
        severity: "error",
      });
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        GlobalConfigService.upsert({
          key: "PISO_IHSS",
          value: String(piso),
          description: "Piso IHSS (base para RAP/cálculos relacionados)",
        }),
        GlobalConfigService.upsert({
          key: "DEDUCCION_IHSS_FIJA",
          value: String(ded),
          description: "Deducción fija IHSS",
        }),
      ]);
      setLoadedKeys({ pisoIhss: true, deduccionIhssFija: true });
      setSnackbar({
        open: true,
        message: "Parámetros guardados",
        severity: "success",
      });
    } catch (e: any) {
      setSnackbar({
        open: true,
        message: e?.message || "Error guardando parámetros",
        severity: "error",
      });
    } finally {
      setSaving(false);
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
        Parámetros de Nómina
      </Typography>

      <Paper sx={{ p: 2, flexShrink: 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2} sx={{ maxWidth: 900 }}>
            <Typography variant="body2" color="text.secondary">
              Estos valores afectan cálculos en el módulo de nómina.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Se guardan en <strong>`global_config`</strong> con keys{" "}
              <strong>PISO_IHSS</strong> y <strong>DEDUCCION_IHSS_FIJA</strong>.
              {!loadedKeys.pisoIhss || !loadedKeys.deduccionIhssFija
                ? " (aún no existen, se crearán al guardar)"
                : ""}
            </Typography>

            <Divider />

            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <TextField
                label="PISO_IHSS"
                value={pisoIhss}
                onChange={(e) => setPisoIhss(e.target.value.trim())}
                helperText="Ej: 11903.13"
                sx={{ minWidth: 280, flex: "1 1 360px" }}
              />

              <TextField
                label="DEDUCCION_IHSS_FIJA"
                value={deduccionIhssFija}
                onChange={(e) => setDeduccionIhssFija(e.target.value.trim())}
                helperText="Ej: 595.16"
                sx={{ minWidth: 280, flex: "1 1 360px" }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="outlined" onClick={load} disabled={saving}>
                Recargar
              </Button>
            </Box>
          </Stack>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ParametrosNominaManagement;

