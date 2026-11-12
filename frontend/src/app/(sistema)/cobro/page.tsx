import { salir } from "@/app/login/actions";

// Pantalla temporal: solo sirve para comprobar que el login funciona.
// La pantalla real de cobro se hará en su propia rama.
export default function CobroPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-fondo p-8">
      <h1 className="text-2xl font-bold">Cobro</h1>
      <p className="text-texto-suave">Sesión iniciada. Esta pantalla se construye en el siguiente paso.</p>
      <form action={salir}>
        <button
          type="submit"
          className="rounded-lg border border-borde bg-white px-5 py-2.5 font-medium hover:bg-fondo"
        >
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}