import Dexie, { type Table } from "dexie";

export interface Personaje {
  id: string;
  nombre: string;
  visible?: boolean;
  [key: string]: any;
}

export interface Criatura {
  id: string;
  nombre: string;
  habitat?: string;
  alma?: string;
  pensamiento?: string;
  [key: string]: any;
}

export interface CriaturaVariante {
  id: string;
  criatura_id: string;
  tipo?: string;
  [key: string]: any;
}

export interface Item {
  id: string;
  nombre?: string;
  categoria?: string;
  [key: string]: any;
}

export interface Libro {
  id: string;
  titulo?: string;
  created_at?: string;
  [key: string]: any;
}

export interface Capitulo {
  id: string;
  libro_id: string;
  orden: number;
  titulo_capitulo?: string;
  contenido?: string;
  fecha_publicacion?: string;
}

export interface Cancion {
  id: string;
  titulo: string;
  personaje?: string;
  cantante?: string;
  compositor?: string;
  idioma?: string;
  estado?: string;
  portada_url?: string;
  links?: any;
  visible?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SeccionCancion {
  id: string;
  cancion_id: string;
  nombre_seccion: string;
  letra_es: string;
  letra_en?: string;
  letra_jp?: string;
  letra_romaji?: string;
  orden: number;
  created_at?: string;
}

export interface Reino {
  id: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
  mapa_url?: string;
  imagen_reino?: string;
  coord_x?: number;
  coord_y?: number;
}
export interface ReinoDetalle {
  id: string;
  reino_id: string;
  nombre?: string;
  descripcion?: string;
  coord_x?: number;
  coord_y?: number;
  oculto?: boolean;
  [key: string]: any;
}


export interface Relacion {
  id: string;
  personaje_id: string;
  personaje_rel_id: string;
  tipo: string;
  nota?: string | null;
  [key: string]: any;
}

export interface Tarea {
  id: string;
  titulo: string;
  categoria?: string;
  username?: string;
  completada?: boolean;
  created_at?: string;
  status?: "pending" | "synced";
  deleted?: boolean;
}

export interface Evento {
  id: string;
  titulo: string;
  fecha: string;
  tipo?: string;
  hora_inicio?: string;
  username?: string;
  status?: "pending" | "synced";
  deleted?: boolean;
}

export interface Receta {
  id: string;
  nombre?: string;
  categoria?: string;
  autor_id?: string;
  ingredientes?: any;
  instrucciones?: any;
  created_at?: string;
}

export interface Ingrediente {
  id: string;
  user_id?: string;
  [key: string]: any;
}

export interface RopaPrenda {
  id: string;
  user_id?: string;
  created_at?: string;
  [key: string]: any;
}

export interface RopaOutfit {
  id: string;
  user_id?: string;
  created_at?: string;
  [key: string]: any;
}

export interface DiarioFoto {
  id: number;
  fecha?: string;
  url_imagen: string;
  categoria?: string;
  created_at?: string;
}

export interface Dibujo {
  id: number;
  titulo: string;
  url_imagen: string;
  categoria?: string;
}

export interface Nota {
  id: string;
  titulo?: string;
  contenido: string;
  tags?: string[];
  updated_at: string;
  status: "pending" | "synced";
  deleted?: boolean;
}

export interface RutinaLocal {
  id: string;
  nombre: string;
  descripcion?: string;
  tag?: string;
  created_at?: string;
  status?: "pending" | "synced";
  deleted?: boolean;
}

export interface EjercicioLocal {
  id: string;
  rutina_id: string;
  nombre: string;
  series?: number;
  reps?: string;
  descanso?: number;
  musculo?: string;
  notas?: string;
  orden?: number;
  status?: "pending" | "synced";
  deleted?: boolean;
}

export interface OfflineOperation {
  id?: number;
  table: string;
  operation: "upsert" | "update" | "delete";
  recordId: string;
  payload: any;
  timestamp: number;
  retries: number;
}

export interface ReproductorHandle {
  key: string;
  handle: FileSystemDirectoryHandle;
}

export interface Compra {
  id: string;
  [key: string]: any;
}

export interface SessionCache {
  key: string;   
  value: any;    
  updated_at: number;
}

export interface Hechizo {
  id: string;
  nombre: string;
  explicacion?: string;
  criatura_id?: string | null;
  variante_id?: string | null;
  [key: string]: any;
}

export interface Don {
  id: string;
  nombre: string;
  explicacion?: string;
  criatura_id?: string | null;
  variante_id?: string | null;
  [key: string]: any;
}

class AgendaFraniDB extends Dexie {

