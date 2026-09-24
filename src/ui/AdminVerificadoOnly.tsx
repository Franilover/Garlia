"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/providers/AuthProvider";

interface Props {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * AdminVerificadoOnly
 * ───────────────────────────────────────────────────────────────────────────
 * Igual que <AdminOnly> pero más estricto: usa `adminVerificado` (la
 * confirmación real contra el rpc is_admin() en Supabase) en vez de
 * `isAdmin`, que puede venir del caché local (Dexie) y estar desactualizado
 * unos minutos.
 *
 * Mientras `adminVerificado` es `null` (todavía no llegó la respuesta del
 * servidor) se muestra el loader — nunca el contenido. Recién cuando es
 * `true` se renderizan los children; si es `false`, se redirige.
 *
 * Usar para contenido donde un parpadeo "se muestra y después se oculta"
 * con datos viejos de caché no es aceptable (p.ej. la tab "Explicación" de
 * /garlia/universo, pensada exclusivamente para admins).
 */
export const AdminVerificadoOnly = ({ children, redirectTo = "/garlia/universo" }: Props) => {
  const { user, loading, adminVerificado } = useAuth() as {
    user: unknown;
    loading: boolean;
    adminVerificado: boolean | null;
  };
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || adminVerificado === false) {
      router.replace(redirectTo);
    }
  }, [loading, user, adminVerificado, router, redirectTo]);

  // Cualquier estado que no sea "confirmado admin" muestra el loader:
  // sesión cargando, o adminVerificado todavía en null (esperando al
  // servidor). Nunca se renderizan los children antes de tener el true.
  if (loading || !user || adminVerificado !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary/30" size={32} />
      </div>
    );
  }

  return <>{children}</>;
};
