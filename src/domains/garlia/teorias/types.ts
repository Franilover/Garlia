/**
 * Fila cruda de la tabla `teorias` (ver sql/teorias.sql), con el nombre de
 * usuario del autor ya resuelto vía join a `perfiles` para no tener que
 * pedirlo aparte en cada listado.
 */
export interface Teoria {
  id: string;
  autor_id: string;
  autor_username: string | null;
  titulo: string;
  contenido: string;
  created_at: string;
}

/** Payload para crear una teoría desde el formulario público. */
export interface TeoriaInput {
  titulo: string;
  contenido: string;
}
