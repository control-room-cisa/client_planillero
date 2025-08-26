const TZ = "America/Tegucigalpa";
const ymdInTZ = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d) // "YYYY-MM-DD"
    : undefined;

export default ymdInTZ;
