"use client";

import Personal from "@/components/features/personal";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";

export default function Page() {
  // Traemos la data usando el hook unificado
  const { 
    data: perfiles, 
    loading, 
    error 
  } = useSupabaseData("perfiles", {
    select: `
      username,
      status,
      descubrimientos ( 
        criaturas ( nombre ) 
      ),
      inventario_usuario ( 
        equipado, 
        items ( 
          nombre, 
          categoria 
        ) 
      )
    `
  });

  // Buscamos al usuario específico
  const perfil = perfiles?.find(p => p.username === "Franilover");

  if (loading) {
    return <LoadingState mensaje={getMensaje("LOADING", "perfiles")} />;
  }

  // Si hay error de Supabase o el perfil no existe en la lista
  if (error || !perfil) {
    return (
      <main className="min-h-screen pt-32 flex justify-center bg-bg-main">
        <div className="text-[#6B5E70]/50 font-black uppercase text-[10px] tracking-widest">
          "Error de conexión: {error?.message || "Perfil no encontrado"}"
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