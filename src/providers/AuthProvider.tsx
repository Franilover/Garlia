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
  const isAdmin = perfil?.rol === "admin"; 
  const fetchPerfil = async (userId: string, userEmail: string) => {
    try {
      
      const cached = await getPerfilCached();
      if (cached?.perfil) {
        setPerfil(cached.perfil);
        setLoading(false); 
      }

      
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        setPerfil(data);
        setPerfilCached(data); 
        console.log("Perfil cargado:", data);
      } else {
        
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
        clearPerfilCached(); 
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