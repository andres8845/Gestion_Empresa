import { CircleUser, LogOut } from "lucide-react";
import { salir } from "@/app/login/actions";
import { requerirUsuario } from "@/lib/api/usuarios";
import { obtenerCajaAbierta } from "@/lib/api/caja";
import { formatearHora } from "@/lib/formato";

// Parte de abajo del menú: quién atiende, si la caja está abierta
// y el botón para cerrar sesión.
export async function EstadoSesion() {
  const [usuario, caja] = await Promise.all([
    requerirUsuario(),
    obtenerCajaAbierta(),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`rounded-lg px-3 py-2 text-sm ${
          caja ? "bg-marca/10 text-marca" : "bg-aviso/10 text-aviso"
        }`}
      >
        {caja
          ? `Caja abierta · ${formatearHora(caja.opened_at)}`
          : "Caja cerrada"}
      </div>

      <div className="flex items-center gap-2">
        <CircleUser size={22} className="text-texto-suave" />
        <span className="flex-1 truncate font-medium capitalize">
          {usuario.username}
        </span>
        <form action={salir}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="rounded-lg p-2 text-texto-suave hover:bg-fondo hover:text-peligro"
          >
            <LogOut size={20} />
            <span className="sr-only">Cerrar sesión</span>
          </button>
        </form>
      </div>
    </div>
  );
}