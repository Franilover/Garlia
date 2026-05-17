"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Maximize2, UserCircle2, BookOpen, Mic2, Loader2,
  ChevronDown, X, Save, Trash2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Personaje, type SaveStatus } from "./types";
import { useCapitulosNarrados, useNombresDeTabla } from "./hooks";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { BloqueHechizos } from "./BloqueHechizos";
import { BloqueDones } from "./BloqueDones";
import { BloqueRelaciones } from "./BloqueRelaciones";

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch { return []; }
}
async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local.map((r: any) => r.id).filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}





// ─── Bloque capítulos narrados ────────────────────────────────────────────────
function BloqueCapsNarrados({ personajeId }: { personajeId: string }) {
  const { caps, loading } = useCapitulosNarrados(personajeId);
  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary/20" /></div>;
  if (!caps.length) return (
    <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-4 italic">
      Sin capítulos narrados aún
    </p>
  );
  return (
    <div className="space-y-1">
      {caps.map(cap => (
        <div key={cap.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/3 transition-colors">
          <div
            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black bg-accent/10 text-accent"
          >
            {cap.orden}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-primary truncate uppercase italic">{cap.titulo_capitulo}</p>
            {cap.libro_titulo && (
              <p className="text-[9px] text-primary/35 truncate flex items-center gap-1">
                <BookOpen size={8} /> {cap.libro_titulo}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Image cuerpo (mobile picker) ─────────────────────────────────────────────
function PickerCuerpo({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2"><Maximize2 size={11} /> Imagen cuerpo</h3>
              <button onClick={() => setOpen(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
            </div>
            <SimpleImagePicker onSelect={url => { onChange(url); setOpen(false); }} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
      {value ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/15 text-[10px] font-black uppercase tracking-widest text-primary/50 hover:text-primary hover:border-primary/30 transition-all">
          <div className="w-5 h-5 rounded overflow-hidden border border-primary/15 shrink-0">
            <img src={value} alt="Cuerpo" className="w-full h-full object-cover" />
          </div>
          Cambiar cuerpo
        </button>
      ) : (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all">
          <Maximize2 size={11} /> + Imagen cuerpo
        </button>
      )}
    </>
  );
}

// ─── Hook: grupos de criaturas a partir del nombre de especie ────────────────
// Resuelve la criatura por nombre y luego busca en qué grupos está,
// para pasarlos directamente a BloqueHechizos / BloqueDones.
function useGruposDeCriaturaPorNombre(nombreEspecie: string | null | undefined): string[] {
  const [grupoIds, setGrupoIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!nombreEspecie?.trim()) { setGrupoIds([]); return; }

    // 1. Dexie: buscar criatura y sus grupos
    let criaturaId: string | null = null;
    try {
      if (db) {
        const allCriaturas: any[] = await (db as any).criaturas?.toArray() ?? [];
        const criLocal = allCriaturas.find((c: any) =>
          c.nombre?.toLowerCase() === nombreEspecie.trim().toLowerCase()
        );
        if (criLocal) {
          criaturaId = criLocal.id;
          const allGrupos: any[] = await (db as any).grupos_mundo?.toArray() ?? [];
          const ids = allGrupos
            .filter((g: any) => g.tipo === "criaturas" && (g.miembro_ids ?? []).includes(criaturaId))
            .map((g: any) => g.id);
          if (ids.length) { setGrupoIds(ids); if (!navigator.onLine) return; }
        }
      }
    } catch {}

    if (!navigator.onLine) return;

    // 2. Supabase: resolver criatura si no se encontró en Dexie
    if (!criaturaId) {
      const { data: cri } = await supabase
        .from("criaturas")
        .select("id")
        .ilike("nombre", nombreEspecie.trim())
        .limit(1)
        .maybeSingle();
      criaturaId = cri?.id ?? null;
    }
    if (!criaturaId) { setGrupoIds([]); return; }

    // 3. Supabase: grupos de criaturas que contienen este ID
    const { data: grupos } = await supabase
      .from("grupos_mundo")
      .select("id, miembro_ids")
      .eq("tipo", "criaturas")
      .contains("miembro_ids", [criaturaId]);
    setGrupoIds((grupos ?? []).map((g: any) => g.id));
  }, [nombreEspecie]);

  useEffect(() => { load(); }, [load]);

  return grupoIds;
}

// ─── Hook: variantes de una criatura por nombre ───────────────────────────────
type VarianteMin = { id: string; tipo: string };

function useCriaturaVariantesPorNombre(nombreEspecie: string | null | undefined) {
  const [variantes, setVariantes] = useState<VarianteMin[]>([]);

  const load = useCallback(async () => {
    if (!nombreEspecie?.trim()) { setVariantes([]); return; }

    // 1. Dexie primero
    try {
      if (db) {
        const allCriaturas: any[] = await (db as any).criaturas?.toArray() ?? [];
        const criLocal = allCriaturas.find((c: any) =>
          c.nombre?.toLowerCase() === nombreEspecie.trim().toLowerCase()
        );
        if (criLocal) {
          const vars: any[] = await (db as any).criatura_variantes
            ?.where("criatura_id").equals(criLocal.id).toArray() ?? [];
          if (vars.length) { setVariantes(vars); if (!navigator.onLine) return; }
        }
      }
    } catch {}

    if (!navigator.onLine) return;

    const { data: criatura } = await supabase
      .from("criaturas")
      .select("id")
      .ilike("nombre", nombreEspecie.trim())
      .limit(1)
      .maybeSingle();
    if (!criatura) { setVariantes([]); return; }
    const { data } = await supabase
      .from("criatura_variantes")
      .select("id, tipo")
      .eq("criatura_id", criatura.id)
      .order("tipo");
    const result = data ?? [];
    setVariantes(result);
    try {
      if (db && result.length > 0) await (db as any).criatura_variantes?.bulkPut(result);
    } catch {}
  }, [nombreEspecie]);

  useEffect(() => { load(); }, [load]);

  return variantes;
}

// ─── Sección Hechizos inline ──────────────────────────────────────────────────
function SeccionHechizos({ personajeId, grupoIds }: { personajeId: string; grupoIds: string[] }) {
  return (
    <div
      className="rounded-xl overflow-hidden border border-primary/10"
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06] bg-primary/[0.03]"
      >
        <Sparkles size={10} className="text-primary/40" />
        <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Hechizos</span>
      </div>
      <BloqueHechizos personajeId={personajeId} grupoIds={grupoIds} />
    </div>
  );
}

// ─── FormularioPersonaje ──────────────────────────────────────────────────────
export function FormularioPersonaje({
  form, setForm, status, onSave, onDelete, compacto = false, entities = [], onNavigate,
}: {
  form: Personaje;
  setForm: React.Dispatch<React.SetStateAction<Personaje>>;
  status: SaveStatus;
  onSave: () => void;
  onDelete: () => void;
  compacto?: boolean;
  entities?: WikiEntity[];
  onNavigate?: (tab: "criaturas" | "reinos", nombre: string) => void;
}) {
  const especies = useNombresDeTabla("criaturas");
  const reinos   = useNombresDeTabla("reinos");
  const variantes  = useCriaturaVariantesPorNombre(form.especie);
  const grupoIds   = useGruposDeCriaturaPorNombre(form.especie);
  const { onSnippetAction } = useWikilink();

  const field = (k: keyof Personaje) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Fixed header ───────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-primary/[0.03]"
      >
        <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.img_url
            ? <img src={form.img_url} alt={form.nombre} className="w-full h-full object-cover" />
            : <UserCircle2 size={16} className="text-primary/25" />}
        </div>

        <input
          value={form.nombre ?? ""}
          onChange={field("nombre")}
          placeholder="Nombre del personaje"
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          style={{ letterSpacing: "0.02em" }}
        />

        <div className="shrink-0 flex items-center gap-1.5">
          <SaveIndicator status={status} />
          {!compacto && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
            >
              <Trash2 size={10} />
            </button>
          )}
          <button
            onClick={onSave}
            disabled={status === "saving"}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Save size={10} /> Guardar
          </button>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden flex">

        <div className="flex-1 overflow-y-auto min-h-0">

          {/* IDENTIDAD */}
          <div className="p-3">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Columna izquierda: imagen cara + cuerpo apilados */}
                <div className="shrink-0 w-full sm:w-52 flex sm:flex-col gap-3 sm:gap-2">
                  <div className="w-24 sm:w-full shrink-0">
                  <SelectorImagen
                    label="Cara"
                    value={form.img_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, img_url: url }))}
                    aspect="square"
                    placeholder={<UserCircle2 size={20} className="opacity-25" />}
                  />
                  </div>
                  {!compacto && (
                    <div
                      className="hidden sm:block rounded-xl overflow-hidden border border-primary/10"
                    >
                      {/* Label */}
                      <div
                        className="px-2 py-1 border-b border-primary/10 bg-primary/[0.02]"
                      >
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25">Cuerpo</span>
                      </div>
                      {/* Imagen con hover overlay para cambiar */}
                      <div className="relative w-full group bg-primary/2" style={{ aspectRatio: "1 / 2" }}>
                        {form.img_cuerpo_url ? (
                          <img
                            src={form.img_cuerpo_url}
                            alt="Cuerpo completo"
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ objectPosition: "top center" }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Maximize2 size={20} className="opacity-15" />
                          </div>
                        )}
                        {/* Overlay hover cubre todo */}
                        <label
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-bg-main/70 backdrop-blur-sm"
                        >
                          <Maximize2 size={14} className="text-primary/50" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Cambiar</span>
                          <SelectorImagen
                            label=""
                            value={form.img_cuerpo_url ?? ""}
                            onChange={url => setForm(f => ({ ...f, img_cuerpo_url: url }))}
                            aspect="full"
                            placeholder={null}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna derecha: selectores en fila + descripción + resto */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Fila de dropdowns + Don */}
                  <div className="flex flex-col sm:flex-row gap-2 items-start">
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <SelectorTexto label="Especie" value={form.especie ?? ""} onChange={v => setForm(f => ({ ...f, especie: v, variante_id: null }))} opciones={especies} placeholder="Humano, elfo, demonio…" onNavigate={onNavigate ? (n) => onNavigate("criaturas", n) : undefined} />
                        {variantes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/25 mr-0.5">Variante</span>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, variante_id: null }))}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${!form.variante_id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                            >
                              Todas
                            </button>
                            {variantes.map(v => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, variante_id: v.id }))}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${form.variante_id === v.id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                              >
                                {v.tipo}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <SelectorTexto label="Reino" value={form.reino ?? ""} onChange={v => setForm(f => ({ ...f, reino: v }))} opciones={reinos} placeholder="Reino, grupo, nación…" onNavigate={onNavigate ? (n) => onNavigate("reinos", n) : undefined} />
                    </div>

                    {/* Don — mismo estilo que Especie / Reino */}
                    <div className="w-full sm:w-44 sm:shrink-0 space-y-1.5">
                      <BloqueDones personajeId={form.id} grupoIds={grupoIds} />
                    </div>
                  </div>

                  {/* Descripción + Características en fila */}
                  {!compacto ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Sobre el personaje</label>
                        <MarkdownEditor
                          value={form.sobre ?? ""}
                          onChange={v => setForm(f => ({ ...f, sobre: v }))}
                          placeholder="Biografía, personalidad…"
                          rows={8}
                          toolbar
                          defaultMode="edit"
                        onSnippetAction={onSnippetAction}
                        entities={entities}
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Características</label>
                        <MarkdownEditor
                          value={form.caracteristicas ?? ""}
                          onChange={v => setForm(f => ({ ...f, caracteristicas: v }))}
                          placeholder="Rasgos físicos, personalidad, habilidades…"
                          rows={8}
                          toolbar
                          defaultMode="edit"
                        onSnippetAction={onSnippetAction}
                        entities={entities}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Sobre el personaje</label>
                      <MarkdownEditor
                        value={form.sobre ?? ""}
                        onChange={v => setForm(f => ({ ...f, sobre: v }))}
                        placeholder="Biografía, personalidad…"
                        rows={5}
                        toolbar
                        defaultMode="edit"
                      onSnippetAction={onSnippetAction}
                      entities={entities}
                      />
                    </div>
                  )}

                  {/* Relaciones */}
                  <BloqueRelaciones personajeId={form.id} />

                  {/* Capítulos narrados + Hechizos en fila */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div
                      className="flex-1 min-w-0 rounded-xl overflow-hidden border border-primary/10"
                    >
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06] bg-primary/[0.03]">
                        <Mic2 size={10} className="text-primary/40" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Capítulos narrados</span>
                      </div>
                      <BloqueCapsNarrados personajeId={form.id} />
                    </div>
                    <div className="w-full sm:w-56 sm:shrink-0">
                      <SeccionHechizos personajeId={form.id} grupoIds={grupoIds} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

      </div>
    </div>
  );
}

// ─── EditorPersonaje ──────────────────────────────────────────────────────────
export function EditorPersonaje({
  item, onSaved, onDeleted, entities = [], onNavigate,
}: {
  item: Personaje; onSaved: (p: Personaje) => void; onDeleted: (id: string) => void; entities?: WikiEntity[];
  onNavigate?: (tab: "criaturas" | "reinos", nombre: string) => void;
}) {
  const [form,   setForm]   = useState<Personaje>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("personajes").update({
        nombre:          form.nombre,
        img_url:         form.img_url        || null,
        img_cuerpo_url:  form.img_cuerpo_url || null,
        sobre:           form.sobre,
        reino:           form.reino,
        especie:         form.especie,
        caracteristicas: form.caracteristicas || null,
        variante_id:     (form as any).variante_id    || null,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("personajes", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar a "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("personajes").delete().eq("id", form.id);
    void dexieDel("personajes", form.id);
    onDeleted(form.id);
  };

  return (
    <>
      <ConfirmModal />
      <FormularioPersonaje form={form} setForm={setForm} status={status} onSave={save} onDelete={del} entities={entities} onNavigate={onNavigate} />
    </>
  );
}