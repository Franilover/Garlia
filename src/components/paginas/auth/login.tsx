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
  const [showPassword, setShowPassword] = useState(false);
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
            data: { display_name: username }
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
          router.push("/");
          router.refresh();
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-brand pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
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