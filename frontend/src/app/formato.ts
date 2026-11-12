// Funciones para mostrar montos y fechas igual en todas las pantallas.

const lempiras = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
});

// RN-06: montos en lempiras con dos decimales. Ej: 1234.5 -> "L 1,234.50"
export function formatearLempiras(monto: number): string {
  return lempiras.format(monto);
}

const hora = new Intl.DateTimeFormat("es-HN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Tegucigalpa",
});

// Ej: "7:15 a. m."
export function formatearHora(fecha: Date): string {
  return hora.format(fecha);
}