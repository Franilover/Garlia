import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/api/client/supabase';
import { Database } from './supabase';

// --- HELPERS PARA CRUD ---
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// --- QUERIES MAESTRAS (WIKI/GARLIA) ---

export const cancionQuery = supabase
  .from('canciones')
  .select(`
    *,
    personaje:personajes (id, nombre, img_url),
    secciones:secciones_cancion (*)
  `);
export type Cancion = QueryData<typeof cancionQuery>;

export const personajeFullQuery = supabase
  .from('personajes')
  .select(`
    *,
    canciones (id, titulo, portada_url)
  `);
export type PersonajeFull = QueryData<typeof personajeFullQuery>;

export const criaturaFullQuery = supabase
  .from('criaturas')
  .select(`*, variantes:criatura_variantes (*)`);
export type CriaturaFull = QueryData<typeof criaturaFullQuery>;

export const libroFullQuery = supabase
  .from('libros')
  .select(`*, capitulos (*)`);
export type LibroFull = QueryData<typeof libroFullQuery>;


export const rutinaFullQuery = supabase
  .from('rutinas')
  .select(`*, ejercicios:ejercicios_rutina (*)`);
export type RutinaFull = QueryData<typeof rutinaFullQuery>;


// --- DIBUJOS ---
export const dibujoFullQuery = supabase.from('dibujos').select('*');
export type Dibujo = QueryData<typeof dibujoFullQuery>;

// --- REINOS ---
export const reinoFullQuery = supabase.from('reinos').select('*');
export type Reino = QueryData<typeof reinoFullQuery>;

// --- ITEMS ---
export const itemFullQuery = supabase.from('items').select('*');
export type Item = QueryData<typeof itemFullQuery>;

// --- EVENTOS ---
export const eventoFullQuery = supabase.from('eventos').select('*');
export type Evento = QueryData<typeof eventoFullQuery>;

// --- PERSONAL ---

// Fotos
export const fotoFullQuery = supabase.from('fotos').select('*');
export type Foto = QueryData<typeof fotoFullQuery>;

// Ropa (Inventario)
export const ropaFullQuery = supabase.from('ropa').select('*');
export type Ropa = QueryData<typeof ropaFullQuery>;

// Tareas (To-Do List)
export const tareaFullQuery = supabase.from('tareas').select('*');
export type Tarea = QueryData<typeof tareaFullQuery>;