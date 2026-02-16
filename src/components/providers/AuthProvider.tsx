"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/api/client/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  // FunciÃ³n para obtener los datos detallados de la tabla "perfiles"
  const fetchPerfil = async (userId, userEmail) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        // IMPORTANTE: Cargamos todo el objeto (incluyendo el campo 'rol')
        setPerfil(data);
        console.log("Perfil cargado correctamente:", data);
      } else {
        // AUTO-CORRECCIÃN: Si el registro no existe en la tabla "perfiles", lo creamos
        const nombreAuto = userEmail ? userEmail.split('@')[0] : "Usuario";
        
        // Objeto inicial para la base de datos
        const nuevoPerfil = { 
          id: userId, 
          email: userEmail,
          username: nombreAuto, // Usamos 'username' segÃºn tu captura de pantalla
          rol: 'usuario',       // Rol por defecto
          status: 'Explorador Novato'
        };
        
        const { error: insertError } = await supabase
          .from('perfiles')
          .upsert(nuevoPerfil);

        if (!insertError) {
          setPerfil(nuevoPerfil);
        }
      }
    } catch (err) {
      console.error("Error crÃ­tico al cargar perfil:", err);
    }
  };

  useEffect(() => {
    // 1. Verificar sesiÃ³n inicial al cargar la app
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchPerfil(session.user.id, session.user.email);
      }
      setLoading(false);
    };

    // 2. Escuchar cambios en el estado de autenticaciÃ³n (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchPerfil(session.user.id, session.user.email);
      } else {
        setUser(null);
        setPerfil(null);
      }
      setLoading(false);
    });

    getInitialSession();
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, perfil, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);