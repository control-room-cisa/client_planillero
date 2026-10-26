import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Snackbar, Tab, Tabs } from "@mui/material";
import {
  SolicitudPermisoService,
  solicitudErrorMessage,
  type SolicitudPermiso,
} from "../../services/solicitudPermisoService";
import SolicitudesTable from "../solicitudes/SolicitudesTable";
import SolicitudPermisoModal from "../solicitudes/SolicitudPermisoModal";
import CalendarioSolicitudes from "../solicitudes/CalendarioSolicitudes";
import ModuleTitle from "../common/ModuleTitle";

export default function SolicitudesSupervision() {
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [items, setItems] = useState<SolicitudPermiso[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [solicitudId, setSolicitudId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SolicitudPermisoService.listSupervision(page, limit);
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
      <ModuleTitle>Solicitudes del equipo</ModuleTitle>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label="Lista" />
        <Tab label="Calendario" />
      </Tabs>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {tab === 0 && (
        <SolicitudesTable
          items={items}
          total={total}
          page={page}
          limit={limit}
          loading={loading}
          showEmpleado
          onPageChange={setPage}
          onLimitChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
          onOpen={setSolicitudId}
        />
      )}
      {tab === 1 && <CalendarioSolicitudes />}
      {solicitudId != null && (
        <SolicitudPermisoModal
          open
          mode="supervisor"
          intent="view"
          solicitudId={solicitudId}
          onClose={() => setSolicitudId(null)}
          onSaved={(message) => {
            setNotice(message);
            void load();
          }}
        />
      )}
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </Box>
  );
}
