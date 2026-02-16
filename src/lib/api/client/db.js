import Dexie from "dexie";

export const db = typeof window !== "undefined" ? new Dexie("AgendaFranilover") : null;

if (db) {
  db.version(1).stores({
    // id: primary key
    // status: 'pending' (para subir) o 'synced' (ya en la nube)
    notas: "id, contenido, status, updated_at"
  });
}