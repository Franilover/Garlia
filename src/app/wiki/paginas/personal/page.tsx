"use client";
/**
 * ARCHIVO: app/personal/page.tsx
 * Corregido comparando con la versión funcional anterior.
 */
import Personal from "@/components/paginas/personal/personal";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Page() {
  const { perfil: authPerfil } = useAuth() as { perfil: any };

  // Volvemos a la selección simple que funcionaba, pero incluyendo los nuevos campos
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

  // COMPARACIÓN CRÍTICA: 
  // Forzamos que tanto el nombre de la DB como el de Auth sean idénticos para el filtro
  const perfil = perfiles?.find(
    p => p.username?.toString().toLowerCase().trim() === authPerfil?.username?.toString().toLowerCase().trim()
  );

  if (loading) return <LoadingState mensaje={getMensaje("LOADING", "perfiles")} />;
  
  if (error || !perfil) {
    // Si llegas aquí, imprime en consola para ver qué nombres están llegando realmente
    console.log("Auth User:", authPerfil?.username);
    console.log("DB Users:", perfiles?.map(p => p.username));
    
    return (
      <main className="min-h-screen pt-32 flex flex-col items-center justify-center bg-bg-main px-4">
        <div className="text-primary/50 font-black uppercase text-[10px] tracking-widest text-center">
          "Perfil no encontrado o error de conexión"
        </div>
        <p className="text-[9px] text-primary/20 uppercase font-bold mt-2">
          User: {authPerfil?.username || "No detectado"}
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