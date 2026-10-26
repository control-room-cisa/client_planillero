import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Snackbar, Tab, Tabs, Typography } from "@mui/material";
import { empresaService } from "../../services/empresaService";
import type { Empresa } from "../../types/auth";
import {
  SolicitudPermisoService,
  solicitudErrorMessage,
  type SolicitudPermiso,
} from "../../services/solicitudPermisoService";
import SolicitudesTable from "../solicitudes/SolicitudesTable";
import SolicitudPermisoModal from "../solicitudes/SolicitudPermisoModal";
import ModuleTitle from "../common/ModuleTitle";

export default function SolicitudesRrhh() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [items, setItems] = useState<SolicitudPermiso[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [solicitudId, setSolicitudId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    empresaService
      .getEmpresas()
      .then((response) => {
        if (cancelled) return;
        const rows = (response.data ?? []).filter(
          (empresa) => empresa.esConsorcio === true
        );
        setEmpresas(rows);
        setEmpresaId(rows[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(solicitudErrorMessage(err, "No se pudieron cargar las empresas"));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!empresaId) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await SolicitudPermisoService.listRrhh(empresaId, page, limit);
      setItems(data.items);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(solicitudErrorMessage(err, "No se pudieron cargar las solicitudes"));
    } finally {
      setLoading(false);
    }
  }, [empresaId, page, limit]);

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
      <ModuleTitle>Solicitudes de permisos</ModuleTitle>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Solo aparecen las solicitudes que el supervisor ya aprobó.
      </Typography>
      {empresas.length > 0 && empresaId != null && (
        <Tabs
          value={empresaId}
          onChange={(_, value: number) => {
            setEmpresaId(value);
            setPage(1);
          }}
          variant="scrollable"
          sx={{ mb: 2 }}
        >
          {empresas.map((empresa) => (
            <Tab key={empresa.id} value={empresa.id} label={empresa.nombre} />
          ))}
        </Tabs>
      )}
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
        showEmpleado
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
        onOpen={setSolicitudId}
      />
      {solicitudId != null && (
        <SolicitudPermisoModal
          open
          mode="rrhh"
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
