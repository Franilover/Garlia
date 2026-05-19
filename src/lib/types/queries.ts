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
export type Cancion = QueryData<typeof cancionQuery>[number];

export const personajeFullQuery = supabase
  .from('personajes')
  .select(`
    *,
    canciones (id, titulo, portada_url)
  `);
export type PersonajeFull = QueryData<typeof personajeFullQuery>[number];

export const criaturaFullQuery = supabase
  .from('criaturas')
  .select(`*, variantes:criatura_variantes (*)`);
export type CriaturaFull = QueryData<typeof criaturaFullQuery>[number];

export const libroFullQuery = supabase
  .from('libros')
  .select(`*, capitulos (*)`);
export type LibroFull = QueryData<typeof libroFullQuery>[number];

export const rutinaFullQuery = supabase
  .from('rutinas')
  .select(`*, ejercicios:ejercicios_rutina (*)`);
export type RutinaFull = QueryData<typeof rutinaFullQuery>[number];

// --- DIBUJOS ---
export const dibujoFullQuery = supabase.from('dibujos').select('*');
export type Dibujo = QueryData<typeof dibujoFullQuery>[number];

// --- REINOS ---
export const reinoFullQuery = supabase.from('reinos').select('*');
export type Reino = QueryData<typeof reinoFullQuery>[number];

// --- ITEMS ---
export const itemFullQuery = supabase.from('items').select('*');
export type Item = QueryData<typeof itemFullQuery>[number];

// --- EVENTOS ---
export const eventoFullQuery = supabase.from('eventos').select('*');
export type Evento = QueryData<typeof eventoFullQuery>[number];

// --- PERSONAL ---

// Fotos
export const fotoFullQuery = supabase.from('fotos').select('*');
export type Foto = QueryData<typeof fotoFullQuery>[number];

// Ropa (Inventario)
export const ropaFullQuery = supabase.from('ropa').select('*');
export type Ropa = QueryData<typeof ropaFullQuery>[number];

// Tareas (To-Do List)
export const tareaFullQuery = supabase.from('tareas').select('*');
export type Tarea = QueryData<typeof tareaFullQuery>[number];

// --- COCINA ---
export const ingredienteFullQuery = supabase.from('ingredientes').select('*');
export type Ingrediente = QueryData<typeof ingredienteFullQuery>[number];

export const recetaFullQuery = supabase.from('recetas').select('*');
export type Receta = QueryData<typeof recetaFullQuery>[number];

export const compraFullQuery = supabase.from('compras').select('*');
export type Compra = QueryData<typeof compraFullQuery>[number];

export type RecetaCategoria = string;