"use client";
/**
 * ESTA ES LA PÁGINA (EL CONTENEDOR)
 * Ubicación: app/personal/page.tsx
 */
import Personal from "@/components/paginas/personal/personal";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Page() {
  const { perfil: authPerfil } = useAuth() as { perfil: any };

  // Pedimos los datos a Supabase de forma organizada
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
        items(id, nombre, categoria, imagen_url)
      )
    `
  });

  // Buscamos el perfil del usuario que tiene la sesión iniciada
  const perfil = perfiles?.find(
    p => p.username?.toLowerCase() === authPerfil?.username?.toLowerCase()
  );

  if (loading) return <LoadingState mensaje={getMensaje("LOADING", "perfiles")} />;
  
  if (error || !perfil) {
    return (
      <main className="min-h-screen pt-32 flex justify-center bg-bg-main px-4">
        <div className="text-primary/50 font-black uppercase text-[10px] tracking-widest text-center">
          "Perfil no encontrado o error de conexión"
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 flex justify-center bg-bg-main">
      {/* Aquí le pasamos TODO el objeto "perfil" al componente visual.
         El componente "Personal" recibirá estos datos como "props".
      */}
      <Personal datos={perfil} />
    </main>
  );
}