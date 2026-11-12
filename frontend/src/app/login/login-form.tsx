"use client";

import { useActionState } from "react";
import { iniciarSesion, type LoginState } from "./actions";

const estadoInicial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    iniciarSesion,
    estadoInicial,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium">
          Usuario
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          defaultValue={state.username}
          className="h-12 rounded-lg border border-borde bg-white px-4 text-lg outline-none focus:border-marca focus:ring-2 focus:ring-marca/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-12 rounded-lg border border-borde bg-white px-4 text-lg outline-none focus:border-marca focus:ring-2 focus:ring-marca/30"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-peligro/10 px-4 py-3 text-sm font-medium text-peligro"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-marca text-lg font-semibold text-white transition hover:bg-marca-oscuro disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}