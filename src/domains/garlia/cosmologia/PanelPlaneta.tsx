"use client";

/**
 * PanelPlaneta.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Panel de detalle de un cuerpo celeste (planeta, satélite, etc.).
 * Muestra descripción + inventario detallado: atmósfera, geología,
 * biomas, reinos y procesos vinculados. Los biomas y reinos son
 * clickeables y abren su propio panel flotante.
 */

import { Globe, Compass, ArrowLeft, Wind, Layers, Leaf, Crown, Zap, Eye, ChevronDown, ChevronUp } from "lucide-react";
import React, { useEffect, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import { SeccionEntidad } from "@/ui/SeccionEntidad";
import { type SaveStatus } from "@/ui/saveStatus";
import {
  usePublishHeaderControls,
  type OnHeaderControlsChange,
} from "@/domains/garlia/_shared/useEditorHeaderControls";
import { useBiomas } from "@/domains/garlia/biologia/useBiologia";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";

// ── Tipos ──────────────────────────────────────────────────────────────────

type Planeta = {
  id: string;
  nombre: string;
  tipo_cuerpo: string | null;
  descripcion: string | null;
  canon: boolean | null;
};

type ElementoAtm = {
  elemento_id: string;
  nombre: string;
  simbolo: string | null;
  fraccion_molar: number | null;
  estado: string | null;
};

type CapaGeo = {
  material_id: string;
  nombre: string;
  capa: string;
  cobertura_pct: number | null;
};

type ReinoPlaneta = {
  reino_id: string;
  nombre: string;
  tipo_relacion: string | null;
  es_nativo: boolean | null;
};

type ProcesoPlaneta = {
  proceso_id: string;
  nombre: string;
  relacion_clave: string | null;
  estado_vinculo: string | null;
};

type BiomaPlaneta = {
  bioma_id: string;
  nombre: string;
};

type InventarioPlaneta = {
  visual: boolean;
  atmosfera: ElementoAtm[];
  geologia: CapaGeo[];
  biomas: BiomaPlaneta[];
  reinos: ReinoPlaneta[];
  procesos: ProcesoPlaneta[];
};

// ── Helpers visuales ───────────────────────────────────────────────────────

const CAPA_LABEL: Record<string, string> = {
  superficie: "Superficie",
  manto: "Manto",
  nucleo: "Núcleo",
  subsuelo: "Subsuelo",
};

const CAPA_ORDER = ["superficie", "subsuelo", "manto", "nucleo"];

const RELACION_LABEL: Record<string, string> = {
  origen: "origen",
  colonia: "colonia",
  exilio: "exilio",
  alianza: "alianza",
  vasallo: "vasallo",
};

const VINCULO_COLOR: Record<string, string> = {
  validado: "color-mix(in srgb, #22c55e 70%, transparent)",
  revision: "color-mix(in srgb, #f59e0b 70%, transparent)",
  provisional: "color-mix(in srgb, #6366f1 70%, transparent)",
};

function pct(n: number | null) {
  if (n == null) return "";
  return `${Math.round(n)}%`;
}

// ── Sub-sección reutilizable ───────────────────────────────────────────────

function SubSeccion({
  icon: Icon,
  label,
  count,
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const vacio = count === 0;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
    >
      <button
        type="button"
        onClick={() => !vacio && setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
        style={{ cursor: vacio ? "default" : "pointer" }}
      >
        <Icon size={12} className="text-primary/40 shrink-0" />
        <span className="flex-1 text-micro font-black uppercase tracking-[0.12em] text-primary/50">
          {label}
        </span>
        {vacio ? (
          <span className="text-micro text-primary/20">—</span>
        ) : (
          <>
            <span
              className="text-micro font-black px-1.5 py-0.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)", opacity: 0.5 }}
            >
              {count}
            </span>
            {open
              ? <ChevronUp size={11} className="text-primary/25" />
              : <ChevronDown size={11} className="text-primary/25" />
            }
          </>
        )}
      </button>

      {!vacio && open && (
        <div
          className="px-3 pb-3 pt-1"
          style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ── Chip clickeable ────────────────────────────────────────────────────────

function Chip({
  label,
  sublabel,
  badge,
  badgeColor,
  onClick,
  mono,
}: {
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
  mono?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left transition-all"
      style={{
        background: "color-mix(in srgb, var(--primary) 5%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 9%, transparent)",
        cursor: onClick ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 10%, transparent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)";
      }}
    >
      <div className="flex-1 min-w-0">
        <span
          className="text-xs font-bold text-primary/70 truncate block leading-tight"
          style={mono ? { fontFamily: "var(--font-mono, monospace)", fontSize: "11px" } : {}}
        >
          {label}
        </span>
        {sublabel && (
          <span className="text-micro text-primary/35 truncate block mt-0.5 leading-tight">{sublabel}</span>
        )}
      </div>
      {badge && (
        <span
          className="text-micro font-black shrink-0 px-1.5 py-0.5 rounded-full"
          style={{
            background: badgeColor ?? "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "var(--primary)",
            opacity: 0.7,
          }}
        >
          {badge}
        </span>
      )}
    </Tag>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export function PanelPlaneta({
  planeta,
  onSave,
  onVolver,
  onHeaderControlsChange,
}: {
  planeta: Planeta;
  onSave: (updates: Partial<Planeta>) => void;
  onVolver: () => void;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const [nombre, setNombre] = useState(planeta.nombre);
  const [descripcion, setDescripcion] = useState(planeta.descripcion ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [inventario, setInventario] = useState<InventarioPlaneta | null>(null);
  const [cargando, setCargando] = useState(true);

  const abrirPanel = usePanelFlotante((s) => s.abrir);

  useEffect(() => {
    setNombre(planeta.nombre);
    setDescripcion(planeta.descripcion ?? "");
  }, [planeta.id]);

  // Carga todo el inventario en paralelo
  useEffect(() => {
    let cancelado = false;
    setCargando(true);

    (async () => {
      const id = planeta.id;

      const [
        { data: rawVisual },
        { data: rawAtm },
        { data: rawGeo },
        { data: rawBiomas },
        { data: rawReinos },
        { data: rawProcesos },
      ] = await Promise.all([
        supabase.from("cuerpo_celeste_visual_v1").select("id").eq("cuerpo_celeste_id", id).limit(1),

        supabase
          .from("cuerpo_celeste_composicion_atm_v1")
          .select("elemento_id, fraccion_molar, estado, elementos(nombre, simbolo)")
          .eq("cuerpo_celeste_id", id)
          .order("fraccion_molar", { ascending: false }),

        supabase
          .from("cuerpo_celeste_composicion_geo_v1")
          .select("material_id, capa, cobertura_pct, materiales(nombre)")
          .eq("cuerpo_celeste_id", id)
          .order("cobertura_pct", { ascending: false }),

        supabase
          .from("cuerpo_celeste_biomas_v1")
          .select("bioma_id, biomas(nombre)")
          .eq("cuerpo_celeste_id", id),

        supabase
          .from("reino_planeta_v1")
          .select("reino_id, tipo_relacion, es_nativo, reinos(nombre)")
          .eq("cuerpo_celeste_id", id)
          .order("es_nativo", { ascending: false }),

        supabase
          .from("cuerpo_celeste_procesos_v1")
          .select("proceso_id, relacion_clave, estado_vinculo, procesos(nombre)")
          .eq("cuerpo_celeste_id", id),
      ]);

      if (cancelado) return;

      setInventario({
        visual: (rawVisual?.length ?? 0) > 0,

        atmosfera: (rawAtm ?? []).map((r: any) => ({
          elemento_id: r.elemento_id,
          nombre: r.elementos?.nombre ?? "?",
          simbolo: r.elementos?.simbolo ?? null,
          fraccion_molar: r.fraccion_molar != null ? Number(r.fraccion_molar) : null,
          estado: r.estado ?? null,
        })),

        geologia: (rawGeo ?? []).map((r: any) => ({
          material_id: r.material_id,
          nombre: r.materiales?.nombre ?? "?",
          capa: r.capa ?? "superficie",
          cobertura_pct: r.cobertura_pct != null ? Number(r.cobertura_pct) : null,
        })),

        biomas: (rawBiomas ?? []).map((r: any) => ({
          bioma_id: r.bioma_id,
          nombre: r.biomas?.nombre ?? "?",
        })),

        reinos: (rawReinos ?? []).map((r: any) => ({
          reino_id: r.reino_id,
          nombre: r.reinos?.nombre ?? "?",
          tipo_relacion: r.tipo_relacion ?? null,
          es_nativo: r.es_nativo ?? null,
        })),

        procesos: (rawProcesos ?? []).map((r: any) => ({
          proceso_id: r.proceso_id,
          nombre: r.procesos?.nombre ?? "?",
          relacion_clave: r.relacion_clave ?? null,
          estado_vinculo: r.estado_vinculo ?? null,
        })),
      });

      setCargando(false);
    })();

    return () => { cancelado = true; };
  }, [planeta.id]);

  const guardar = () => {
    setStatus("saving");
    try {
      onSave({ nombre: nombre.trim() || planeta.nombre, descripcion });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const enPanelFlotante = !!onHeaderControlsChange;

  usePublishHeaderControls(
    {
      nombre,
      placeholderNombre: "Nombre del planeta",
      onChangeNombre: setNombre,
      onBlurNombre: guardar,
      status,
      onGuardar: guardar,
    },
    onHeaderControlsChange,
  );

  // Geología agrupada por capa
  const geologiaPorCapa = inventario
    ? CAPA_ORDER.reduce<Record<string, CapaGeo[]>>((acc, capa) => {
        const items = inventario.geologia.filter((g) => g.capa === capa);
        if (items.length > 0) acc[capa] = items;
        return acc;
      }, {})
    : {};

  const contenido = (
    <div className="flex flex-col gap-4 p-4">

      {/* Cabecera propia (fuera del panel flotante) */}
      {!enPanelFlotante && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <Globe size={14} className="text-primary/40 shrink-0" />
          <input
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
            placeholder="Nombre del planeta"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardar}
          />
          <button
            type="button"
            onClick={guardar}
            className="shrink-0 px-3 py-1 rounded-lg text-micro font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all"
          >
            Guardar
          </button>
        </div>
      )}

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <p className="text-micro font-black uppercase tracking-[0.12em] text-primary/35">
          Descripción
        </p>
        <textarea
          className="w-full resize-none rounded-xl px-3 py-2.5 text-sm font-light leading-relaxed outline-none transition-colors"
          rows={4}
          style={{
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}
          placeholder="Descripción del planeta…"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          onBlur={guardar}
        />
      </div>

      {/* ── Inventario ── */}
      {cargando ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 rounded-xl animate-pulse"
              style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}
            />
          ))}
        </div>
      ) : inventario && (
        <div className="flex flex-col gap-2">

          {/* Visual */}
          <SubSeccion icon={Eye} label="Visual" count={inventario.visual ? 1 : 0} defaultOpen={false}>
            <p className="text-xs text-primary/50 pt-1">Config. visual registrada</p>
          </SubSeccion>

          {/* Atmósfera */}
          <SubSeccion icon={Wind} label="Atmósfera" count={inventario.atmosfera.length}>
            <div className="flex flex-col gap-1 pt-1">
              {inventario.atmosfera.map((el) => (
                <Chip
                  key={el.elemento_id}
                  label={el.nombre}
                  sublabel={el.estado ?? undefined}
                  badge={
                    el.simbolo && el.fraccion_molar != null
                      ? `${el.simbolo} · ${Math.round(el.fraccion_molar * 100)}%`
                      : el.simbolo ?? undefined
                  }
                  mono
                />
              ))}
            </div>
          </SubSeccion>

          {/* Geología */}
          <SubSeccion icon={Layers} label="Geología" count={inventario.geologia.length}>
            <div className="flex flex-col gap-3 pt-1">
              {Object.entries(geologiaPorCapa).map(([capa, items]) => (
                <div key={capa}>
                  <p
                    className="text-micro font-black uppercase tracking-[0.1em] mb-1.5"
                    style={{ color: "var(--primary)", opacity: 0.25 }}
                  >
                    {CAPA_LABEL[capa] ?? capa}
                  </p>
                  <div className="flex flex-col gap-1">
                    {items.map((m) => (
                      <Chip
                        key={m.material_id}
                        label={m.nombre}
                        badge={m.cobertura_pct != null ? pct(m.cobertura_pct) : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SubSeccion>

          {/* Biomas */}
          <SubSeccion icon={Leaf} label="Biomas" count={inventario.biomas.length}>
            <div className="flex flex-col gap-1 pt-1">
              {inventario.biomas.map((b) => (
                <Chip
                  key={b.bioma_id}
                  label={b.nombre}
                  onClick={() => abrirPanel("bioma", b.bioma_id)}
                />
              ))}
            </div>
          </SubSeccion>

          {/* Reinos */}
          <SubSeccion icon={Crown} label="Reinos" count={inventario.reinos.length}>
            <div className="flex flex-col gap-1 pt-1">
              {inventario.reinos.map((r) => (
                <Chip
                  key={r.reino_id}
                  label={r.nombre}
                  sublabel={r.es_nativo ? "nativo" : undefined}
                  badge={r.tipo_relacion ? RELACION_LABEL[r.tipo_relacion] ?? r.tipo_relacion : undefined}
                  onClick={() => abrirPanel("reino", r.reino_id)}
                />
              ))}
            </div>
          </SubSeccion>

          {/* Procesos */}
          <SubSeccion icon={Zap} label="Procesos" count={inventario.procesos.length}>
            <div className="flex flex-col gap-1 pt-1">
              {inventario.procesos.map((p) => (
                <Chip
                  key={p.proceso_id}
                  label={p.nombre}
                  sublabel={p.relacion_clave ?? undefined}
                  badge={p.estado_vinculo ?? undefined}
                  badgeColor={
                    p.estado_vinculo
                      ? `color-mix(in srgb, ${VINCULO_COLOR[p.estado_vinculo] ?? "var(--primary)"} 15%, transparent)`
                      : undefined
                  }
                />
              ))}
            </div>
          </SubSeccion>

        </div>
      )}

      {/* Tipo + canon */}
      <div className="flex flex-col gap-1.5">
        <p className="text-micro font-black uppercase tracking-[0.12em] text-primary/35">
          Tipo
        </p>
        <p className="text-micro text-primary/50 capitalize">
          {planeta.tipo_cuerpo ?? "—"}
          {planeta.canon && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/8 text-primary/40 border border-primary/10">
              Canon
            </span>
          )}
        </p>
      </div>
    </div>
  );

  return contenido;
}
