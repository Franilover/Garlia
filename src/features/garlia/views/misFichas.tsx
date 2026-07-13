"use client";

/**
 * MisFichas
 * ───────────────────────────────────────────────────────────────────────────
 * /garlia/personal/identidades — cualquier usuario con cuenta puede crear varias
 * fichas de personaje jugable estilo D&D (raza, clase, nivel, stats, HP,
 * CA, inventario) y elegir cuál está usando activamente. Son
 * "sub-identidades": no reemplazan el perfil de usuario, son personajes
 * jugables que el DM puede luego buscar y agregar a sus Aventuras.
 */

import { AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Heart,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { Text } from "@/components/ui/Tipografia";
import { useAuth } from "@/providers/AuthProvider";

import {
  statMod,
  useFichasDnd,
  useInventarioFicha,
  type FichaDnd,
  type NuevaFicha,
} from "../hooks/useFichasDnd";

const STATS: { key: keyof Pick<FichaDnd, "fuerza" | "destreza" | "constitucion" | "inteligencia" | "sabiduria" | "carisma">; label: string }[] = [
  { key: "fuerza", label: "FUE" },
  { key: "destreza", label: "DES" },
  { key: "constitucion", label: "CON" },
  { key: "inteligencia", label: "INT" },
  { key: "sabiduria", label: "SAB" },
  { key: "carisma", label: "CAR" },
];

function fmtMod(score: number): string {
  const m = statMod(score);
  return m >= 0 ? `+${m}` : `${m}`;
}

export default function MisFichas() {
  const { perfil, loading: authLoading } = useAuth();
  const { fichas, activa, loading, crear, actualizar, eliminar, elegirActiva } = useFichasDnd(
    perfil?.id ?? null,
  );
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const fichaSeleccionada = fichas.find((f) => f.id === seleccion) ?? null;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "60svh" }}>
        <Loader2 className="animate-spin text-primary/30" size={22} />
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 gap-2" style={{ minHeight: "60svh" }}>
        <Sparkles className="text-primary/20 mb-2" size={28} />
        <Text as="p" variant="md" className="text-primary/50">
          Inicia sesión para crear tus fichas de personaje.
        </Text>
      </div>
    );
  }

  if (fichaSeleccionada) {
    return (
      <FichaDetalle
        ficha={fichaSeleccionada}
        esActiva={fichaSeleccionada.activa}
        onVolver={() => setSeleccion(null)}
        onActualizar={actualizar}
        onEliminar={async (id) => {
          await eliminar(id);
          setSeleccion(null);
        }}
        onElegirActiva={elegirActiva}
      />
    );
  }

  return (
    <div className="flex flex-col p-4 md:p-8 gap-6" style={{ minHeight: "calc(100svh - 64px)" }}>
      <MotionDiv
        animate={{ opacity: 1, y: 0 }}
        className="text-center shrink-0 relative"
        initial={{ opacity: 0, y: -20 }}
      >
        <Link
          href="/garlia/personal"
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-primary/40 hover:text-primary/70 transition-colors"
        >
          <ArrowLeft size={14} />
          Mi Cuenta
        </Link>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Swords className="text-primary/50" size={18} />
          <Text as="span" variant="cap">
            Sub-identidades
          </Text>
        </div>
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-primary italic">
          Mis Fichas
        </h1>
        {activa && (
          <p className="mt-2 text-xs text-primary/40">
            Ahora mismo estás jugando como <strong className="text-primary/70">{activa.nombre}</strong>
          </p>
        )}
      </MotionDiv>

      <div className="flex-1 max-w-3xl w-full mx-auto">
        {loading && fichas.length === 0 ? (
          <div className="py-24 flex items-center justify-center text-primary/30">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {fichas.map((f, i) => (
              <MotionDiv
                key={f.id}
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 12 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
              >
                <button
                  type="button"
                  onClick={() => setSeleccion(f.id)}
                  className="group relative w-full flex flex-col text-left overflow-hidden rounded-2xl border transition-all"
                  style={{
                    background: "var(--white-custom)",
                    borderColor: f.activa
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 10%, transparent)",
                  }}
                >
                  {f.activa && (
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white text-micro font-black uppercase">
                      <Check size={9} /> Activa
                    </div>
                  )}
                  <div className="w-full h-28 shrink-0 relative bg-primary/5">
                    {f.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.imagen_url} alt={f.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Swords size={22} className="text-primary/15" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-serif italic text-lg text-primary truncate">{f.nombre}</h3>
                    <span className="text-micro font-bold uppercase tracking-wide text-primary/40">
                      {[f.raza, f.clase, `Nv. ${f.nivel}`].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </button>
              </MotionDiv>
            ))}

            <MotionDiv
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 12 }}
              transition={{ delay: Math.min(fichas.length * 0.05, 0.3) }}
            >
              <button
                type="button"
                onClick={() => setCreando(true)}
                className="w-full h-full min-h-[168px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
              >
                <Plus size={20} className="text-primary/30" />
                <span className="text-xs font-bold text-primary/40">Nueva ficha</span>
              </button>
            </MotionDiv>
          </div>
        )}
      </div>

      <AnimatePresence>
        {creando && (
          <ModalCrearFicha
            onClose={() => setCreando(false)}
            onCrear={async (datos) => {
              const nueva = await crear(datos);
              setCreando(false);
              setSeleccion(nueva.id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Modal crear ficha ────────────────────────────────────────────────────

function ModalCrearFicha({
  onClose,
  onCrear,
}: {
  onClose: () => void;
  onCrear: (datos: NuevaFicha) => Promise<void>;
}) {
  const [nombre, setNombre] = useState("");
  const [raza, setRaza] = useState("");
  const [clase, setClase] = useState("");
  const [guardando, setGuardando] = useState(false);

  const handleCrear = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      await onCrear({ nombre: nombre.trim(), raza: raza.trim() || null, clase: clase.trim() || null });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <MotionDiv
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <MotionDiv
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm rounded-2xl p-6"
        exit={{ opacity: 0, scale: 0.96 }}
        initial={{ opacity: 0, scale: 0.96 }}
        style={{ background: "var(--white-custom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <X size={14} className="text-primary/60" />
        </button>

        <h2 className="font-serif italic text-xl text-primary mb-4">Nueva ficha</h2>

        <div className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del personaje"
            className="h-10 px-3 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-sm text-primary/80 placeholder:text-primary/30 focus:border-primary/30 transition-colors"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={raza}
              onChange={(e) => setRaza(e.target.value)}
              placeholder="Raza (ej. Elfo)"
              className="flex-1 h-10 px-3 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-sm text-primary/80 placeholder:text-primary/30 focus:border-primary/30 transition-colors"
            />
            <input
              type="text"
              value={clase}
              onChange={(e) => setClase(e.target.value)}
              placeholder="Clase (ej. Pícaro)"
              className="flex-1 h-10 px-3 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-sm text-primary/80 placeholder:text-primary/30 focus:border-primary/30 transition-colors"
            />
          </div>
          <button
            type="button"
            disabled={!nombre.trim() || guardando}
            onClick={handleCrear}
            className="h-10 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-40 transition-opacity"
          >
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Crear ficha
          </button>
          <p className="text-micro text-primary/30 text-center">
            Podrás completar raza, stats e inventario después.
          </p>
        </div>
      </MotionDiv>
    </MotionDiv>
  );
}

// ── Detalle / edición de una ficha ───────────────────────────────────────

function FichaDetalle({
  ficha,
  esActiva,
  onVolver,
  onActualizar,
  onEliminar,
  onElegirActiva,
}: {
  ficha: FichaDnd;
  esActiva: boolean;
  onVolver: () => void;
  onActualizar: (id: string, cambios: Partial<FichaDnd>) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
  onElegirActiva: (id: string) => Promise<void>;
}) {
  const { items, agregar, quitar, toggleEquipado } = useInventarioFicha(ficha.id);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<Partial<FichaDnd>>(ficha);
  const [guardando, setGuardando] = useState(false);
  const [nuevoItem, setNuevoItem] = useState("");

  const guardar = async () => {
    setGuardando(true);
    try {
      await onActualizar(ficha.id, borrador);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  };

  const campo = (key: keyof FichaDnd, placeholder: string, tipo: "text" | "number" = "text") => (
    <input
      type={tipo}
      value={(borrador[key] as any) ?? ""}
      onChange={(e) =>
        setBorrador((prev) => ({
          ...prev,
          [key]: tipo === "number" ? Number(e.target.value) : e.target.value,
        }))
      }
      placeholder={placeholder}
      className="h-9 px-2.5 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-xs text-primary/80 placeholder:text-primary/30 focus:border-primary/30 transition-colors w-full"
    />
  );

  return (
    <div className="flex flex-col p-4 md:p-8 gap-6 max-w-2xl mx-auto" style={{ minHeight: "calc(100svh - 64px)" }}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVolver}
          className="flex items-center gap-1.5 text-xs font-bold text-primary/40 hover:text-primary/70 transition-colors"
        >
          <ArrowLeft size={14} />
          Mis fichas
        </button>
        <div className="flex-1" />
        {!esActiva && (
          <button
            type="button"
            onClick={() => onElegirActiva(ficha.id)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 text-primary text-micro font-bold uppercase tracking-wide hover:bg-primary/15 transition-colors"
          >
            <Check size={12} /> Usar esta ficha
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm(`¿Eliminar a ${ficha.nombre}? Esto no se puede deshacer.`)) {
              onEliminar(ficha.id);
            }
          }}
          className="p-2 rounded-lg text-primary/30 hover:bg-red-500/10 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-primary/5 relative">
          {ficha.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ficha.imagen_url} alt={ficha.nombre} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Swords size={22} className="text-primary/15" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {editando ? (
            campo("nombre", "Nombre")
          ) : (
            <h1 className="font-serif italic text-2xl text-primary">{ficha.nombre}</h1>
          )}
          <span className="text-xs font-bold uppercase tracking-wide text-primary/40">
            {[ficha.raza, ficha.clase, `Nivel ${ficha.nivel}`].filter(Boolean).join(" · ")}
          </span>
          {esActiva && (
            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white text-micro font-black uppercase">
              <Check size={9} /> Activa ahora
            </div>
          )}
        </div>
      </div>

      {/* ── Vitales ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <VitalCard icon={<Heart size={14} />} label="HP" value={`${ficha.hp_actual}/${ficha.hp_max}`} />
        <VitalCard icon={<Shield size={14} />} label="CA" value={String(ficha.ca)} />
        <VitalCard icon={<Sparkles size={14} />} label="Velocidad" value={`${ficha.velocidad} ft`} />
      </div>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {STATS.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl border border-primary/10 bg-primary/[0.02]"
          >
            <span className="text-micro font-black uppercase tracking-widest text-primary/35">
              {label}
            </span>
            {editando ? (
              <input
                type="number"
                value={(borrador[key] as number) ?? 10}
                onChange={(e) =>
                  setBorrador((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                }
                className="w-12 text-center bg-transparent outline-none text-lg font-black text-primary"
              />
            ) : (
              <span className="text-lg font-black text-primary">{ficha[key]}</span>
            )}
            <span className="text-micro text-primary/30">{fmtMod(ficha[key])}</span>
          </div>
        ))}
      </div>

      {/* ── Edición de datos base ───────────────────────────────────── */}
      {editando && (
        <div className="grid grid-cols-2 gap-2">
          {campo("raza", "Raza")}
          {campo("clase", "Clase")}
          {campo("nivel", "Nivel", "number")}
          {campo("alineamiento", "Alineamiento")}
          {campo("hp_max", "HP máximo", "number")}
          {campo("hp_actual", "HP actual", "number")}
          {campo("ca", "Clase de armadura", "number")}
          {campo("velocidad", "Velocidad", "number")}
          {campo("imagen_url", "URL de imagen")}
        </div>
      )}

      {/* ── Trasfondo / notas ────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-primary/50 mb-2">
          Trasfondo
        </h3>
        {editando ? (
          <textarea
            value={borrador.trasfondo ?? ""}
            onChange={(e) => setBorrador((prev) => ({ ...prev, trasfondo: e.target.value }))}
            placeholder="Historia, personalidad, motivaciones…"
            rows={4}
            className="w-full p-3 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-sm text-primary/80 placeholder:text-primary/30 focus:border-primary/30 transition-colors resize-none"
          />
        ) : (
          <p className="text-sm text-primary/60 whitespace-pre-wrap leading-relaxed">
            {ficha.trasfondo || <span className="text-primary/30 italic">Sin trasfondo todavía.</span>}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => (editando ? guardar() : setEditando(true))}
        disabled={guardando}
        className="h-10 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-40 transition-opacity"
      >
        {guardando ? <Loader2 size={14} className="animate-spin mx-auto" /> : editando ? "Guardar cambios" : "Editar ficha"}
      </button>

      {/* ── Inventario ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-primary/50 mb-2">
          Inventario
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={nuevoItem}
            onChange={(e) => setNuevoItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nuevoItem.trim()) {
                agregar(nuevoItem.trim());
                setNuevoItem("");
              }
            }}
            placeholder="Añadir objeto…"
            className="flex-1 h-9 px-3 rounded-lg border border-primary/10 bg-primary/[0.03] outline-none text-xs text-primary/80 placeholder:text-primary/30 focus:border-primary/30 transition-colors"
          />
          <button
            type="button"
            onClick={() => {
              if (nuevoItem.trim()) {
                agregar(nuevoItem.trim());
                setNuevoItem("");
              }
            }}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-primary/30 italic">Sin objetos todavía.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/10 bg-primary/[0.02]"
              >
                <button
                  type="button"
                  onClick={() => toggleEquipado(item)}
                  className={`shrink-0 text-micro font-black uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    item.equipado ? "bg-primary/15 text-primary" : "text-primary/25"
                  }`}
                >
                  {item.equipado ? "Equipado" : "Equipar"}
                </button>
                <span className="flex-1 text-xs text-primary/70 truncate">{item.nombre}</span>
                {item.cantidad > 1 && (
                  <span className="text-micro text-primary/35">×{item.cantidad}</span>
                )}
                <button
                  type="button"
                  onClick={() => quitar(item.id)}
                  className="shrink-0 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-primary/30 transition-all"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VitalCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border border-primary/10 bg-primary/[0.02]">
      <div className="text-primary/40">{icon}</div>
      <span className="text-base font-black text-primary">{value}</span>
      <span className="text-micro font-bold uppercase tracking-widest text-primary/35">{label}</span>
    </div>
  );
}
