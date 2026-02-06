// lib/config/tables.js
export const TABLES_CONFIG = {
  personajes: {
    name: 'personajes',
    filters: ['reino', 'especie'],
    order: { campo: 'nombre', asc: true },
    realtime: true,
    cache: true
  },
  criaturas: {
    name: 'criaturas',
    filters: ['habitat', 'pensamiento', 'alma'],
    order: { campo: 'nombre', asc: true },
    realtime: true,
    cache: true
  },
  items: {
    name: 'items',
    filters: ['categoria'],
    order: { campo: 'created_at', asc: false },
    realtime: false,
    cache: true
  }
};
