"use client";

import Personal from "@/components/paginas/personal/personal";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Page() {
  const { perfil: authPerfil } = useAuth() as { perfil: any };

  // Query 1: perfil + inventario
  const { data: perfiles, loading: loadingPerfil, error: errorPerfil } = useSupabaseData("perfiles", {
    select: `
      username,
      status,
      inventario_usuario(
        equipado,
        items(id, nombre, categoria)
      )
    `
  });

  // Query 2: descubrimientos por perfil_id directamente (evita el problema de FK)
  const { data: descubrimientos, loading: loadingDesc } = useSupabaseData("descubrimientos", {
    select: `tipo, entidad_id, fecha_descubrimiento`,
    filters: authPerfil?.id ? { perfil_id: authPerfil.id } : undefined,
  });

  const perfil = perfiles?.find(
    p => p.username?.toLowerCase().trim() === authPerfil?.username?.toLowerCase().trim()
  );

  if (loadingPerfil || loadingDesc) return <LoadingState mensaje={getMensaje("LOADING", "perfiles")} />;

  if (errorPerfil || !perfil) {
    console.error("Detalle del error:", errorPerfil);
    return (
      <main className="min-h-screen pt-32 flex flex-col items-center justify-center bg-bg-main px-4 gap-4">
        <div className="text-primary/50 font-black uppercase text-[10px] tracking-widest text-center">
          "{errorPerfil ? "Error de Esquema en DB" : "Perfil no encontrado"}"
        </div>
        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
          <p className="text-[9px] text-red-400 font-mono break-all text-center">
            {errorPerfil || "Perfil no encontrado"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 flex justify-center bg-bg-main">
      <Personal datos={{ ...perfil, descubrimientos: descubrimientos ?? [] }} />
    </main>
  );
}