import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | Mercadito Daniela",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-marca text-2xl font-bold text-white">
            MD
          </div>
          <h1 className="text-2xl font-bold">Mercadito Daniela</h1>
          <p className="mt-1 text-texto-suave">Sistema de cobros e inventario</p>
        </div>

        <div className="rounded-2xl border border-borde bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-texto-suave">
          Por seguridad, la sesión se cierra después de 30 minutos sin uso.
        </p>
      </div>
    </main>
  );
}