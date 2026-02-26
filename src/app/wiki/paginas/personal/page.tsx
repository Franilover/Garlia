"use client";
import Personal from "@/components/paginas/personal/personal";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Page() {
  const { perfil: authPerfil } = useAuth() as { perfil: any };

  /**
   * ACTUALIZACIÓN DE QUERY:
   * Ahora traemos 'descubrimientos' filtrando por tipo.
   * Traemos los datos de la tabla 'personajes' que antes no existía aquí.
   */
  const { data: perfiles, loading, error } = useSupabaseData("perfiles", {
    select: `
      username, 
      status, 
      avatar_url,
      descubrimientos(
        tipo,
        entidad_id,
        fecha_descubrimiento
      ), 
      inventario_usuario(
        equipado, 
        items(nombre, categoria, imagen_url)
      )
    `
  });

  // Buscamos el perfil del usuario actual
  const perfil = perfiles?.find(
    p => p.username?.toLowerCase() === authPerfil?.username?.toLowerCase()
  );

  // SEGURIDAD: Solo Franilover puede ver el contenido (según tus instrucciones)
  if (authPerfil?.username?.toLowerCase() !== "franilover") {
    return (
      <main className="min-h-screen pt-32 flex flex-col items-center justify-center bg-bg-main px-6 text-center">
        <div className="w-16 h-16 mb-6 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
           <span className="text-red-400">🔒</span>
        </div>
        <p className="text-primary/40 font-black uppercase text-[10px] tracking-widest leading-relaxed">
          "Acceso Restringido: Solo Franilover puede ver este contenido"
        </p>
      </main>
    );
  }

  if (loading) return <LoadingState mensaje={getMensaje("LOADING", "perfiles")} />;
  
  if (error || !perfil) {
    return (
      <main className="min-h-screen pt-32 flex justify-center bg-bg-main">
        <div className="text-primary/50 font-black uppercase text-[10px] tracking-widest">
          "Error de conexión: {error || "Perfil no encontrado"}"
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