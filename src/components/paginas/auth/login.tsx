"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React, { useState } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); 
  const [isRegistering, setIsRegistering] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  
  const labelStyle = "block text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-2 ml-1";

  const handleAuth = async (e) => {
    e.preventDefault();
    setMensaje("");
    setLoading(true);

    try {
      if (isRegistering) {
        
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { 
            data: { display_name: username }, 
            emailRedirectTo: window.location.origin 
          }
        });

        if (error) throw error;

        
        
        if (data.user) {
          const { error: profileError } = await supabase
            .from("perfiles")
            .upsert({ 
              id: data.user.id, 
              username: username, 
              email: email,
              status: "Explorador Novato", 
              rol: "user" 
            });
          
          if (profileError) throw profileError;
          setMensaje("¡Revisa tu correo para confirmar tu cuenta!");
        }
      } else {
        
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setMensaje(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-main px-4">
      <MotionDiv 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md card-main bg-white shadow-2xl p-8 md:p-12"
      >
        <h1 className="text-3xl md:text-4xl font-black italic text-primary uppercase tracking-tighter text-center mb-10">
          {isRegistering ? "Crear Cuenta" : "Iniciar Sesión"}
        </h1>

        <form onSubmit={handleAuth} className="space-y-6">
          <AnimatePresence mode="popLayout">
            {isRegistering && (
              <MotionDiv 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 10 }}
              >
                <label className={labelStyle}>Nombre de Usuario</label>
                <input
                  type="text"
                  placeholder="Tu apodo..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-brand"
                  required
                />
              </MotionDiv>
            )}
          </AnimatePresence>

          <div>
            <label className={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-brand"
              required
            />
          </div>

          <div>
            <label className={labelStyle}>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-brand"
              required
            />
          </div>
          
          <button 
            disabled={loading} 
            className="btn-brand w-full mt-4 uppercase text-xs tracking-widest disabled:opacity-50"
          >
            {loading ? "Procesando..." : isRegistering ? "Registrarse" : "Entrar"}
          </button>
        </form>

        {mensaje && (
          <MotionP 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="mt-6 text-[10px] text-center text-primary font-black uppercase italic border-t border-primary/10 pt-4"
          >
            {mensaje}
          </MotionP>
        )}

        <button 
          onClick={() => { setIsRegistering(!isRegistering); setMensaje(""); }}
          className="w-full mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary transition-all underline decoration-1 underline-offset-8"
        >
          {isRegistering ? "¿Ya tienes cuenta? Entra aquí" : "¿No tienes cuenta? Regístrate"}
        </button>
      </MotionDiv>
    </main>
  );
}