"use client";
/**
 * ARCHIVO: app/personal/page.tsx
 * Versión ultra-segura para saltar errores de columnas inexistentes.
 */
import Personal from "@/components/paginas/personal/personal";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Page() {
  const { perfil: authPerfil } = useAuth() as { perfil: any };

  // 💡 HE QUITADO avatar_url PORQUE LA DB DICE QUE NO EXISTE
  const { data: perfiles, loading, error } = useSupabaseData("perfiles", {
    select: `
      username, 
      status, 
      inventario_usuario(
        equipado, 
        items(id, nombre, categoria)
      )
    `
  });

  const perfil = perfiles?.find(
    p => p.username?.toLowerCase().trim() === authPerfil?.username?.toLowerCase().trim()
  );

  if (loading) return <LoadingState mensaje={getMensaje("LOADING", "perfiles")} />;
  
  // Si hay error de columna, lo veremos aquí
  if (error || !perfil) {
    console.error("Detalle del error:", error);
    return (
      <main className="min-h-screen pt-32 flex flex-col items-center justify-center bg-bg-main px-4 gap-4">
        <div className="text-primary/50 font-black uppercase text-[10px] tracking-widest text-center">
          "{error ? "Error de Esquema en DB" : "Perfil no encontrado"}"
        </div>
        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
            <p className="text-[9px] text-red-400 font-mono break-all text-center">
                {error || "Verifica que la columna 'avatar_url' exista en Supabase"}
            </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 flex justify-center bg-bg-main">
      <Personal datos={perfil} />
    </main>
  );
}