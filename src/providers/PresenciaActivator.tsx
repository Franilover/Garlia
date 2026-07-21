"use client";

/**
 * PresenciaActivator.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Se monta una sola vez en el layout raíz. Mientras haya sesión activa,
 * mantiene al usuario "en línea" en el canal de presencia global. No
 * renderiza nada visible — es análogo a <OfflineSyncActivator />.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from "react";

import { conectarPresencia } from "@/lib/api/client/presenceEngine";
import { useAuth } from "@/providers/AuthProvider";

export function PresenciaActivator() {
  const { user } = useAuth() as { user: any };

  useEffect(() => {
    if (!user) return;
    const desconectar = conectarPresencia(user.id);
    return desconectar;
  }, [user?.id]);

  return null;
}
