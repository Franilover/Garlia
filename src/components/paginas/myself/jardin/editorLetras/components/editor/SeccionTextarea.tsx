"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle, WifiOff, Eye, Edit3, Columns } from "lucide-react";
import { DraftRestoreBanner, useDraftRestore } from "@/hooks/useEditorShared";
import { dexieSecGet } from "../../lib/seccionesDb";
import { IDIOMAS, IDLE_STATE } from "../../constants";
import { MarkdownEditor } from "@/components/forms/MarkdownEditor";
import type { Seccion, IdiomaKey, ColState } from "../../types";

// ── Conteo ───────────────────────────────────────────────────────────────────

type CountMode = "silabas" | "vocales";

const VOCAL_RE = /[aeiouáéíóúàèìòùäëïöüâêîôûãõAEIOUÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕ]/g;

function contarVocales(s: string) {
  return (s.match(VOCAL_RE) ?? []).length;
}

function contarSilabas(s: string): number {
  const kana = s.match(/[\u3040-\u30FF]/g);
  if (kana && kana.length >= s.replace(/[\u3040-\u30FF\s]/g, "").length) {
    return kana.length;
  }
  const palabras = s.toLowerCase().match(/[a-záéíóúàèìòùäëïöüâêîôûãõñ]+/g) ?? [];
  let total = 0;
  for (const p of palabras) {
    const v = (p.match(VOCAL_RE) ?? []).length;
    if (!v) continue;
    const dipt = (p.match(/(?:[aeoáéó][iu]|[iu][aeoáéó]|[iu][iu])/g) ?? []).length;
    total += Math.max(1, v - dipt);
  }
  return total;
}

function contar(linea: string, modo: CountMode) {
  return modo === "vocales" ? contarVocales(linea) : contarSilabas(linea);
}

// ── Constantes de layout ─────────────────────────────────────────────────────
// Deben coincidir con los valores reales del textarea en MarkdownEditor:
//   fontSize: 13px  ·  lineHeight: "relaxed" = ~1.625 → ~21px  ·  paddingTop: 16px
// Si cambias los estilos del MarkdownEditor, actualiza estas constantes.
const FONT_SIZE_PX = 13;
const LINE_H_PX    = Math.round(FONT_SIZE_PX * 1.625); // ≈ 21px  (leading-relaxed)
const PAD_TOP      = 16;                                // padding-top del textarea (px)

// ── Overlay de contadores ────────────────────────────────────────────────────

/**
 * Renderiza los contadores de sílabas/vocales por línea como un overlay
 * encima del textarea del MarkdownEditor.
 *
 * Se pasa como `renderOverlay` al MarkdownEditor, que lo monta dentro del
 * div position:relative que envuelve el textarea.
 */
