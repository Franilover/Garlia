
export const CATEGORIAS = {
  FOTOS: ['todos', 'yo', 'amigos', 'animales', 'paisajes'],
  DIBUJOS: ['todos', 'fanart', 'original', 'bocetos'],
  ITEMS: ['TODOS', 'ARMA', 'ACCESORIO', 'CONSUMIBLE'] 
};


export const MENSAJES = {
  LOADING: {
    personajes: "Indexando...",
    criaturas: "Sincronizando Archivos...",
    dibujos: "Desplegando Arte...",
    fotos: "Cargando Memorias...",
    items: "Abriendo AlmacÃ©n..."
  },
  EMPTY: {
    default: "No hay registros en esta secciÃ³n",
    fotos: "No hay fotos en esta categorÃ­a",
    items: "No hay objetos en esta secciÃ³n"
  }
};


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

export function getMensaje(tipo, seccion) {
  const grupo = MENSAJES[tipo];
  if (!grupo) return "Cargando...";
  
  return grupo[seccion] || grupo.default || "Cargando...";
}