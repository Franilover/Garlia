"use client";
import Personal from "@/components/paginas/personal/personal";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";
import { useAuth } from "@/components/providers/AuthProvider"; // 👈

export default function Page() {
  const { perfil: authPerfil } = useAuth() as { perfil: any }; // 👈 username real

  const { data: perfiles, loading, error } = useSupabaseData("perfiles", {
    select: "username, status, descubrimientos(criaturas(nombre)), inventario_usuario(equipado, items(nombre, categoria))"
  });

  // Usar el username del auth en vez de hardcodear "Franilover"
  const perfil = perfiles?.find(
    p => p.username?.toLowerCase() === authPerfil?.username?.toLowerCase()
  );

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