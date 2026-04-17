"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/api/client/supabase";
import {
  getPerfilCached,
  setPerfilCached,
  clearPerfilCached,
} from "@/lib/api/client/perfilCache";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setPerfil_user] = useState(null);
  const [perfil, setPerfil]    = useState(null);
  const [loading, setLoading]  = useState(true);  
  const isAdmin = perfil?.rol === "admin"; // o el campo que uses
  const fetchPerfil = async (userId: string, userEmail: string) => {
    try {
      // ── 1. Servir caché de Dexie inmediatamente (0 ms de espera) ──────────
      const cached = await getPerfilCached();
      if (cached?.perfil) {
        setPerfil(cached.perfil);
        setLoading(false); // navbar ya puede renderizar
      }

      // ── 2. Revalidar contra Supabase en background ────────────────────────
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        setPerfil(data);
        setPerfilCached(data); // actualizar caché con datos frescos
        console.log("Perfil cargado:", data);
      } else {
        // Crear perfil automático si no existe
        const nombreAuto = userEmail ? userEmail.split("@")[0] : "Usuario";
        const nuevoPerfil = {
          id: userId,
          email: userEmail,
          username: nombreAuto,
          rol: "user",
          status: "Explorador Novato",
        };

        const { error: insertError } = await supabase
          .from("perfiles")
          .upsert(nuevoPerfil);

        if (!insertError) {
          setPerfil(nuevoPerfil);
          setPerfilCached(nuevoPerfil);
        }
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err);
      // Si falla la red pero había caché, el perfil ya está en estado — no hacer nada
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setPerfil_user(session.user);
        await fetchPerfil(session.user.id, session.user.email ?? "");
      } else {
        setPerfil_user(null);
        setPerfil(null);
        clearPerfilCached(); // limpiar al cerrar sesión
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, perfil, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);