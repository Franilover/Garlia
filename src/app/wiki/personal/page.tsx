"use client";
/**
 * ARCHIVO: app/wiki/personal/page.tsx
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sword, Package, Star, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { LoadingState } from "@/shared/feedback/StateComponents";
import { getMensaje } from "@/lib/config/constants";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/api/client/supabase";

interface Descubrimiento {
  tipo: "item" | "criatura" | "personaje";
  entidad_id: string;
  fecha_descubrimiento: string;
  nombre?: string;
}

interface ItemInventario {
  equipado: boolean;
  items: { id: string; nombre: string; categoria: string; imagen_url?: string };
}

interface DatosPerfil {
  username: string;
  status: string;
  avatar_url?: string;
  descubrimientos?: Descubrimiento[];
  inventario_usuario?: ItemInventario[];
}

// ── COMPONENTE VISUAL ────────────────────────────────────────────────────────
function Personal({ datos }: { datos: DatosPerfil }) {
  const [tab, setTab] = useState<"items" | "criaturas" | "personajes">("items");
  const { descubrimientos = [], inventario_usuario = [] } = datos;

  const misPersonajes = descubrimientos.filter(d => d.tipo === "personaje");
  const misCriaturas  = descubrimientos.filter(d => d.tipo === "criatura");

  const tabs = [
    { id: "items",      label: "Inventario", icon: Package },
    { id: "criaturas",  label: "Bestiario",  icon: Sword   },
    { id: "personajes", label: "Relaciones",     icon: User    },
  ] as const;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-linear-to-b from-[#6B5E70]/20 to-[#6B5E70]/5 border-2 border-[#6B5E70]/10 flex items-center justify-center overflow-hidden">
            {datos.avatar_url
              ? <img src={datos.avatar_url} alt={datos.username} className="w-full h-full object-cover" />
              : <User size={40} className="text-[#6B5E70]/20" />}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white border border-[#6B5E70]/10 p-1.5 rounded-full shadow-sm">
            <Star size={12} className="text-amber-400 fill-amber-400" />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-[#6B5E70] uppercase tracking-tighter">"{datos.username}"</h1>
          <p className="text-[10px] font-black text-[#6B5E70]/40 uppercase tracking-[0.3em]">"{datos.status || "Explorador de Franilover"}"</p>
        </div>
      </section>

      <nav className="flex justify-center gap-2 border-b border-[#6B5E70]/5 pb-4">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300",
              tab === t.id ? "bg-[#6B5E70] text-white shadow-lg shadow-[#6B5E70]/20 scale-105" : "text-[#6B5E70]/40 hover:bg-[#6B5E70]/5")}>
            <t.icon size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="min-h-75">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {tab === "items" && inventario_usuario.map((item, i) => (
              <div key={i} className="group p-4 rounded-2xl bg-white border border-[#6B5E70]/5 flex items-center gap-4 hover:border-[#6B5E70]/20 transition-all">
                <div className="w-12 h-12 bg-[#6B5E70]/5 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Package size={20} className="text-[#6B5E70]/30" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black text-[#6B5E70] uppercase tracking-tight">{item.items.nombre}</p>
                  <p className="text-[9px] text-[#6B5E70]/30 font-black uppercase">{item.items.categoria}</p>
                </div>
                {item.equipado && <ShieldCheck size={14} className="text-blue-400" />}
              </div>
            ))}

            {(tab === "criaturas" || tab === "personajes") && (() => {
              const lista = tab === "criaturas" ? misCriaturas : misPersonajes;
              if (lista.length === 0) return (
                <div className="col-span-full py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[#6B5E70]/20 italic">
                  "Sin registros en esta categoría"
                </div>
              );
              return lista.map((d, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white border border-[#6B5E70]/5 flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    tab === "criaturas" ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500")}>
                    {tab === "criaturas" ? <Sword size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-[#6B5E70] uppercase tracking-tight">
                      {d.nombre ?? "—"}
                    </p>
                    <p className="text-[9px] text-[#6B5E70]/30 font-black uppercase">
                      Visto el {new Date(d.fecha_descubrimiento).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ));
            })()}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── PAGE ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const { perfil: authPerfil } = useAuth() as { perfil: any };

  const [descubrimientosEnriquecidos, setDescubrimientosEnriquecidos] = useState<Descubrimiento[]>([]);
  const [loadingDesc, setLoadingDesc] = useState(true);

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

  const perfil = perfiles?.find(
    p => p.username?.toLowerCase().trim() === authPerfil?.username?.toLowerCase().trim()
  );

  // Cargar descubrimientos + enriquecer con nombre según tipo
  useEffect(() => {
    if (!authPerfil?.id) return;

    const cargar = async () => {
      setLoadingDesc(true);
      try {
        // 1. Traer descubrimientos del perfil
        const { data: desc } = await supabase
          .from("descubrimientos")
          .select("tipo, entidad_id, fecha_descubrimiento")
          .eq("perfil_id", authPerfil.id);

        if (!desc || desc.length === 0) {
          setDescubrimientosEnriquecidos([]);
          return;
        }

        // 2. Agrupar IDs por tipo
        const idsCriaturas  = desc.filter(d => d.tipo === "criatura").map(d => d.entidad_id);
        const idsItems       = desc.filter(d => d.tipo === "item").map(d => d.entidad_id);
        const idsPersonajes  = desc.filter(d => d.tipo === "personaje").map(d => d.entidad_id);

        // 3. Consultar nombres en paralelo (solo las tablas necesarias)
        const [criaturas, items, personajes] = await Promise.all([
          idsCriaturas.length
            ? supabase.from("criaturas").select("id, nombre").in("id", idsCriaturas)
            : Promise.resolve({ data: [] }),
          idsItems.length
            ? supabase.from("items").select("id, nombre").in("id", idsItems)
            : Promise.resolve({ data: [] }),
          idsPersonajes.length
            ? supabase.from("personajes").select("id, nombre").in("id", idsPersonajes)
            : Promise.resolve({ data: [] }),
        ]);

        // 4. Construir mapa UUID/id -> nombre
        const mapa: Record<string, string> = {};
        [...(criaturas.data ?? []), ...(items.data ?? []), ...(personajes.data ?? [])].forEach(
          (e: any) => { if (e.id && e.nombre) mapa[String(e.id)] = e.nombre; }
        );

        // 5. Enriquecer
        setDescubrimientosEnriquecidos(
          desc.map(d => ({ ...d, nombre: mapa[String(d.entidad_id)] ?? undefined }))
        );
      } catch (err) {
        console.error("Error cargando descubrimientos:", err);
      } finally {
        setLoadingDesc(false);
      }
    };

    cargar();
  }, [authPerfil?.id]);

  if (loadingPerfil || loadingDesc)
    return <LoadingState mensaje={getMensaje("LOADING", "perfiles")} />;

  if (errorPerfil || !perfil) {
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

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 flex justify-center bg-bg-main">
      <Personal datos={{ ...perfil, descubrimientos: descubrimientosEnriquecidos }} />
    </main>
  );
}