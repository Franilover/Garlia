import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Validamos que existan las variables (esto lanzará un error claro en el log de Vercel si faltan)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Error: Faltan las variables de entorno de Supabase.");
}

// Creamos la instancia directamente. 
// supabase-js ya maneja el patrón Singleton internamente de forma eficiente.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    // Configuración para evitar errores de red intermitentes en la web
    fetch: (...args) => {
      return fetch(...args, {
        cache: "no-store", // Evita que el navegador cachee errores de red
      });
    },
  },
  // Aumentamos la resiliencia de la conexión
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});