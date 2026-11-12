// Datos de prueba mientras el backend no está listo.
// Tienen la misma forma que la tabla `users` de la base de datos.
// IMPORTANTE: en el sistema real las contraseñas se guardan cifradas (RN-04)
// y la comparación la hace el backend de Nest. Este archivo se borra cuando
// la pantalla se conecte a la API.

export type Usuario = {
  id: number;
  username: string;
  password: string; // solo en el mock; en la base de datos es password_hash
  is_active: boolean;
};

export const usuariosMock: Usuario[] = [
  { id: 1, username: "daniela", password: "1234", is_active: true },
  { id: 2, username: "junior", password: "1234", is_active: true },
  { id: 3, username: "inactivo", password: "1234", is_active: false },
];