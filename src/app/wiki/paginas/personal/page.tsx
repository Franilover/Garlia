"use client";
import Personal from "@/components/paginas/personal/personal";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Page() {
  const { perfil: authPerfil } = useAuth() as { perfil: any };

  // 💡 HE CORREGIDO EL SELECT: 
  // Eliminamos los campos internos de descubrimientos momentáneamente 
  // para verificar qué relación está fallando.
  const { data: perfiles, loading, error } = useSupabaseData("perfiles", {
    select: `
      username, 
      status, 
      avatar_url,
      descubrimientos ( * ),
      inventario_usuario (
        equipado, 
        items ( * )
      )
    `
  });

  const perfil = perfiles?.find(
    p => p.username?.toLowerCase().trim() === authPerfil?.username?.toLowerCase().trim()
  );

  if (loading) return <LoadingState mensaje={getMensaje("LOADING", "perfiles")} />;
  
  if (error || !perfil) {
    console.log("Error detectado:", error); // Esto nos dirá qué columna falla
    return (
      <main className="min-h-screen pt-32 flex flex-col items-center justify-center bg-bg-main px-4">
        <div className="text-primary/50 font-black uppercase text-[10px] tracking-widest text-center">
          "{error ? "Error de Base de Datos" : "Perfil no encontrado"}"
        </div>
        <p className="text-[9px] text-primary/20 uppercase font-bold mt-2">
          User logueado: {authPerfil?.username || "Cargando..."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 flex justify-center bg-bg-main">
      <Personal datos={perfil} />
    </main>
  );
}