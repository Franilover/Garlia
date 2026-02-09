"use client";

import Personal from "@/components/features/personal";
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from '@/lib/config/constants';

export default function Page() {
  // Utilizamos tu hook unificado
  // IMPORTANTE: Para que esto funcione, en tu archivo de configuración de tablas 
  // o en el hook, la query de 'perfiles' debe incluir 'categoria' en lugar de 'tipo'.
  const { 
    data: perfiles, 
    loading, 
    error 
  } = useSupabaseData('perfiles', {
    // Si tu hook permite pasar una query personalizada o filtros:
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

  // Buscamos al usuario específico dentro de la data devuelta por el hook
  const perfil = perfiles?.find(p => p.username === "Franilover");

  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'perfil')} />;
  }

  if (error || !perfil) {
    return (
      <main className="min-h-screen pt-32 flex justify-center bg-bg-main">
        <div className="text-[#6B5E70]/50 font-black uppercase text-[10px] tracking-widest">
          "Error de conexión: {error?.message || 'Perfil no encontrado'}"
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