  personajes!: Table<Personaje, string>;
  criaturas!: Table<Criatura, string>;
  criatura_variantes!: Table<CriaturaVariante, string>;
  items!: Table<Item, string>;
  libros!: Table<Libro, string>;
  capitulos!: Table<Capitulo, string>;
  canciones!: Table<Cancion, string>;
  secciones_cancion!: Table<SeccionCancion, string>;
  reinos!: Table<Reino, string>;
  relaciones!: Table<Relacion, string>;
  reino_detalles!: Table<ReinoDetalle, string>;


  tareas!: Table<Tarea, string>;
  eventos!: Table<Evento, string>;
  recetas!: Table<Receta, string>;
  ingredientes!: Table<Ingrediente, string>;
  ropa!: Table<RopaPrenda, string>;
  ropa_outfits!: Table<RopaOutfit, string>;
  diario_fotos!: Table<DiarioFoto, number>;
  dibujos!: Table<Dibujo, number>;
  compras!: Table<Compra, string>;

  notas!: Table<Nota, string>;
  ensayos!: Table<Nota, string>; 

  rutinas!: Table<RutinaLocal, string>;
  ejercicios_rutina!: Table<EjercicioLocal, string>;

  offline_queue!: Table<OfflineOperation, number>;

  reproductor_handles!: Table<ReproductorHandle, string>;

  
  session_cache!: Table<SessionCache, string>;
  hechizos!: Table<Hechizo, string>;
  dones!: Table<Don, string>;
  
  


