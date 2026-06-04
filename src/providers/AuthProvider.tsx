"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/api/client/supabase";
import {
  getPerfilCached,
  setPerfilCached,
  clearPerfilCached,
} from "@/lib/api/client/perfilCache";
import { db } from "@/lib/db";

// ─── Tiempo máximo antes de refrescar desde Supabase (5 minutos) ─────────────
const PERFIL_CACHE_TTL_MS = 5 * 60 * 1000;

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

  // ── Guardar perfil en Dexie ───────────────────────────────────────────────
  const guardarPerfilDexie = async (perfilData: any) => {
    try {
      await db.perfiles.put({ ...perfilData, cached_at: Date.now() });
    } catch (err) {
      console.warn("No se pudo guardar perfil en Dexie:", err);
    }
  };

  // ── Leer perfil desde Dexie ───────────────────────────────────────────────
  const leerPerfilDexie = async (userId: string) => {
    try {
      return await db.perfiles.get(userId) ?? null;
    } catch {
      return null;
    }
  };

  const fetchPerfil = async (userId: string, userEmail: string) => {
    try {
      // 1️⃣ Dexie primero — mostrar inmediatamente aunque no haya red
      const dexiePerfil = await leerPerfilDexie(userId);
      if (dexiePerfil && mountedRef.current) {
        setPerfil(dexiePerfil);
        setLoading(false);

        // Si el caché es reciente, no hacer fetch a Supabase todavía
        const edad = Date.now() - (dexiePerfil.cached_at ?? 0);
        if (edad < PERFIL_CACHE_TTL_MS) return;
      }

      // 2️⃣ Caché legacy (perfilCache) como fallback adicional
      if (!dexiePerfil) {
        const cached = await getPerfilCached();
        if (cached?.perfil && mountedRef.current) {
          setPerfil(cached.perfil);
          setLoading(false);
        }
      }

      // 3️⃣ Fetch real a Supabase — sobreescribe el caché local con datos frescos
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!mountedRef.current) return;

      if (data) {
        // ✅ Perfil encontrado — guardar en Dexie y actualizar estado
        setPerfil(data);
        setPerfilCached(data);
        await guardarPerfilDexie(data);
      } else if (error?.code === "PGRST116") {
        // PGRST116 = "no rows found" — el perfil realmente no existe, crearlo
        const nombreAuto = userEmail ? userEmail.split("@")[0] : "Usuario";
        const nuevoPerfil = {
          id: userId,
          email: userEmail,
          username: nombreAuto,
          // ✅ Sin rol — el trigger handle_new_user ya lo asigna como 'user'
          status: "Explorador Novato",
        };
        const { error: insertError } = await supabase
          .from("perfiles")
          .insert(nuevoPerfil); // insert, nunca upsert — no pisa datos existentes

        if (!insertError && mountedRef.current) {
          const perfilConRol = { ...nuevoPerfil, rol: "user" };
          setPerfil(perfilConRol);
          setPerfilCached(perfilConRol);
          await guardarPerfilDexie(perfilConRol);
        }
      }
      // Cualquier otro error (red, permisos) no hace nada —
      // se mantiene lo que ya estaba en Dexie
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