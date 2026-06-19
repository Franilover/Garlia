"use client";

import { Loader2, CheckCircle2, AlertCircle, WifiOff } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";

import { MarkdownEditor } from "@/components/forms/Markdown/MarkdownEditor";
import { DraftRestoreBanner, useDraftRestore } from "@/hooks/useEditorShared";

import { IDIOMAS, IDLE_STATE } from "../../constants";
import { dexieSecGet } from "../../lib/seccionesDb";
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
//   fontSize: 11px  ·  lineHeight: 1.6 → ~18px  ·  paddingTop: 6px
// Si cambias los estilos del MarkdownEditor, actualiza estas constantes.
const FONT_SIZE_PX = 11;
const LINE_H_PX    = Math.round(FONT_SIZE_PX * 1.6); // ≈ 18px  (line-height: 1.6)
const PAD_TOP      = 6;                               // padding-top del textarea (px)

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
  sec, idioma, refIdioma, onSave, nombreSeccion, countMode,
}: {
  sec:           Seccion;
  idioma:        IdiomaKey;
  refIdioma?:    IdiomaKey;
  onSave:        (id: string, updates: Partial<Seccion>) => Promise<void>;
  nombreSeccion?: string;
  countMode:     "silabas" | "vocales";
}) => {
  const campo     = IDIOMAS.find(i => i.id === idioma)!.campo;
  const serverVal = (sec[campo] as string) || "";

  const [texto, setTexto] = useState(serverVal);
  const [st,    setSt]    = useState<ColState>(IDLE_STATE);

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

  // ── Rows dinámico: crece con el contenido sin depender del flex layout ───
  // autoResize de MarkdownEditor mide scrollHeight, pero dentro de un flex
  // container con min-h-0 queda atrapado. Calculamos rows desde el nº de
  // líneas para que minHeight del textarea sea siempre correcto.
  const dynamicRows = Math.max(3, texto.split("\n").length + 1);

  // ── Border según estado ──────────────────────────────────────────────────
  // El MarkdownEditor usa su propio borde; lo sobreescribimos vía className
  // en el div contenedor para indicar estado de guardado.
  const statusRingClass =
    st.mode === "pending" ? "ring-1 ring-blue-500/40"  :
    st.mode === "error"   ? "ring-1 ring-red-500/40"   :
    st.dirty              ? "ring-1 ring-amber-500/30" :
                            "";

  return (
    <div className="flex-1 min-w-0">
      {/* ── Banner de borrador local ── */}
      <DraftRestoreBanner
        draft={draft}
        label="Borrador local disponible"
        onRestore={(v) => { setTexto(v); draft.dismiss(); }}
      />

      {/* ── Banner sin conexión ── */}
      {st.mode === "pending" && !st.saving && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-400">
          <WifiOff size={10} />
          Guardado sin conexión — se sincronizará al reconectar
        </div>
      )}

      {/* ── Indicadores de estado — solo si hay algo que mostrar ── */}
      {(st.saving || st.saved || st.mode === "pending" || st.mode === "error") && (
        <div className="flex justify-end mb-0.5">
          <span className="flex items-center gap-1.5 pr-1">
            {st.saving                           && <Loader2      className="animate-spin text-primary/30" size={11} />}
            {st.saved                            && <CheckCircle2 className="text-emerald-400" size={11} />}
            {st.mode === "pending" && !st.saving && <span className="w-2 h-2 rounded-full bg-blue-400" />}
            {st.mode === "error"                 && <AlertCircle  className="text-red-400" size={11} />}
          </span>
        </div>
      )}

      {/* ── Editor markdown con overlay de contadores ── */}
      <div className={statusRingClass}>
        <MarkdownEditor
          autoResize={false}
          mode="edit"
          placeholder={`Letra en ${IDIOMAS.find(i => i.id === idioma)?.nombre}…`}
          renderOverlay={(val) => (
            <SyllableOverlay
              countMode={countMode}
              refLineas={refLineas}
              texto={val}
            />
          )}
          rows={dynamicRows}
          toolbar={false}
          value={texto}
          onChange={onChange}
        />
      </div>

      {/* ── Mensaje de error ── */}
      {st.mode === "error" && st.msg && (
        <p className="text-[9px] font-black uppercase text-red-400/80 tracking-widest px-1">⚠ {st.msg}</p>
      )}
    </div>
  );
};