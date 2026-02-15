import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Validamos que existan las variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Error: Faltan las variables de entorno de Supabase.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    // Configuración corregida para fusionar argumentos correctamente
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        cache: "no-store", // Forzamos que no haya caché
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