"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/api/client/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = async (userId, userEmail) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setPerfil(data);
        console.log("Perfil cargado:", data);
      } else {
        const nombreAuto = userEmail ? userEmail.split('@')[0] : "Usuario";
        const nuevoPerfil = { 
          id: userId, 
          email: userEmail,
          username: nombreAuto,
          rol: 'user',
          status: 'Explorador Novato'
        };
        
        const { error: insertError } = await supabase
          .from('perfiles')
          .upsert(nuevoPerfil);

        if (!insertError) setPerfil(nuevoPerfil);
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchPerfil(session.user.id, session.user.email);
        } else {
          setUser(null);
          setPerfil(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, perfil, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);