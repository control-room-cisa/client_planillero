import type { ReactNode } from "react";
import { Typography } from "@mui/material";

type ModuleTitleProps = {
  children: ReactNode;
  /** En una fila con botones, el margen inferior lo pone el contenedor. */
  gutter?: boolean;
};

/** Encabezado de un módulo: mismo tamaño, color y margen en todas las secciones. */
export default function ModuleTitle({
  children,
  gutter = true,
}: ModuleTitleProps) {
  return (
    <Typography
      variant="h5"
      component="h1"
      gutterBottom={gutter}
      sx={{ fontWeight: "bold", minWidth: 0, flexShrink: 0 }}
    >
      {children}
    </Typography>
  );
}
