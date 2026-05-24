"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
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

  // Ref para evitar actualizaciones de estado en componente desmontado
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPerfil = async (userId: string, userEmail: string) => {
    try {
      // Caché local primero
      const cached = await getPerfilCached();
      if (cached?.perfil && mountedRef.current) {
        setPerfil(cached.perfil);
        setLoading(false);
      }

      const { data } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!mountedRef.current) return;

      if (data) {
        setPerfil(data);
        setPerfilCached(data);
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

        if (!insertError && mountedRef.current) {
          setPerfil(nuevoPerfil);
          setPerfilCached(nuevoPerfil);
        }
      }
    } catch (err) {
      if (mountedRef.current) console.error("Error al cargar perfil:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // ── Leer sesión inicial ANTES de suscribirse ──────────────────────────
    // Esto evita el AbortError: getSession() es síncrono-compatible y no
    // bloquea el callback de onAuthStateChange.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      if (session?.user) {
        setPerfil_user(session.user);
        fetchPerfil(session.user.id, session.user.email ?? "");
      } else {
        setLoading(false);
      }
    });

    // ── Suscripción SIN async ─────────────────────────────────────────────
    // onAuthStateChange NO soporta callbacks async — hacer await aquí causa
    // el AbortError que cerraba la sesión. En su lugar disparamos fetchPerfil
    // sin await y dejamos que maneje su propio estado interno.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (session?.user) {
        setPerfil_user(session.user);
        // Sin await — lanzar y olvidar; fetchPerfil maneja su propio finally
        fetchPerfil(session.user.id, session.user.email ?? "");
      } else {
        setPerfil_user(null);
        setPerfil(null);
        clearPerfilCached();
        setLoading(false);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, perfil, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);