"use client";
import Personal from "@/components/paginas/personal/personal";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Page() {
  const { perfil: authPerfil } = useAuth() as { perfil: any };

  const { data: perfiles, loading, error } = useSupabaseData("perfiles", {
    select: `
      username, 
      status, 
      avatar_url,
      descubrimientos(tipo, entidad_id, fecha_descubrimiento), 
      inventario_usuario(equipado, items(id, nombre, categoria, imagen_url))
    `
  });

  // 1. Buscamos con trim() y toLowerCase() para evitar errores de dedo
  const perfil = perfiles?.find(
    p => p.username?.trim().toLowerCase() === authPerfil?.username?.trim().toLowerCase()
  );

  // Debug: Esto te ayudará a ver por qué no machea en la consola (F12)
  if (!loading && perfiles) {
    console.log("Buscando a:", authPerfil?.username);
    console.log("Lista de perfiles en DB:", perfiles.map(p => p.username));
  }

  if (loading) return <LoadingState mensaje={getMensaje("LOADING", "perfiles")} />;
  
  // 2. Si hay error o no existe el perfil, mostramos el mensaje que te salió
  if (error || !perfil) {
    return (
      <main className="min-h-screen pt-32 flex flex-col items-center justify-center bg-bg-main px-4 gap-4">
        <div className="text-primary/50 font-black uppercase text-[10px] tracking-widest text-center">
          "Perfil no encontrado o error de conexión"
        </div>
        <p className="text-[9px] text-primary/20 uppercase font-bold">
          User logueado: {authPerfil?.username || "Ninguno"}
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