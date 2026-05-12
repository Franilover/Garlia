"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle, WifiOff } from "lucide-react";
import { DraftRestoreBanner, useDraftRestore } from "@/hooks/useEditorShared";
import { dexieSecGet } from "../../lib/seccionesDb";
import { IDIOMAS, IDLE_STATE } from "../../constants";
import type { Seccion, IdiomaKey, ColState } from "../../types";

// ── Conteo ───────────────────────────────────────────────────────────────────

type CountMode = "silabas" | "vocales";

const VOCAL_RE = /[aeiouáéíóúàèìòùäëïöüâêîôûãõAEIOUÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕ]/g;

function contarVocales(s: string) {
  return (s.match(VOCAL_RE) ?? []).length;
}

function contarSilabas(s: string): number {
  // Japonés: cada mora kana cuenta como sílaba
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

// ── Componente ───────────────────────────────────────────────────────────────

const LINE_H  = 1.625; // rem — leading-relaxed con text-sm
const PAD_TOP = 12;    // px  — py-3

export const SeccionTextarea = ({
  sec, idioma, onSave,
}: {
  sec: Seccion;
  idioma: IdiomaKey;
  onSave: (id: string, updates: Partial<Seccion>) => Promise<void>;
}) => {
  const campo     = IDIOMAS.find(i => i.id === idioma)!.campo;
  const serverVal = (sec[campo] as string) || "";

  const [texto,     setTexto]     = useState(serverVal);
  const [st,        setSt]        = useState<ColState>(IDLE_STATE);
  const [countMode, setCountMode] = useState<CountMode>("silabas");
  const [refIdioma, setRefIdioma] = useState<IdiomaKey | null>(null);

  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = `sec-draft-${sec.id}-${idioma}`;
  const draft    = useDraftRestore({ key: draftKey, serverValue: serverVal, enabled: !!sec.id });

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

  const onChange = (val: string) => {
    setTexto(val);
    draft.save(val);
    setSt(s => ({ ...s, dirty: true, saved: false, mode: s.mode === "error" ? "idle" : s.mode, msg: null }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 1500);
  };

  // Líneas del texto activo y del idioma de referencia
  const lineas    = texto.split("\n");
  const refCampo  = refIdioma ? IDIOMAS.find(i => i.id === refIdioma)?.campo : null;
  const refTexto  = refCampo ? ((sec[refCampo] as string) || "") : null;
  const refLineas = refTexto ? refTexto.split("\n") : null;

  const rows = Math.max(3, lineas.length + 1);

  const borderClass =
    st.mode === "pending" ? "border-blue-500/40  focus:border-blue-500/60"  :
    st.mode === "error"   ? "border-red-500/40   focus:border-red-500/60"   :
    st.dirty              ? "border-amber-500/30 focus:border-amber-500/50" :
                            "border-primary/10   focus:border-primary/30";

  // Solo mostrar idiomas que tengan contenido y no sean el activo
  const refOpciones = IDIOMAS.filter(i => {
    if (i.id === idioma) return false;
    return ((sec[i.campo] as string) || "").trim().length > 0;
  });

  return (
    <div className="flex-1 min-w-0 space-y-1.5">
      <DraftRestoreBanner
        draft={draft}
        onRestore={(v) => { setTexto(v); draft.dismiss(); }}
        label="Borrador local disponible"
      />
      {st.mode === "pending" && !st.saving && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-400">
          <WifiOff size={10} />
          Guardado sin conexión — se sincronizará al reconectar
        </div>
      )}

      {/* ── Barra de controles ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Toggle sílabas / vocales */}
        <div className="flex gap-0.5 p-0.5 bg-primary/5 rounded-lg border border-primary/10">
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

        {/* Selector de referencia — solo aparece si hay otros idiomas con texto */}
        {refOpciones.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-widest text-primary/25">
              vs
            </span>
            <div className="flex gap-0.5 p-0.5 bg-primary/5 rounded-lg border border-primary/10">
              <button
                onClick={() => setRefIdioma(null)}
                className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${
                  refIdioma === null
                    ? "bg-primary text-bg-main"
                    : "text-primary/30 hover:text-primary/60"
                }`}
              >
                —
              </button>
              {refOpciones.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setRefIdioma(id === refIdioma ? null : id)}
                  className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${
                    refIdioma === id
                      ? "bg-primary text-bg-main"
                      : "text-primary/30 hover:text-primary/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Textarea + contadores ──────────────────────────────────── */}
      <div className="relative">
        <textarea
          value={texto}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
              e.preventDefault();
              doSave(texto);
            }
          }}
          rows={rows}
          spellCheck={false}
          className={`w-full bg-bg-main/60 border rounded-xl px-4 py-3
                      text-sm text-primary font-mono resize-none outline-none
                      transition-colors placeholder:text-primary/20 leading-relaxed
                      pr-16
                      ${borderClass}`}
          placeholder={`Letra en ${IDIOMAS.find(i => i.id === idioma)?.nombre}…`}
        />

        {/* Contadores por línea superpuestos a la derecha */}
        <div
          aria-hidden
          className="absolute top-0 right-0 flex flex-col pointer-events-none select-none"
          style={{ paddingTop: PAD_TOP }}
        >
          {lineas.map((linea, idx) => {
            const miN   = contar(linea, countMode);
            const refN  = refLineas ? contar(refLineas[idx] ?? "", countMode) : null;
            const vacia = linea.trim() === "";

            // Color: verde si coincide, rojo si no, neutro sin referencia
            let color = "";
            if (!vacia) {
              if (refN === null) {
                color = miN <= 6  ? "text-emerald-400/50"
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
                style={{ height: `${LINE_H}rem` }}
              >
                {!vacia && (
                  <>
                    {/* Mi conteo */}
                    <span className="text-[9px] font-black tabular-nums leading-none">
                      {miN}
                    </span>
                    {/* Conteo de referencia */}
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

        {/* Indicadores de estado (guardado, pendiente, etc.) */}
        <span className="absolute top-2 right-2 pointer-events-none flex flex-col items-end gap-1">
          {st.saving                           && <Loader2      size={11} className="animate-spin text-primary/30" />}
          {st.saved                            && <CheckCircle2 size={11} className="text-emerald-400" />}
          {st.mode === "pending" && !st.saving && <span className="w-2 h-2 rounded-full bg-blue-400" />}
          {st.mode === "error"                 && <AlertCircle  size={11} className="text-red-400" />}
        </span>
      </div>

      {st.mode === "error" && st.msg && (
        <p className="text-[9px] font-black uppercase text-red-400/80 tracking-widest px-1">⚠ {st.msg}</p>
      )}
    </div>
  );
};