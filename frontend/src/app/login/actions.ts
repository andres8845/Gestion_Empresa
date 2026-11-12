"use server";

import { redirect } from "next/navigation";
import { usuariosMock } from "@/lib/mock/usuarios";
import { crearSesion, cerrarSesion } from "@/lib/session";
import { obtenerCajaAbierta } from "@/lib/api/caja";

export type LoginState = {
  error?: string;
  username?: string;
};

export async function iniciarSesion(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Ingrese su usuario y contraseña.", username };
  }

  // TODO: reemplazar por la llamada al backend (POST /auth/login).
  const usuario = usuariosMock.find(
    (u) => u.username === username && u.password === password,
  );

  // Mismo mensaje para usuario o contraseña incorrectos, así no se
  // revela cuál de los dos falló.
  if (!usuario) {
    return { error: "Usuario o contraseña incorrectos.", username };
  }

  if (!usuario.is_active) {
    return {
      error: "Este usuario está desactivado. Hable con el encargado.",
      username,
    };
  }

  await crearSesion(usuario.username);

  // Siguiente paso del flujo: abrir caja. Mientras esa pantalla no exista,
  // se va directo a cobro.
  redirect("/cobro");
}

export async function salir() {
  await cerrarSesion();
    const caja = await obtenerCajaAbierta();
    redirect(caja ? "/cobro" : "/caja/abrir");
}