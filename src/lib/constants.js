// === CATEGORÍAS ===
export const CATEGORIAS = {
  FOTOS: ['todos', 'yo', 'amigos', 'animales', 'paisajes'],
  DIBUJOS: ['todos', 'fanart', 'original', 'bocetos'],
  ITEMS: ['TODOS', 'ARMA', 'ACCESORIO', 'CONSUMIBLE'] // desde DB idealmente
};

// === MENSAJES ===
export const MENSAJES = {
  LOADING: {
    personajes: "Indexando...",
    criaturas: "Sincronizando Archivos...",
    dibujos: "Desplegando Arte...",
    fotos: "Cargando Memorias...",
    items: "Abriendo Almacén..."
  },
  EMPTY: {
    default: "No hay registros en esta sección",
    fotos: "No hay fotos en esta categoría",
    items: "No hay objetos en esta sección"
  }
};

// === CONFIGURACIÓN DE TABLAS ===
export const TABLAS_CONFIG = {
  personajes: {
    orden: { campo: 'id', asc: true },
    filtros: ['reino', 'especie']
  },
  criaturas: {
    orden: { campo: 'nombre', asc: true },
    filtros: ['habitat', 'pensamiento', 'alma']
  },
  dibujos: {
    orden: { campo: 'id', asc: false },
    filtros: ['categoria']
  }
};