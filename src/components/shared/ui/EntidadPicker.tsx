"use client";
// components/shared/ui/EntidadPicker.tsx
// Picker para que el admin elija un item o criatura y genere el snippet [[drop|...]]

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Loader2, Sword, Package, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Entidad {
  id: string;
  nombre: string;
  tipo: "item" | "criatura";
  subtipo?: string; // categoria (item) o tipo (criatura)
  imagen_url?: string;
  descripcion?: string;
}

interface EntidadPickerProps {
  open: boolean;
  onClose: () => void;
  /** Devuelve el snippet listo para insertar en el texto */
  onInsert: (snippet: string) => void;
  /** Si se pasa, limita a solo ese tipo */
  tipoFijo?: "item" | "criatura";
}

export function EntidadPicker({ open, onClose, onInsert, tipoFijo }: EntidadPickerProps) {
  const [tab, setTab] = useState<"item" | "criatura">(tipoFijo ?? "item");
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
        const items: Entidad[] = (d.items ?? []).map((x: any) => ({
          id: x.id, nombre: x.nombre, tipo: "item" as const,
          subtipo: x.categoria, imagen_url: x.imagen_url, descripcion: x.descripcion,
        }));
        const criaturas: Entidad[] = (d.criaturas ?? []).map((x: any) => ({
          id: x.id, nombre: x.nombre, tipo: "criatura" as const,
          subtipo: x.tipo, imagen_url: x.imagen_url, descripcion: x.descripcion,
        }));
        setEntidades([...items, ...criaturas]);
      })
      .catch(e => setError(e.message ?? "Error al cargar"))
      .finally(() => setLoading(false));
  }, [open, tipoFijo]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const lista = entidades
    .filter(e => e.tipo === tab)
    .filter(e => !query || e.nombre.toLowerCase().includes(query.toLowerCase()));

  const handleInsert = () => {
    if (!selected || !palabra.trim()) return;
    // Formato: [[drop|palabra_visible|tipo|id|Nombre Entidad]]
    const snippet = `[[drop|${palabra.trim()}|${selected.tipo}|${selected.id}|${selected.nombre}]]`;
    onInsert(snippet);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[72] bg-primary-dark/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="fixed z-[73] inset-x-4 bottom-0 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:w-[600px] bg-white-custom rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "85vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary/8 shrink-0">
              <div>
                <h3 className="text-sm font-black text-primary-dark uppercase tracking-tight">Easter Egg — Drop</h3>
                <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest mt-0.5">
                  Vincula una palabra a un item o criatura
                </p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-primary/6 hover:bg-primary/12 flex items-center justify-center text-primary/50 transition-all">
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Panel izquierdo — lista */}
              <div className="w-1/2 border-r border-primary/8 flex flex-col">
                {/* Tabs */}
                {!tipoFijo && (
                  <div className="flex border-b border-primary/8 shrink-0">
                    {(["item", "criatura"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => { setTab(t); setSelected(null); }}
                        className={cn(
                          "flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all",
                          tab === t ? "text-primary border-b-2 border-primary" : "text-primary/30 hover:text-primary/60"
                        )}
                      >
                        {t === "item" ? <Package size={12} /> : <Sword size={12} />}
                        {t === "item" ? "Items" : "Criaturas"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Buscador */}
                <div className="px-3 py-2 border-b border-primary/8 shrink-0">
                  <div className="flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2">
                    <Search size={13} className="text-primary/30 shrink-0" />
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Buscar..."
                      className="flex-1 bg-transparent text-[11px] font-semibold text-primary-dark placeholder:text-primary/25 outline-none"
                    />
                  </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto py-1">
                  {loading && (
                    <div className="flex items-center justify-center h-24 gap-2 text-primary/30">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Cargando…</span>
                    </div>
                  )}
                  {error && (
                    <p className="text-[11px] text-red-400 font-bold px-4 py-3">{error}</p>
                  )}
                  {!loading && !error && lista.length === 0 && (
                    <p className="text-[11px] text-primary/25 italic text-center py-8 px-4">
                      {query ? "Sin resultados" : `No hay ${tab === "item" ? "items" : "criaturas"}`}
                    </p>
                  )}
                  {lista.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelected(e)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all",
                        selected?.id === e.id ? "bg-primary/10" : "hover:bg-primary/5"
                      )}
                    >
                      {/* Miniatura */}
                      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-primary/10 bg-primary/5 flex items-center justify-center">
                        {e.imagen_url
                          ? <img src={e.imagen_url} alt={e.nombre} className="w-full h-full object-cover" loading="lazy" />
                          : e.tipo === "item"
                            ? <Package size={14} className="text-primary/30" />
                            : <Sword size={14} className="text-primary/30" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[11px] font-bold truncate", selected?.id === e.id ? "text-primary" : "text-primary-dark")}>{e.nombre}</p>
                        {e.subtipo && <p className="text-[9px] text-primary/35 uppercase tracking-widest font-black">{e.subtipo}</p>}
                      </div>
                      {selected?.id === e.id && <Check size={12} className="text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel derecho — config del drop */}
              <div className="w-1/2 flex flex-col overflow-y-auto">
                {selected ? (
                  <div className="p-5 flex flex-col gap-5 flex-1">
                    {/* Preview entidad seleccionada */}
                    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center shrink-0">
                        {selected.imagen_url
                          ? <img src={selected.imagen_url} alt={selected.nombre} className="w-full h-full object-cover" />
                          : selected.tipo === "item" ? <Package size={16} className="text-primary/40" /> : <Sword size={16} className="text-primary/40" />
                        }
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-primary uppercase tracking-tight">{selected.nombre}</p>
                        <p className="text-[9px] text-primary/40 uppercase tracking-widest font-black">{selected.tipo}{selected.subtipo ? ` · ${selected.subtipo}` : ""}</p>
                      </div>
                    </div>

                    {/* Descripción breve */}
                    {selected.descripcion && (
                      <p className="text-[11px] text-primary/50 italic leading-relaxed font-serif line-clamp-3">
                        "{selected.descripcion}"
                      </p>
                    )}

                    {/* Palabra en el texto */}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1.5">
                        Palabra que activa el drop
                      </label>
                      <input
                        value={palabra}
                        onChange={e => setPalabra(e.target.value)}
                        placeholder="ej: espada, bestia, reliquia…"
                        autoFocus
                        className="w-full px-3 py-2 rounded-xl border border-primary/12 bg-primary/3 text-sm font-serif text-primary-dark focus:outline-none focus:border-primary/30 placeholder:text-primary/20"
                      />
                      <p className="text-[9px] text-primary/25 mt-1.5 leading-relaxed">
                        Esta palabra aparecerá subrayada en el texto. Al hacer click, el lector recibirá <span className="font-bold text-primary/40">{selected.nombre}</span> en su perfil.
                      </p>
                    </div>

                    {/* Preview del snippet */}
                    {palabra.trim() && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1">Snippet resultante</p>
                        <code className="text-[10px] text-primary/50 font-mono break-all bg-primary/5 rounded-lg px-2 py-1.5 block leading-relaxed">
                          {`[[drop|${palabra.trim()}|${selected.tipo}|${selected.id}|${selected.nombre}]]`}
                        </code>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-3">
                      {tab === "item" ? <Package size={24} className="text-primary/20" /> : <Sword size={24} className="text-primary/20" />}
                    </div>
                    <p className="text-[11px] font-bold text-primary/30 uppercase tracking-widest">Selecciona un {tab}</p>
                    <p className="text-[10px] text-primary/20 mt-1">de la lista de la izquierda</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-primary/8 shrink-0 flex items-center justify-between gap-4">
              <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest">
                {selected && palabra.trim() ? `"${palabra}" → ${selected.nombre}` : "Elige entidad y palabra"}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-primary/40 hover:bg-primary/5 transition-all">
                  Cancelar
                </button>
                <button
                  onClick={handleInsert}
                  disabled={!selected || !palabra.trim()}
                  className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-primary text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 hover:bg-primary/80"
                >
                  {tab === "item" ? <Package size={12} /> : <Sword size={12} />} Insertar Drop
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}