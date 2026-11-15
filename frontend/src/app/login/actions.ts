"use server";

import { redirect } from "next/navigation";
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

  try {
    const response = await fetch(`${process.env.API_URL ?? "http://localhost:3001"}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 400) return { error: "Ingrese un usuario y contraseña válidos.", username };
      if (response.status === 429) return { error: "Demasiados intentos. Espere unos minutos y vuelva a intentar.", username };
      return { error: "Usuario o contraseña incorrectos.", username };
    }
    const setCookie = response.headers.get("set-cookie");
    const token = setCookie?.match(/md_session=([^;]+)/)?.[1];
    if (!token) return { error: "No fue posible iniciar la sesión. Intente nuevamente.", username };
    await crearSesion(decodeURIComponent(token));
  } catch {
    return { error: "No se pudo conectar con el sistema. Intente nuevamente.", username };
  }

  const caja = await obtenerCajaAbierta();
  redirect(caja ? "/cobro" : "/caja/abrir");
}

export async function salir() {
  const { obtenerTokenSesion } = await import("@/lib/session");
  const token = await obtenerTokenSesion();
  try {
    if (token) await fetch(`${process.env.API_URL ?? "http://localhost:3001"}/auth/logout`, {
      method: "POST",
      headers: { Cookie: `md_session=${encodeURIComponent(token)}` },
      cache: "no-store",
    });
  } finally {
    await cerrarSesion();
  }
  redirect("/login");
}
