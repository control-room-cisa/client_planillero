import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Snackbar, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  SolicitudPermisoService,
  solicitudErrorMessage,
  type SolicitudPermiso,
} from "../../services/solicitudPermisoService";
import EmpleadoService from "../../services/empleadoService";
import { useAuth } from "../../hooks/useAuth";
import SolicitudesTable from "../solicitudes/SolicitudesTable";
import SolicitudPermisoModal, {
  type SolicitudModalIntent,
} from "../solicitudes/SolicitudPermisoModal";
import ConfirmDialog from "../common/ConfirmDialog";
import ModuleTitle from "../common/ModuleTitle";

function diasVacaciones(horas: number | null): string {
  if (horas == null || Number.isNaN(Number(horas))) return "—";
  return (Number(horas) / 8).toFixed(2);
}

function horasTexto(horas: number | null): string {
  if (horas == null || Number.isNaN(Number(horas))) return "—";
  return Number(horas).toFixed(2);
}

export default function MisSolicitudes() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [items, setItems] = useState<SolicitudPermiso[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [vacacionesHoras, setVacacionesHoras] = useState<number | null>(null);
  const [compensatorioHoras, setCompensatorioHoras] = useState<number | null>(null);
  const [modal, setModal] = useState<{
    intent: SolicitudModalIntent;
    id: number | null;
  } | null>(null);
  const [eliminar, setEliminar] = useState<SolicitudPermiso | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SolicitudPermisoService.listMias(page, limit);
      setItems(data.items);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(solicitudErrorMessage(err, "No se pudieron cargar las solicitudes"));
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    EmpleadoService.getById(user.id)
      .then((empleado) => {
        if (cancelled) return;
        setVacacionesHoras(empleado.tiempoVacacionesHoras ?? null);
        setCompensatorioHoras(empleado.tiempoCompensatorioHoras ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setVacacionesHoras(null);
          setCompensatorioHoras(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const confirmarEliminar = async () => {
    if (!eliminar) return;
    try {
      await SolicitudPermisoService.remove(eliminar.id);
      setNotice("Solicitud eliminada");
      setEliminar(null);
      await load();
    } catch (err) {
      setError(solicitudErrorMessage(err, "No se pudo eliminar la solicitud"));
      setEliminar(null);
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
      <ModuleTitle gutter={false}>Mis solicitudes</ModuleTitle>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, minWidth: 0 }}>
          <Card variant="outlined" sx={{ width: "fit-content" }}>
            <CardContent sx={{ py: 0.5, px: 1.25, "&:last-child": { pb: 0.5 } }}>
              <Typography variant="caption" color="text.secondary" lineHeight={1.1}>
                Vacaciones
              </Typography>
              <Typography variant="body2" fontWeight={700} lineHeight={1.2}>
                {diasVacaciones(vacacionesHoras)} días
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ width: "fit-content" }}>
            <CardContent sx={{ py: 0.5, px: 1.25, "&:last-child": { pb: 0.5 } }}>
              <Typography variant="caption" color="text.secondary" lineHeight={1.1}>
                Compensatorias
              </Typography>
              <Typography variant="body2" fontWeight={700} lineHeight={1.2}>
                {horasTexto(compensatorioHoras)} h
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setModal({ intent: "create", id: null })}
          sx={{ flexShrink: 0 }}
        >
          Nueva solicitud
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <SolicitudesTable
        items={items}
        total={total}
        page={page}
        limit={limit}
        loading={loading}
        showEmpleado={false}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
        onOpen={(id) => setModal({ intent: "view", id })}
        onEdit={(row) => setModal({ intent: "edit", id: row.id })}
        onDelete={setEliminar}
      />
      {modal && (
        <SolicitudPermisoModal
          open
          mode="empleado"
          intent={modal.intent}
          solicitudId={modal.id}
          onClose={() => setModal(null)}
          onSaved={(message) => {
            setNotice(message);
            void load();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(eliminar)}
        title="Eliminar solicitud"
        message="La solicitud se eliminará. Esta acción solo está disponible mientras no haya una decisión."
        confirmText="Eliminar"
        onCancel={() => setEliminar(null)}
        onConfirm={() => void confirmarEliminar()}
      />
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </Box>
  );
}
