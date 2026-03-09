"use client";
import { useAuth } from "@/app/providers/AuthProvider";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  redirectTo?: string; // a dónde redirigir si no es admin (default: "/")
}

export const AdminOnly = ({ children, redirectTo = "/personal" }: Props) => {
  const { user, loading: authLoading } = useAuth() as any;
  const isAdmin = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    // Esperar a que cargue auth antes de redirigir
    if (!authLoading && (!user || !isAdmin)) {
      router.replace(redirectTo);
    }
  }, [authLoading, user, isAdmin, router, redirectTo]);

  // Mientras carga, mostrar spinner
  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary/30" size={32} />
      </div>
    );
  }

  return <>{children}</>;
};