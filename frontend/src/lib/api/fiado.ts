import "server-only";
import { connection } from "next/server";
import { clientesFiadoMock, type ClienteFiado } from "@/lib/mock/fiado";

export type { ClienteFiado };

// Solo lo que la pantalla de cobro necesita para elegir a quién fiar.
export type ClienteResumen = {
  id: number;
  aliasName: string;
  balance: number;
};

export async function listarClientesFiado(): Promise<ClienteResumen[]> {
  await connection();
  // TODO: GET /fiado/clientes
  return clientesFiadoMock
    .map(({ id, aliasName, balance }) => ({ id, aliasName, balance }))
    .sort((a, b) => a.aliasName.localeCompare(b.aliasName, "es"));
}