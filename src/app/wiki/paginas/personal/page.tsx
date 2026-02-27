"use client";
/**
 * ARCHIVO: app/wiki/paginas/personal/page.tsx
 */
import Personal from "@/components/paginas/personal/personal";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffect, useState } from "react";

export default function Page() {
  const { perfil: authPerfil } = useAuth() as { perfil: any };

  // Mapa de entidades { uuid -> nombre } cargado desde la API
  const [entidades, setEntidades] = useState<Record<string, string>>({});
  const [loadingEntidades, setLoadingEntidades] = useState(true);

  useEffect(() => {
    fetch("/api/entidades")
      .then(r => r.json())
      .then(({ data }) => {
        const mapa: Record<string, string> = {};
        [...(data?.items ?? []), ...(data?.criaturas ?? []), ...(data?.personajes ?? [])].forEach(
          (e: any) => { if (e.id && e.nombre) mapa[e.id] = e.nombre; }
        );
        setEntidades(mapa);
      })
      .catch(() => {})
      .finally(() => setLoadingEntidades(false));
  }, []);

  // Query 1: perfil + inventario
  const { data: perfiles, loading: loadingPerfil, error: errorPerfil } = useSupabaseData("perfiles", {
    select: `
      username,
      status,
      inventario_usuario(
        equipado,
        items(id, nombre, categoria)
      )
    `
  });

  // Query 2: descubrimientos por perfil_id directamente
  const { data: descubrimientos, loading: loadingDesc } = useSupabaseData("descubrimientos", {
    select: `tipo, entidad_id, fecha_descubrimiento`,
    filters: authPerfil?.id ? { perfil_id: authPerfil.id } : undefined,
  });

  const perfil = perfiles?.find(
    p => p.username?.toLowerCase().trim() === authPerfil?.username?.toLowerCase().trim()
  );

  if (loadingPerfil || loadingDesc || loadingEntidades)
    return <LoadingState mensaje={getMensaje("LOADING", "perfiles")} />;

  if (errorPerfil || !perfil) {
    console.error("Detalle del error:", errorPerfil);
    return (
      <main className="min-h-screen pt-32 flex flex-col items-center justify-center bg-bg-main px-4 gap-4">
        <div className="text-primary/50 font-black uppercase text-[10px] tracking-widest text-center">
          "{errorPerfil ? "Error de Esquema en DB" : "Perfil no encontrado"}"
        </div>
        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
          <p className="text-[9px] text-red-400 font-mono break-all text-center">
            {errorPerfil || "Perfil no encontrado"}
          </p>
        </div>
      </main>
    );
  }

  // Enriquecer descubrimientos con el nombre de la entidad
  const descubrimientosConNombre = (descubrimientos ?? []).map((d: any) => ({
    ...d,
    nombre: entidades[d.entidad_id] ?? undefined,
  }));

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 flex justify-center bg-bg-main">
      <Personal datos={{ ...perfil, descubrimientos: descubrimientosConNombre }} />
    </main>
  );
}