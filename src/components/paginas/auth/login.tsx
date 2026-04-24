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
  const [loadingGoogle, setLoadingGoogle] = useState(false);
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

  const handleGoogleLogin = async () => {
    setMensaje("");
    setLoadingGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // Supabase redirige automáticamente al proveedor, no es necesario hacer nada más aquí
    } catch (err) {
      setMensaje(err.message);
      setLoadingGoogle(false);
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

        {/* Botón de Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loadingGoogle || loading}
          className="w-full flex items-center justify-center gap-3 border border-primary/20 rounded-md py-3 px-4 text-[11px] font-black uppercase tracking-widest text-primary/70 hover:bg-primary/5 hover:border-primary/40 transition-all disabled:opacity-50 mb-6"
        >
          {loadingGoogle ? (
            "Redirigiendo..."
          ) : (
            <>
              {/* Ícono oficial de Google */}
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </>
          )}
        </button>

        {/* Separador */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-primary/10" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30">o</span>
          <div className="flex-1 h-px bg-primary/10" />
        </div>

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
            disabled={loading || loadingGoogle} 
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