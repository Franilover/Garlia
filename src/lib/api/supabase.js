import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Creamos una Ãºnica instancia del cliente
let supabaseInstance;

export const supabase = (() => {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("â Error: Faltan las variables de entorno de Supabase.");
      return null;
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
})();