  constructor() {
    super("AgendaFranilover");

    this.version(1).stores({
      personajes:         "id, nombre, visible",
      criaturas:          "id, nombre, habitat, alma, pensamiento",
      criatura_variantes: "id, criatura_id, tipo",
      items:              "id, nombre, categoria",
      libros:             "id, created_at",
      capitulos:          "id, libro_id, orden, fecha_publicacion",
      canciones:          "id, titulo, personaje, visible, created_at",
      secciones_cancion:  "id, cancion_id, orden",
      reinos:             "id, nombre, orden",
      relaciones:         "id, personaje_id",
      tareas:             "id, username, completada, created_at",
      eventos:            "id, username, fecha, tipo",
      recetas:            "id, autor_id, categoria, created_at",
      ingredientes:       "id, user_id",
      ropa:               "id, user_id, created_at",
      ropa_outfits:       "id, user_id, created_at",
      diario_fotos:       "++id, categoria, created_at",
      dibujos:            "++id, categoria",
      notas:              "id, status, updated_at",
    });

    this.version(2).stores({
      personajes:         "id, nombre, visible",
      criaturas:          "id, nombre, habitat, alma, pensamiento",
      criatura_variantes: "id, criatura_id, tipo",
      items:              "id, nombre, categoria",
      libros:             "id, created_at",
      capitulos:          "id, libro_id, orden, fecha_publicacion",
      canciones:          "id, titulo, personaje, visible, created_at",
      secciones_cancion:  "id, cancion_id, orden",
      reinos:             "id, nombre, orden",
      relaciones:         "id, personaje_id",
      tareas:             "id, username, completada, created_at, status",
      eventos:            "id, username, fecha, tipo, status",
      recetas:            "id, autor_id, categoria, created_at",
      ingredientes:       "id, user_id",
      ropa:               "id, user_id, created_at",
      ropa_outfits:       "id, user_id, created_at",
      diario_fotos:       "++id, categoria, created_at",
      dibujos:            "++id, categoria",
      notas:              "id, status, updated_at",
      rutinas:            "id, status",
      ejercicios_rutina:  "id, rutina_id, status",
      offline_queue:      "++id, table, operation, recordId, timestamp",
    });

    this.version(3).stores({
      personajes:           "id, nombre, visible",
      criaturas:            "id, nombre, habitat, alma, pensamiento",
      criatura_variantes:   "id, criatura_id, tipo",
      items:                "id, nombre, categoria",
      libros:               "id, created_at",
      capitulos:            "id, libro_id, orden, fecha_publicacion",
      canciones:            "id, titulo, personaje, visible, created_at",
      secciones_cancion:    "id, cancion_id, orden",
      reinos:               "id, nombre, orden",
      relaciones:           "id, personaje_id",
      tareas:               "id, username, completada, created_at, status",
      eventos:              "id, username, fecha, tipo, status",
      recetas:              "id, autor_id, categoria, created_at",
      ingredientes:         "id, user_id",
      ropa:                 "id, user_id, created_at",
      ropa_outfits:         "id, user_id, created_at",
      diario_fotos:         "++id, categoria, created_at",
      dibujos:              "++id, categoria",
      notas:                "id, status, updated_at",
      rutinas:              "id, status",
      ejercicios_rutina:    "id, rutina_id, status",
      offline_queue:        "++id, table, operation, recordId, timestamp",
      compras:              "id",
      reproductor_handles:  "key",
    });

    this.version(4).stores({
      personajes:           "id, nombre, visible",
      criaturas:            "id, nombre, habitat, alma, pensamiento",
      criatura_variantes:   "id, criatura_id, tipo",
      items:                "id, nombre, categoria",
      libros:               "id, created_at",
      capitulos:            "id, libro_id, orden, fecha_publicacion",
      canciones:            "id, titulo, personaje, visible, created_at",
      secciones_cancion:    "id, cancion_id, orden",
      reinos:               "id, nombre, orden",
      relaciones:           "id, personaje_id",
      tareas:               "id, username, completada, created_at, status",
      eventos:              "id, username, fecha, tipo, status",
      recetas:              "id, autor_id, categoria, created_at",
      ingredientes:         "id, user_id",
      ropa:                 "id, user_id, created_at",
      ropa_outfits:         "id, user_id, created_at",
      diario_fotos:         "++id, categoria, created_at",
      dibujos:              "++id, categoria",
      notas:                "id, status, updated_at",
      rutinas:              "id, status",
      ejercicios_rutina:    "id, rutina_id, status",
      offline_queue:        "++id, table, operation, recordId, timestamp",
      compras:              "id",
      reproductor_handles:  "key",
      session_cache:        "key, updated_at",  
    });
    this.version(5).stores({
      personajes:           "id, nombre, visible",
      criaturas:            "id, nombre, habitat, alma, pensamiento",
      criatura_variantes:   "id, criatura_id, tipo",
      items:                "id, nombre, categoria",
      libros:               "id, created_at",
      capitulos:            "id, libro_id, orden, fecha_publicacion",
      canciones:            "id, titulo, personaje, visible, created_at",
      secciones_cancion:    "id, cancion_id, orden",
      reinos:               "id, nombre, orden",
      relaciones:           "id, personaje_id",
      tareas:               "id, username, completada, created_at, status",
      eventos:              "id, username, fecha, tipo, status",
      recetas:              "id, autor_id, categoria, created_at",
      ingredientes:         "id, user_id",
      ropa:                 "id, user_id, created_at",
      ropa_outfits:         "id, user_id, created_at",
      diario_fotos:         "++id, categoria, created_at",
      dibujos:              "++id, categoria",
      notas:                "id, status, updated_at",
      ensayos:              "id, status, updated_at",   
      rutinas:              "id, status",
      ejercicios_rutina:    "id, rutina_id, status",
      offline_queue:        "++id, table, operation, recordId, timestamp",
      compras:              "id",
      reproductor_handles:  "key",
      session_cache:        "key, updated_at",
    });
    this.version(6).stores({
      personajes:           "id, nombre, visible",
      criaturas:            "id, nombre, habitat, alma, pensamiento",
      criatura_variantes:   "id, criatura_id, tipo",
      items:                "id, nombre, categoria",
      libros:               "id, created_at",
      capitulos:            "id, libro_id, orden, fecha_publicacion",
      canciones:            "id, titulo, personaje, visible, created_at",
      secciones_cancion:    "id, cancion_id, orden",
      reinos:               "id, nombre, orden",
      relaciones:           "id, personaje_id",
      tareas:               "id, username, completada, created_at, status",
      eventos:              "id, username, fecha, tipo, status",
      recetas:              "id, autor_id, categoria, created_at",
      ingredientes:         "id, user_id",
      ropa:                 "id, user_id, created_at",
      ropa_outfits:         "id, user_id, created_at",
      diario_fotos:         "++id, categoria, created_at",
      dibujos:              "++id, categoria",
      notas:                "id, status, updated_at",
      ensayos:              "id, status, updated_at",
      rutinas:              "id, status",
      ejercicios_rutina:    "id, rutina_id, status",
      offline_queue:        "++id, table, operation, recordId, timestamp",
      compras:              "id",
      reproductor_handles:  "key",
      session_cache:        "key, updated_at",
      reino_detalles:       "id, reino_id", // ← nueva
    });

    this.version(7).stores({
      personajes:           "id, nombre, visible",
      criaturas:            "id, nombre, habitat, alma, pensamiento",
      criatura_variantes:   "id, criatura_id, tipo",
      items:                "id, nombre, categoria",
      libros:               "id, created_at",
      capitulos:            "id, libro_id, orden, fecha_publicacion",
      canciones:            "id, titulo, personaje, visible, created_at",
      secciones_cancion:    "id, cancion_id, orden",
      reinos:               "id, nombre, orden",
      relaciones:           "id, personaje_id",
      tareas:               "id, username, completada, created_at, status",
      eventos:              "id, username, fecha, tipo, status",
      recetas:              "id, autor_id, categoria, created_at",
      ingredientes:         "id, user_id",
      ropa:                 "id, user_id, created_at",
      ropa_outfits:         "id, user_id, created_at",
      diario_fotos:         "++id, categoria, created_at",
      dibujos:              "++id, categoria",
      notas:                "id, status, updated_at",
      ensayos:              "id, status, updated_at",
      rutinas:              "id, status",
      ejercicios_rutina:    "id, rutina_id, status",
      offline_queue:        "++id, table, operation, recordId, timestamp",
      compras:              "id",
      reproductor_handles:  "key",
      session_cache:        "key, updated_at",
      reino_detalles:       "id, reino_id",
      hechizos:             "id, nombre",       // ← nueva
      dones:                "id, nombre",        // ← nueva
    });

    this.version(8).stores({
      personajes:           "id, nombre, visible",
      criaturas:            "id, nombre, habitat, alma, pensamiento",
      criatura_variantes:   "id, criatura_id, tipo",
      items:                "id, nombre, categoria",
      libros:               "id, created_at",
      capitulos:            "id, libro_id, orden, fecha_publicacion",
      canciones:            "id, titulo, personaje, visible, created_at",
      secciones_cancion:    "id, cancion_id, orden",
      reinos:               "id, nombre, orden",
      relaciones:           "id, personaje_id, personaje_rel_id, tipo", // ← índices ampliados
      tareas:               "id, username, completada, created_at, status",
      eventos:              "id, username, fecha, tipo, status",
      recetas:              "id, autor_id, categoria, created_at",
      ingredientes:         "id, user_id",
      ropa:                 "id, user_id, created_at",
      ropa_outfits:         "id, user_id, created_at",
      diario_fotos:         "++id, categoria, created_at",
      dibujos:              "++id, categoria",
      notas:                "id, status, updated_at",
      ensayos:              "id, status, updated_at",
      rutinas:              "id, status",
      ejercicios_rutina:    "id, rutina_id, status",
      offline_queue:        "++id, table, operation, recordId, timestamp",
      compras:              "id",
      reproductor_handles:  "key",
      session_cache:        "key, updated_at",
      reino_detalles:       "id, reino_id",
      hechizos:             "id, nombre",
      dones:                "id, nombre",
    });
    this.version(9).stores({
      personajes:           "id, nombre, visible",
      criaturas:            "id, nombre, habitat, alma, pensamiento",
      criatura_variantes:   "id, criatura_id, tipo",
      items:                "id, nombre, categoria",
      libros:               "id, created_at",
      capitulos:            "id, libro_id, orden, fecha_publicacion",
      canciones:            "id, titulo, personaje, visible, created_at",
      secciones_cancion:    "id, cancion_id, orden",
      reinos:               "id, nombre, orden",
      relaciones:           "id, personaje_id, personaje_rel_id, tipo",
      tareas:               "id, username, completada, created_at, status",
      eventos:              "id, username, fecha, tipo, status",
      recetas:              "id, autor_id, categoria, created_at",
      ingredientes:         "id, user_id",
      ropa:                 "id, user_id, created_at",
      ropa_outfits:         "id, user_id, created_at",
      diario_fotos:         "++id, categoria, created_at",
      dibujos:              "++id, categoria",
      notas:                "id, status, updated_at", 
      ensayos:              "id, status, updated_at",
      rutinas:              "id, status",
      ejercicios_rutina:    "id, rutina_id, status",
      offline_queue:        "++id, table, operation, recordId, timestamp",
      compras:              "id",
      reproductor_handles:  "key",
      session_cache:        "key, updated_at",
      reino_detalles:       "id, reino_id",
      hechizos:             "id, nombre",
      dones:                "id, nombre",
      notas_lore:           "id, updated_at",          
    });
  }
}




export const db =
  typeof window !== "undefined"
    ? new AgendaFraniDB()
    : (null as unknown as AgendaFraniDB);