"use client";

import { IdCard } from "lucide-react";
import { Modal } from "@/components/modal";
import type { Producto } from "@/lib/mock/productos";

type Props = {
  producto: Producto;
  onConfirmar: () => void;
  onCerrar: () => void;
};

// RN-26: antes de vender un producto con restricción de edad se confirma
// que se revisó la identificación. No se guarda ningún dato del cliente.
export function DialogoEdad({ producto, onConfirmar, onCerrar }: Props) {
  return (
    <Modal titulo="Verificar edad" onCerrar={onCerrar}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-lg bg-aviso/10 p-4 text-aviso">
          <IdCard size={28} className="shrink-0" />
          <p>
            <span className="font-semibold">{producto.name}</span> solo se
            vende a mayores de 18 años. Pida la identificación al cliente.
          </p>
        </div>

        <p className="font-medium">¿Verificó la identificación?</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="h-12 flex-1 rounded-lg border border-borde font-semibold hover:bg-fondo"
          >
            No, cancelar
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirmar}
            className="h-12 flex-1 rounded-lg bg-marca font-semibold text-white hover:bg-marca-oscuro"
          >
            Sí, es mayor de edad
          </button>
        </div>
      </div>
    </Modal>
  );
}