function SyllableOverlay({
  texto,
  refLineas,
  countMode,
}: {
  texto:     string;
  refLineas: string[] | null;
  countMode: CountMode;
}) {
  const lineas = texto.split("\n");

  return (
    <div
      aria-hidden
      className="absolute top-0 right-0 flex flex-col pointer-events-none select-none"
      style={{ paddingTop: PAD_TOP }}
    >
      {lineas.map((linea, idx) => {
        const miN  = contar(linea, countMode);
        const refN = refLineas ? contar(refLineas[idx] ?? "", countMode) : null;
        const vacia = linea.trim() === "";

        let color = "";
        if (!vacia) {
          if (refN === null) {
            color =
              miN <= 6  ? "text-primary/30"
            : miN <= 10 ? "text-amber-400/50"
            :             "text-rose-400/50";
          } else {
            color = miN === refN ? "text-emerald-400/90" : "text-rose-400/90";
          }
        }

        return (
          <div
            key={idx}
            className={`flex items-center justify-end pr-2.5 gap-0.5 ${color}`}
            style={{ height: LINE_H_PX }}
          >
            {!vacia && (
              <>
                <span className="text-[9px] font-black tabular-nums leading-none">
                  {miN}
                </span>
                {refN !== null && (
                  <>
                    <span className="text-[8px] opacity-40 mx-px">/</span>
                    <span className="text-[9px] font-black tabular-nums leading-none opacity-55">
                      {refN}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export const SeccionTextarea = ({
  sec, idioma, refIdioma, onSave, nombreSeccion,
}: {
  sec:           Seccion;
  idioma:        IdiomaKey;
  /** Idioma del panel opuesto en split mode. Si es undefined no hay comparación. */
  refIdioma?:    IdiomaKey;
  onSave:        (id: string, updates: Partial<Seccion>) => Promise<void>;
  /** Nombre de la sección — se muestra como # encabezado en el editor y en la vista previa */
  nombreSeccion?: string;
}) => {
  const campo     = IDIOMAS.find(i => i.id === idioma)!.campo;
  const serverVal = (sec[campo] as string) || "";

  const [texto,     setTexto]     = useState(serverVal);
  const [st,        setSt]        = useState<ColState>(IDLE_STATE);
  const [countMode, setCountMode] = useState<CountMode>("silabas");
  const [viewMode,  setViewMode]  = useState<"edit" | "split" | "preview">("split");

  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = `sec-draft-${sec.id}-${idioma}`;
  const draft    = useDraftRestore({ key: draftKey, serverValue: serverVal, enabled: !!sec.id });

  // ── Sincronizar con servidor / Dexie ────────────────────────────────────
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const loadLocal = async () => {
      try {
        const local    = await dexieSecGet(sec.id);
        const localVal = local?.[campo] as string | undefined;
        if (local?.status === "pending" && localVal !== undefined && localVal !== serverVal) {
          setTexto(localVal);
          setSt({ ...IDLE_STATE, dirty: true, mode: "pending", msg: "Pendiente de sincronizar" });
        } else {
          setTexto(serverVal);
          setSt(IDLE_STATE);
        }
      } catch {
        setTexto(serverVal);
        setSt(IDLE_STATE);
      }
    };
    loadLocal();
  }, [idioma, sec.id]);

  const doSave = useCallback(async (val: string) => {
    if (timer.current) clearTimeout(timer.current);
    setSt(s => ({ ...s, saving: true, msg: null }));
    draft.save(val);
    try {
      await onSave(sec.id, { [campo]: val });
      draft.clear();
      if (navigator.onLine) {
        setSt({ dirty: false, saving: false, saved: true, mode: "idle", msg: null });
        setTimeout(() => setSt(s => ({ ...s, saved: false })), 2000);
      } else {
        setSt({ dirty: false, saving: false, saved: false, mode: "pending", msg: "Guardado sin conexión" });
      }
    } catch {
      setSt(s => ({ ...s, saving: false, mode: "pending", msg: "Sin conexión — guardado localmente" }));
    }
  }, [sec.id, campo, onSave, draft]);

  const onChange = useCallback((val: string) => {
    setTexto(val);
    draft.save(val);
    setSt(s => ({ ...s, dirty: true, saved: false, mode: s.mode === "error" ? "idle" : s.mode, msg: null }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 1500);
  }, [doSave, draft]);

  // ── Texto de referencia (columna opuesta en split mode) ─────────────────
  const refCampo  = refIdioma ? IDIOMAS.find(i => i.id === refIdioma)?.campo : null;
  const refLineas = refCampo ? ((sec[refCampo] as string) || "").split("\n") : null;

  // ── Border según estado ──────────────────────────────────────────────────
  // El MarkdownEditor usa su propio borde; lo sobreescribimos vía className
  // en el div contenedor para indicar estado de guardado.
  const statusRingClass =
    st.mode === "pending" ? "ring-1 ring-blue-500/40"  :
    st.mode === "error"   ? "ring-1 ring-red-500/40"   :
    st.dirty              ? "ring-1 ring-amber-500/30" :
                            "";

  return (
    <div className="flex-1 min-w-0 space-y-1.5">
      {/* ── Banner de borrador local ── */}
      <DraftRestoreBanner
        draft={draft}
        onRestore={(v) => { setTexto(v); draft.dismiss(); }}
        label="Borrador local disponible"
      />

      {/* ── Banner sin conexión ── */}
      {st.mode === "pending" && !st.saving && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-400">
          <WifiOff size={10} />
          Guardado sin conexión — se sincronizará al reconectar
        </div>
      )}

      {/* ── Toggle sílabas / vocales + modo vista ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5 p-0.5 bg-primary/5 rounded-lg border border-primary/10 w-fit">
            {(["silabas", "vocales"] as CountMode[]).map(m => (
              <button
                key={m}
                onClick={() => setCountMode(m)}
                className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${
                  countMode === m
                    ? "bg-primary text-bg-main"
                    : "text-primary/30 hover:text-primary/60"
                }`}
              >
                {m === "silabas" ? "síl" : "voc"}
              </button>
            ))}
          </div>

          {/* Botones edit / split / preview */}
          <div className="flex gap-0.5 p-0.5 bg-primary/5 rounded-lg border border-primary/10">
            {([
              { id: "edit",    Icon: Edit3,   title: "Editar" },
              { id: "split",   Icon: Columns, title: "Split" },
              { id: "preview", Icon: Eye,     title: "Vista previa" },
            ] as { id: "edit"|"split"|"preview"; Icon: React.ElementType; title: string }[]).map(({ id, Icon, title }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                title={title}
                className={`p-1 rounded-md transition-all ${
                  viewMode === id
                    ? "bg-primary text-bg-main"
                    : "text-primary/30 hover:text-primary/60"
                }`}
              >
                <Icon size={10} />
              </button>
            ))}
          </div>
        </div>

        {/* Indicadores de estado flotantes (fuera del editor) */}
        <span className="flex items-center gap-1.5 pr-1">
          {st.saving                           && <Loader2      size={11} className="animate-spin text-primary/30" />}
          {st.saved                            && <CheckCircle2 size={11} className="text-emerald-400" />}
          {st.mode === "pending" && !st.saving && <span className="w-2 h-2 rounded-full bg-blue-400" />}
          {st.mode === "error"                 && <AlertCircle  size={11} className="text-red-400" />}
        </span>
      </div>

      {/* ── Editor markdown con overlay de contadores ── */}
      <div className={statusRingClass}>
        <MarkdownEditor
          value={texto}
          onChange={onChange}
          placeholder={`Letra en ${IDIOMAS.find(i => i.id === idioma)?.nombre}…`}
          toolbar={false}
          mode={viewMode}
          autoResize
          rows={3}
          sectionTitle={nombreSeccion}
          renderOverlay={(val) => (
            <SyllableOverlay
              texto={val}
              refLineas={refLineas}
              countMode={countMode}
            />
          )}
        />
      </div>

      {/* ── Mensaje de error ── */}
      {st.mode === "error" && st.msg && (
        <p className="text-[9px] font-black uppercase text-red-400/80 tracking-widest px-1">⚠ {st.msg}</p>
      )}
    </div>
  );
};