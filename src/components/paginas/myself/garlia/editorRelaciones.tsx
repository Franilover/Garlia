"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { AnimatePresence } from "framer-motion";
import { MotionDiv } from "@/components/ui/Motion";
import {
  User, Cat, Sword, MapPin, Crown, Plus, Trash2,
  ChevronDown, Loader2, Search, X, ShieldCheck, AlertTriangle,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

type TabId = "personajes" | "criaturas" | "items" | "reinos" | "ciudades";

interface Perfil {
  id: string;
  username: string;
  avatar_url?: string | null;
  rol?: string | null;
}

interface DescRow {
  id: string;
  fecha_descubrimiento?: string | null;
  entidad_id: string;
  nombre: string;
  imagen_url?: string | null;
  extra?: string | null; // habitat / categoria / reino / etc.
}

interface Entidad {
  id: string;
  nombre: string;
  imagen_url?: string | null;
  extra?: string | null;
}

// ── Configuración por tab ─────────────────────────────────────────────────────

const TAB_CONFIG: Record<TabId, {
  label: string;
  icon: React.ReactNode;
  tabla: string;             // tabla de descubrimientos / desbloqueos
  fk: string;               // columna que apunta a la entidad
  entidadTabla: string;     // tabla maestra
  entidadSelect: string;    // columna de nombre en la entidad
  entidadImagen: string;    // columna de imagen en la entidad
  entidadExtra?: string;    // columna extra opcional
  perfilCol: string;        // columna del perfil_id / user_id
  fechaCol: string;         // columna de fecha
  joinAlias: string;        // alias en la query de join
  compositePk?: boolean;    // true si la PK es (perfilCol, fk) en vez de id
}> = {
  personajes: {
    label: "Personajes", icon: <User size={12} />,
    tabla: "descubrimientos_personajes", fk: "personaje_id",
    entidadTabla: "personajes", entidadSelect: "nombre", entidadImagen: "img_url", entidadExtra: "reino",
    perfilCol: "perfil_id", fechaCol: "fecha_descubrimiento", joinAlias: "personajes",
  },
  criaturas: {
    label: "Criaturas", icon: <Cat size={12} />,
    tabla: "descubrimientos_criaturas", fk: "criatura_id",
    entidadTabla: "criaturas", entidadSelect: "nombre", entidadImagen: "imagen_url", entidadExtra: "habitat",
    perfilCol: "perfil_id", fechaCol: "fecha_descubrimiento", joinAlias: "criaturas",
  },
  items: {
    label: "Items", icon: <Sword size={12} />,
    tabla: "descubrimientos_items", fk: "item_id",
    entidadTabla: "items", entidadSelect: "nombre", entidadImagen: "imagen_url", entidadExtra: "categoria",
    perfilCol: "perfil_id", fechaCol: "fecha_descubrimiento", joinAlias: "items",
  },
  reinos: {
    label: "Reinos", icon: <Crown size={12} />,
    tabla: "descubrimientos_reinos", fk: "reino_id",
    entidadTabla: "reinos", entidadSelect: "nombre", entidadImagen: "mapa_url",
    perfilCol: "perfil_id", fechaCol: "fecha_descubrimiento", joinAlias: "reinos",
  },
  ciudades: {
    label: "Ciudades", icon: <MapPin size={12} />,
    tabla: "ciudades_desbloqueadas", fk: "ciudad_id",
    entidadTabla: "ciudades", entidadSelect: "nombre", entidadImagen: "imagen_url",
    perfilCol: "user_id", fechaCol: "desbloqueado_en", joinAlias: "ciudades",
    compositePk: true,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(fecha?: string | null) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AdminDescubrimientos() {
  const [esAdmin, setEsAdmin]           = useState<boolean | null>(null);
  const [perfiles, setPerfiles]         = useState<Perfil[]>([]);
  const [perfilSel, setPerfilSel]       = useState<Perfil | null>(null);
  const [tab, setTab]                   = useState<TabId>("personajes");
  const [descubrimientos, setDescubrimientos] = useState<DescRow[]>([]);
  const [cargando, setCargando]         = useState(false);
  const [eliminando, setEliminando]     = useState<string | null>(null);

  // Modal agregar
  const [showAdd, setShowAdd]           = useState(false);
  const [entidades, setEntidades]       = useState<Entidad[]>([]);
  const [busquedaEnt, setBusquedaEnt]   = useState("");
  const [entidadSel, setEntidadSel]     = useState<Entidad | null>(null);
  const [guardando, setGuardando]       = useState(false);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Verificar admin ───────────────────────────────────────────────────────

  useEffect(() => {
    supabase.rpc("is_admin").then(({ data }) => setEsAdmin(!!data));
  }, []);

  // ── Cargar perfiles ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!esAdmin) return;
    supabase.from("perfiles").select("id, username, avatar_url, rol").order("username")
      .then(({ data }) => { if (data) setPerfiles(data as Perfil[]); });
  }, [esAdmin]);

  // ── Cargar descubrimientos del perfil seleccionado ────────────────────────

  const cargarDesc = useCallback(async () => {
    if (!perfilSel) return;
    setCargando(true);
    const cfg = TAB_CONFIG[tab];

    const idCol = cfg.compositePk ? "" : "id, ";
    const extraCol = cfg.entidadExtra ? `, ${cfg.entidadExtra}` : "";
    const { data, error } = await supabase
      .from(cfg.tabla)
      .select(`${idCol}${cfg.fechaCol}, ${cfg.fk}, ${cfg.joinAlias}:${cfg.fk}(id, ${cfg.entidadSelect}, ${cfg.entidadImagen}${extraCol})`)
      .eq(cfg.perfilCol, perfilSel.id)
      .order(cfg.fechaCol, { ascending: false });

    if (!error && data) {
      setDescubrimientos(data.map((r: any) => {
        const ent = r[cfg.joinAlias];
        return {
          id:                    cfg.compositePk ? r[cfg.fk] : r.id,
          fecha_descubrimiento:  r[cfg.fechaCol],
          entidad_id:            r[cfg.fk],
          nombre:                ent?.[cfg.entidadSelect] ?? "Sin nombre",
          imagen_url:            ent?.[cfg.entidadImagen] ?? null,
          extra:                 cfg.entidadExtra ? ent?.[cfg.entidadExtra] ?? null : null,
        };
      }));
    }
    setCargando(false);
  }, [perfilSel, tab]);

  useEffect(() => { cargarDesc(); }, [cargarDesc]);

  // ── Cargar entidades disponibles para agregar ─────────────────────────────

  useEffect(() => {
    if (!showAdd) return;
    const cfg = TAB_CONFIG[tab];
    const extraCol = cfg.entidadExtra ? `, ${cfg.entidadExtra}` : "";
    supabase.from(cfg.entidadTabla)
      .select(`id, ${cfg.entidadSelect}, ${cfg.entidadImagen}${extraCol}`)
      .order(cfg.entidadSelect)
      .then(({ data }) => {
        if (data) setEntidades(data.map((r: any) => ({
          id:         r.id,
          nombre:     r[cfg.entidadSelect] ?? "Sin nombre",
          imagen_url: r[cfg.entidadImagen] ?? null,
          extra:      cfg.entidadExtra ? r[cfg.entidadExtra] ?? null : null,
        })));
      });
  }, [showAdd, tab]);

  // ── Eliminar ──────────────────────────────────────────────────────────────

  const eliminar = async (row: DescRow) => {
    if (!confirm(`¿Eliminar "${row.nombre}" de los descubrimientos?`)) return;
    setEliminando(row.id);
    const cfg = TAB_CONFIG[tab];
    const query = cfg.compositePk
      ? supabase.from(cfg.tabla).delete().eq(cfg.perfilCol, perfilSel!.id).eq(cfg.fk, row.entidad_id)
      : supabase.from(cfg.tabla).delete().eq("id", row.id);
    const { error } = await query;
    if (error) {
      showToast("Error al eliminar", false);
    } else {
      setDescubrimientos(prev => prev.filter(d => d.id !== row.id));
      showToast("Eliminado correctamente", true);
    }
    setEliminando(null);
  };

  // ── Agregar ───────────────────────────────────────────────────────────────

  const agregar = async () => {
    if (!perfilSel || !entidadSel) return;
    setGuardando(true);
    const cfg = TAB_CONFIG[tab];
    const payload: Record<string, string> = {
      [cfg.perfilCol]: perfilSel.id,
      [cfg.fk]:        entidadSel.id,
    };
    const { error } = await supabase.from(cfg.tabla).insert(payload);
    if (error) {
      showToast(error.message.includes("duplicate") ? "Ya tiene ese descubrimiento" : "Error al guardar", false);
    } else {
      showToast(`"${entidadSel.nombre}" agregado`, true);
      setShowAdd(false);
      setEntidadSel(null);
      setBusquedaEnt("");
      cargarDesc();
    }
    setGuardando(false);
  };

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Guard admin ───────────────────────────────────────────────────────────

  if (esAdmin === null) return (
    <div className="flex items-center justify-center min-h-60">
      <Loader2 size={18} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
    </div>
  );

  if (!esAdmin) return (
    <div className="flex flex-col items-center justify-center min-h-60 gap-3 text-center px-4">
      <div className="w-12 h-12 flex items-center justify-center rounded-full"
        style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)" }}>
        <AlertTriangle size={20} style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }} />
      </div>
      <p className="font-serif italic" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", fontSize: "0.9rem" }}>
        Acceso restringido a administradores
      </p>
    </div>
  );

  // ── Entidades filtradas ───────────────────────────────────────────────────

  const entsFiltradas = entidades.filter(e =>
    e.nombre.toLowerCase().includes(busquedaEnt.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center shrink-0"
          style={{
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)",
            borderRadius: "var(--radius-btn)",
          }}>
          <ShieldCheck size={14} style={{ color: "var(--primary)" }} />
        </div>
        <div>
          <h1 className="font-serif italic leading-tight" style={{ fontSize: "1.35rem", color: "var(--primary)" }}>
            Descubrimientos
          </h1>
          <p className="text-[9px] font-black uppercase tracking-[0.25em]"
            style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
            Panel de administración
          </p>
        </div>
      </div>

      {/* Selector de perfil */}
      <div style={{
        background: "var(--white-custom)",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
      }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <p className="text-[8px] font-black uppercase tracking-[0.25em]"
            style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
            Seleccionar explorador
          </p>
        </div>

        <div className="p-3 flex flex-wrap gap-2">
          {perfiles.map(p => (
            <button
              key={p.id}
              onClick={() => { setPerfilSel(p); setDescubrimientos([]); }}
              className="flex items-center gap-2 px-3 py-2 transition-all"
              style={{
                borderRadius: "var(--radius-btn)",
                border: "1px solid",
                borderColor: perfilSel?.id === p.id
                  ? "color-mix(in srgb, var(--primary) 50%, transparent)"
                  : "color-mix(in srgb, var(--primary) 12%, transparent)",
                background: perfilSel?.id === p.id
                  ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                  : "transparent",
              }}>
              <div className="w-6 h-6 shrink-0 overflow-hidden flex items-center justify-center"
                style={{
                  borderRadius: "2px",
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                }}>
                {p.avatar_url
                  ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-contain" />
                  : <User size={10} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-tight capitalize"
                style={{ color: "var(--primary)" }}>
                {p.username}
              </span>
              {p.rol === "admin" && (
                <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                    borderRadius: "2px",
                    color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                  }}>
                  admin
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Panel de descubrimientos */}
      {perfilSel && (
        <div style={{
          background: "var(--white-custom)",
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
        }}>

          {/* Tabs + botón agregar */}
          <div className="flex items-center gap-0 overflow-x-auto"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
            {(Object.entries(TAB_CONFIG) as [TabId, typeof TAB_CONFIG[TabId]][]).map(([id, cfg]) => (
              <button
                key={id}
                onClick={() => { setTab(id); setDescubrimientos([]); }}
                className="flex items-center gap-1.5 px-4 py-3 shrink-0 transition-all"
                style={{
                  borderBottom: tab === id
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                  color: tab === id
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--primary) 35%, transparent)",
                  fontSize: "9px",
                  fontWeight: 900,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}>
                {cfg.icon}
                {cfg.label}
              </button>
            ))}

            <div className="flex-1" />

            <div className="px-3 py-2 shrink-0">
              <button
                onClick={() => { setShowAdd(true); setEntidadSel(null); setBusquedaEnt(""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
                style={{
                  borderRadius: "var(--radius-btn)",
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 16%, transparent)",
                  color: "var(--primary)",
                  fontSize: "9px",
                  fontWeight: 900,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}>
                <Plus size={10} /> Agregar
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="divide-y" style={{ "--divide-color": "color-mix(in srgb, var(--primary) 6%, transparent)" } as any}>
            {cargando ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={16} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
              </div>
            ) : descubrimientos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <p className="font-serif italic text-[11px]"
                  style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                  Sin {TAB_CONFIG[tab].label.toLowerCase()} descubiertos
                </p>
              </div>
            ) : (
              descubrimientos.map(row => (
                <div key={row.id}
                  className="flex items-center gap-3 px-4 py-3 group transition-colors"
                  style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 2%, transparent)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>

                  {/* Imagen */}
                  <div className="w-9 h-9 shrink-0 overflow-hidden flex items-center justify-center"
                    style={{
                      borderRadius: "var(--radius-btn)",
                      background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                    }}>
                    {row.imagen_url
                      ? <img src={row.imagen_url} alt={row.nombre} className="w-full h-full object-contain" />
                      : TAB_CONFIG[tab].icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-tight capitalize truncate"
                      style={{ color: "var(--primary)" }}>
                      {row.nombre}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {row.extra && (
                        <span className="text-[8px] font-black uppercase tracking-wider truncate"
                          style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                          {row.extra}
                        </span>
                      )}
                      {row.extra && row.fecha_descubrimiento && (
                        <span style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)", fontSize: "8px" }}>·</span>
                      )}
                      <span className="text-[8px] font-black tabular-nums"
                        style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                        {fmt(row.fecha_descubrimiento)}
                      </span>
                    </div>
                  </div>

                  {/* Eliminar */}
                  <button
                    onClick={() => eliminar(row)}
                    disabled={eliminando === row.id}
                    className="opacity-0 group-hover:opacity-100 transition-all w-7 h-7 flex items-center justify-center shrink-0"
                    style={{
                      borderRadius: "var(--radius-btn)",
                      border: "1px solid color-mix(in srgb, #ef4444 25%, transparent)",
                      background: "color-mix(in srgb, #ef4444 6%, transparent)",
                      color: "#ef4444",
                    }}
                    title="Eliminar descubrimiento">
                    {eliminando === row.id
                      ? <Loader2 size={10} className="animate-spin" />
                      : <Trash2 size={10} />}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer con conteo */}
          {!cargando && descubrimientos.length > 0 && (
            <div className="px-4 py-2.5" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
              <p className="text-[8px] font-black uppercase tracking-[0.2em]"
                style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                {descubrimientos.length} {TAB_CONFIG[tab].label.toLowerCase()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Agregar ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <>
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
              className="fixed inset-0 z-40 backdrop-blur-sm"
              style={{ background: "rgba(0,0,0,0.4)" }}
            />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[26rem]"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                boxShadow: "0 20px 60px color-mix(in srgb, var(--primary) 16%, transparent)",
                maxHeight: "80dvh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}>

              {/* Header modal */}
              <div className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <div>
                  <p className="font-serif italic" style={{ fontSize: "1rem", color: "var(--primary)" }}>
                    Agregar {TAB_CONFIG[tab].label.slice(0, -1).toLowerCase()}
                  </p>
                  <p className="text-[8px] font-black uppercase tracking-wider mt-0.5"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                    a {perfilSel?.username}
                  </p>
                </div>
                <button onClick={() => setShowAdd(false)}
                  className="w-7 h-7 flex items-center justify-center transition-opacity hover:opacity-60"
                  style={{ color: "var(--primary)" }}>
                  <X size={13} />
                </button>
              </div>

              {/* Buscador */}
              <div className="px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                <div className="flex items-center gap-2 px-3 py-2"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                    borderRadius: "var(--radius-btn)",
                  }}>
                  <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
                  <input
                    autoFocus
                    value={busquedaEnt}
                    onChange={e => setBusquedaEnt(e.target.value)}
                    placeholder={`Buscar ${TAB_CONFIG[tab].label.toLowerCase()}…`}
                    className="flex-1 bg-transparent outline-none text-[11px] font-black uppercase tracking-tight"
                    style={{ color: "var(--primary)" }}
                  />
                  {busquedaEnt && (
                    <button onClick={() => setBusquedaEnt("")}
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de entidades */}
              <div className="overflow-y-auto flex-1">
                {entsFiltradas.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="font-serif italic text-[10px]"
                      style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                      Sin resultados
                    </p>
                  </div>
                ) : (
                  entsFiltradas.map(e => {
                    const yaTiene = descubrimientos.some(d => d.entidad_id === e.id);
                    const sel = entidadSel?.id === e.id;
                    return (
                      <button
                        key={e.id}
                        disabled={yaTiene}
                        onClick={() => setEntidadSel(sel ? null : e)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                        style={{
                          borderBottom: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)",
                          background: sel
                            ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                            : "transparent",
                          opacity: yaTiene ? 0.35 : 1,
                          cursor: yaTiene ? "not-allowed" : "pointer",
                        }}
                        onMouseEnter={e2 => {
                          if (!yaTiene) (e2.currentTarget as HTMLElement).style.background =
                            sel ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                                : "color-mix(in srgb, var(--primary) 3%, transparent)";
                        }}
                        onMouseLeave={e2 => {
                          (e2.currentTarget as HTMLElement).style.background = sel
                            ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                            : "transparent";
                        }}>

                        <div className="w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center"
                          style={{
                            borderRadius: "var(--radius-btn)",
                            background: "color-mix(in srgb, var(--primary) 7%, transparent)",
                            border: `1px solid ${sel ? "color-mix(in srgb, var(--primary) 30%, transparent)" : "color-mix(in srgb, var(--primary) 10%, transparent)"}`,
                          }}>
                          {e.imagen_url
                            ? <img src={e.imagen_url} alt={e.nombre} className="w-full h-full object-contain" />
                            : TAB_CONFIG[tab].icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-tight capitalize truncate"
                            style={{ color: "var(--primary)" }}>
                            {e.nombre}
                          </p>
                          {e.extra && (
                            <p className="text-[8px] font-black uppercase tracking-wider truncate mt-0.5"
                              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                              {e.extra}
                            </p>
                          )}
                        </div>

                        {yaTiene && (
                          <span className="text-[7px] font-black uppercase tracking-wider shrink-0 px-1.5 py-0.5"
                            style={{
                              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                              borderRadius: "2px",
                              color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                            }}>
                            Ya tiene
                          </span>
                        )}

                        {sel && !yaTiene && (
                          <div className="w-4 h-4 shrink-0 flex items-center justify-center"
                            style={{
                              borderRadius: "50%",
                              background: "var(--primary)",
                            }}>
                            <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                              <path d="M1 3.5L3 5.5L6 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer modal */}
              <div className="px-4 py-3 shrink-0 flex items-center justify-between gap-3"
                style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <p className="text-[8px] font-black uppercase tracking-wider"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  {entidadSel ? `Seleccionado: ${entidadSel.nombre}` : "Ninguno seleccionado"}
                </p>
                <button
                  onClick={agregar}
                  disabled={!entidadSel || guardando}
                  className="flex items-center gap-1.5 px-4 py-2 transition-all"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    background: entidadSel ? "var(--primary)" : "color-mix(in srgb, var(--primary) 12%, transparent)",
                    color: entidadSel ? "var(--white-custom)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    cursor: entidadSel ? "pointer" : "not-allowed",
                  }}>
                  {guardando ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                  Agregar
                </button>
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <MotionDiv
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 flex items-center gap-2"
            style={{
              borderRadius: "var(--radius-btn)",
              background: toast.ok ? "color-mix(in srgb, #16a34a 12%, var(--white-custom))" : "color-mix(in srgb, #ef4444 10%, var(--white-custom))",
              border: `1px solid ${toast.ok ? "color-mix(in srgb, #16a34a 30%, transparent)" : "color-mix(in srgb, #ef4444 25%, transparent)"}`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              whiteSpace: "nowrap",
            }}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: toast.ok ? "#16a34a" : "#ef4444" }}>
              {toast.ok
                ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                : <X size={7} color="white" />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight"
              style={{ color: toast.ok ? "#16a34a" : "#ef4444" }}>
              {toast.msg}
            </span>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}