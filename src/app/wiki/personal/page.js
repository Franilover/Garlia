import Personal from "@/components/features/personal";
import { supabase } from '@/lib/api/supabase';

// Esto asegura que los cambios en Supabase se vean al instante
export const revalidate = 0;

export default async function Page() {
  
  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select(`
      username,
      status,
      descubrimientos ( 
        criaturas ( 
          nombre 
        ) 
      ),
      inventario_usuario ( 
        equipado, 
        items ( 
          nombre, 
          tipo 
        ) 
      )
    `)
    .eq('username', 'Franilover')
    .single();

  if (error) {
    return (
      <main className="min-h-screen pt-32 flex justify-center bg-bg-main">
        <div className="text-[#6B5E70]/50 font-black uppercase text-[10px] tracking-widest">
          Error de conexiÃ³n: {error.message}
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