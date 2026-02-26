"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Loader2, Sword, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Entidad {
  id: string;
  nombre: string;
  tipo: "item" | "criatura" | "personaje";
  subtipo?: string;
  imagen_url?: string;
  descripcion?: string;
}

interface EntidadPickerProps {
  open: boolean;
  onClose: () => void;
  onInsert: (snippet: string) => void;
  tipoFijo?: "item" | "criatura" | "personaje";
}

export function EntidadPicker({ open, onClose, onInsert, tipoFijo }: EntidadPickerProps) {
  const [tab, setTab] = useState<"item" | "criatura" | "personaje">(tipoFijo ?? "item");
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Entidad | null>(null);
  const [palabra, setPalabra] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected(null); setQuery(""); setPalabra("");
    setLoading(true); setError(null);

    fetch(`/api/entidades?tipo=${tipoFijo ?? ""}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error);
        
        // Mapeo de Items (usan imagen_url)
        const items = (d.data?.items ?? []).map((x: any) => ({
          id: x.id, 
          nombre: x.nombre, 
          tipo: "item" as const,
          subtipo: x.categoria || "Objeto",
          imagen_url: x.imagen_url,
          descripcion: x.descripcion
        }));
        
        // Mapeo de Criaturas (usan img_url en DB)
        const criaturas = (d.data?.criaturas ?? []).map((x: any) => ({
          id: x.id, 
          nombre: x.nombre, 
          tipo: "criatura" as const,
          subtipo: x.habitat || "Criatura",
          imagen_url: x.img_url || x.imagen_url, // 🔥 Fallback para ambos nombres
          descripcion: x.descripcion || x.sobre
        }));

        // Mapeo de Personajes (usan img_url en DB)
        const personajes = (d.data?.personajes ?? []).map((x: any) => ({
          id: x.id, 
          nombre: x.nombre, 
          tipo: "personaje" as const,
          subtipo: x.ocupacion || (x.visible ? "Poblador" : "Misterioso"),
          imagen_url: x.img_url || x.imagen_url, // 🔥 Fallback para ambos nombres
          descripcion: x.descripcion || x.sobre
        }));

        setEntidades([...items, ...criaturas, ...personajes]);
      })
      .catch(e => {
        console.error("Error en Picker:", e);
        setError("Error al cargar entidades");
      })
      .finally(() => setLoading(false));
  }, [open, tipoFijo]);

  const lista = entidades
    .filter(e => e.tipo === tab)
    .filter(e => !query || e.nombre.toLowerCase().includes(query.toLowerCase()));

  const handleInsert = () => {
    if (!selected || !palabra.trim()) return;
    const snippet = `[[drop|${palabra.trim()}|${selected.tipo}|${selected.id}|${selected.nombre}]]`;
    onInsert(snippet);
    onClose();
  };

  const getIcon = (tipo: string, size = 14) => {
    if (tipo === "item") return <Package size={size} />;
    if (tipo === "criatura") return <Sword size={size} />;
    return <User size={size} />;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[72] bg-primary-dark/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="fixed z-[73] inset-x-4 bottom-0 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:w-[600px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "85vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary/8 shrink-0">
              <div>
                <h3 className="text-sm font-black text-primary-dark uppercase tracking-tight">Easter Egg — Drop</h3>
                <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest mt-0.5">Vincula una palabra a una entidad</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-primary/6 hover:bg-primary/12 flex items-center justify-center text-primary/50 transition-all"><X size={15} /></button>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Panel izquierdo: Lista */}
              <div className="w-1/2 border-r border-primary/8 flex flex-col">
                <div className="flex border-b border-primary/8 shrink-0">
                  {(["item", "criatura", "personaje"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setSelected(null); }}
                      className={cn(
                        "flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all",
                        tab === t ? "text-primary border-b-2 border-primary" : "text-primary/30 hover:text-primary/60"
                      )}
                    >
                      {getIcon(t, 12)} {t}s
                    </button>
                  ))}
                </div>

                <div className="px-3 py-2 border-b border-primary/8 shrink-0">
                  <div className="flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2">
                    <Search size={13} className="text-primary/30 shrink-0" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..." className="flex-1 bg-transparent text-[11px] font-semibold text-primary-dark outline-none" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto py-1">
                  {loading ? (
                    <div className="flex items-center justify-center h-24 gap-2 text-primary/30"><Loader2 size={14} className="animate-spin" /><span className="text-[10px] font-black uppercase">Cargando…</span></div>
                  ) : error ? (
                    <div className="p-4 text-center text-[9px] text-red-400 font-bold uppercase italic leading-tight">{error}</div>
                  ) : lista.length === 0 ? (
                    <div className="p-8 text-center text-[9px] text-primary/20 font-black uppercase tracking-widest">Sin resultados</div>
                  ) : lista.map(e => (
                    <button key={e.id} onClick={() => setSelected(e)} className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all", selected?.id === e.id ? "bg-primary/10 shadow-inner" : "hover:bg-primary/5")}>
                      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-primary/10 bg-primary/5 flex items-center justify-center">
                        {e.imagen_url ? (
                          <img src={e.imagen_url} className="w-full h-full object-cover" alt={e.nombre} />
                        ) : getIcon(e.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[11px] font-bold truncate", selected?.id === e.id ? "text-primary" : "text-primary-dark")}>{e.nombre}</p>
                        <p className="text-[9px] text-primary/35 uppercase tracking-widest font-black">{e.subtipo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel derecho: Configuración */}
              <div className="w-1/2 flex flex-col overflow-y-auto bg-primary/[0.01]">
                {selected ? (
                  <div className="p-5 flex flex-col gap-5 flex-1">
                    <div className="flex items-center gap-3 p-3 bg-white border border-primary/8 rounded-2xl shadow-sm">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center shrink-0">
                        {selected.imagen_url ? <img src={selected.imagen_url} className="w-full h-full object-cover" alt="" /> : getIcon(selected.tipo, 16)}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-primary uppercase tracking-tight">{selected.nombre}</p>
                        <p className="text-[9px] text-primary/40 uppercase tracking-widest font-black">{selected.tipo}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-1">Palabra en el texto</label>
                      <input 
                        value={palabra} 
                        onChange={e => setPalabra(e.target.value)} 
                        placeholder="Ej: la espada antigua..." 
                        className="w-full px-4 py-3 rounded-xl border border-primary/12 text-sm focus:outline-none focus:border-primary/30 transition-all bg-white shadow-sm" 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-20">
                    {getIcon(tab, 24)}
                    <p className="text-[10px] font-black uppercase mt-2 italic">"Selecciona un {tab}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-primary/8 shrink-0 flex items-center justify-between bg-white">
              <button onClick={onClose} className="text-[10px] font-black uppercase text-primary/40 hover:text-primary/60 transition-colors">Cancelar</button>
              <button onClick={handleInsert} disabled={!selected || !palabra.trim()} className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase bg-primary text-white disabled:opacity-30 shadow-lg shadow-primary/20 transition-all active:scale-95">Insertar Drop</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}