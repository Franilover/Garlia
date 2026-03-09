"use client";
import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  redirectTo?: string;
}

export const AdminOnly = ({ children, redirectTo = "/personal" }: Props) => {
  // Usar perfil del AuthProvider directamente — ya tiene el rol, sin query extra
  const { user, perfil, loading } = useAuth() as any;
  const router = useRouter();

  const isAdmin = perfil?.rol === "admin";

  useEffect(() => {
    // Solo redirigir cuando auth Y perfil hayan terminado de cargar
    if (!loading && perfil !== null && (!user || !isAdmin)) {
      router.replace(redirectTo);
    }
  }, [loading, user, perfil, isAdmin, router, redirectTo]);

  // Mostrar spinner mientras carga auth o perfil todavía no llegó
  if (loading || perfil === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary/30" size={32} />
      </div>
    );
  }

  // Perfil cargado pero no es admin — spinner mientras redirige
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary/30" size={32} />
      </div>
    );
  }

  return <>{children}</>;
};