// Reglas del pago (RN-27 a RN-29). Lo usan la ventana de pago (para mostrar
// el cambio mientras se escribe) y el servidor (para validar antes de guardar).
// Se calcula en centavos para que no haya errores de redondeo con decimales.

export type DatosPago = {
  tarjeta: number;
  fiado: number;
  efectivoRecibido: number;
};

export type ResultadoPago =
  | { ok: true; efectivoAplicado: number; cambio: number }
  | { ok: false; error: string };

const aCentavos = (monto: number) => Math.round(monto * 100);
const aLempiras = (centavos: number) => centavos / 100;

export function calcularPago(total: number, datos: DatosPago): ResultadoPago {
  const t = aCentavos(total);
  const tarjeta = aCentavos(datos.tarjeta);
  const fiado = aCentavos(datos.fiado);
  const recibido = aCentavos(datos.efectivoRecibido);

  if (tarjeta < 0 || fiado < 0 || recibido < 0) {
    return { ok: false, error: "Los montos no pueden ser negativos." };
  }

  // RN-28: tarjeta y fiado no pueden pasarse del total.
  if (tarjeta + fiado > t) {
    return { ok: false, error: "Tarjeta y fiado suman más que el total." };
  }

  // Lo que falta después de tarjeta y fiado se paga en efectivo (RN-29).
  const efectivoAplicado = t - tarjeta - fiado;

  if (efectivoAplicado > 0 && recibido < efectivoAplicado) {
    return {
      ok: false,
      error: `Falta efectivo: el cliente debe entregar al menos L ${aLempiras(efectivoAplicado).toFixed(2)}.`,
    };
  }

  // Solo el efectivo puede pasarse del total; de ahí sale el cambio.
  const cambio = efectivoAplicado > 0 ? recibido - efectivoAplicado : 0;

  return {
    ok: true,
    efectivoAplicado: aLempiras(efectivoAplicado),
    cambio: aLempiras(cambio),
  };
}

// Convierte lo que escribe el cajero en un número. "" cuenta como 0.
// Devuelve null si no es un monto válido (máximo dos decimales, RN-06).
export function parsearMonto(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  return Number(limpio);
}