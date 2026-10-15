// dd/mm/aaaa en UTC: el mismo texto en servidor y cliente (sin desajuste de hidratación).
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
