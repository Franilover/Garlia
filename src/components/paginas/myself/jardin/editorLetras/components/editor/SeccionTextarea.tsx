"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle, WifiOff } from "lucide-react";
import { DraftRestoreBanner, useDraftRestore } from "@/hooks/useEditorShared";
import { dexieSecGet } from "../../lib/seccionesDb";
import { IDIOMAS, IDLE_STATE } from "../../constants";
import type { Seccion, IdiomaKey, ColState } from "../../types";

export const SeccionTextarea = ({
  sec, idioma, onSave,
}: {
  sec: Seccion;
  idioma: IdiomaKey;
  onSave: (id: string, updates: Partial<Seccion>) => Promise<void>;
}) => {
  const campo = IDIOMAS.find(i => i.id === idioma)!.campo;
  const serverVal = (sec[campo] as string) || "";
  const [texto, setTexto] = useState(serverVal);
  const [st, setSt]       = useState<ColState>(IDLE_STATE);
  const timer             = useRef<any>(null);
  const draftKey          = `sec-draft-${sec.id}-${idioma}`;
  const draft             = useDraftRestore({ key: draftKey, serverValue: serverVal, enabled: !!sec.id });

  useEffect(() => {
    clearTimeout(timer.current);
    const loadLocal = async () => {
      try {
        const local = await dexieSecGet(sec.id);
        const localVal = local?.[campo] as string | undefined;
        const remoteVal = serverVal;
        if (local?.status === "pending" && localVal !== undefined && localVal !== remoteVal) {
          setTexto(localVal);
          setSt({ ...IDLE_STATE, dirty: true, mode: "pending", msg: "Pendiente de sincronizar" });
        } else {
          setTexto(remoteVal);
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
    clearTimeout(timer.current);
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
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 1500);
  };

  const rows = Math.max(3, texto.split("\n").length + 1);
  const borderClass =
    st.mode === "pending" ? "border-blue-500/40  focus:border-blue-500/60"  :
    st.mode === "error"   ? "border-red-500/40   focus:border-red-500/60"   :
    st.dirty              ? "border-amber-500/30 focus:border-amber-500/50" :
                            "border-primary/10   focus:border-primary/30";

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
      <div className="relative">
        <textarea
          value={texto}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); doSave(texto); } }}
          rows={rows}
          spellCheck={false}
          className={`w-full bg-bg-main/60 border rounded-xl px-4 py-3 text-sm text-primary font-mono resize-none outline-none transition-colors placeholder:text-primary/20 leading-relaxed ${borderClass}`}
          placeholder={`Letra en ${IDIOMAS.find(i => i.id === idioma)?.nombre}…`}
        />
        <span className="absolute top-2 right-2 pointer-events-none flex flex-col items-end gap-1">
          {st.saving                          && <Loader2     size={11} className="animate-spin text-primary/30" />}
          {st.saved                           && <CheckCircle2 size={11} className="text-emerald-400" />}
          {st.mode === "pending" && !st.saving && <span className="w-2 h-2 rounded-full bg-blue-400" />}
          {st.mode === "error"                && <AlertCircle  size={11} className="text-red-400" />}
        </span>
      </div>
      {st.mode === "error" && st.msg && (
        <p className="text-[9px] font-black uppercase text-red-400/80 tracking-widest px-1">⚠ {st.msg}</p>
      )}
    </div>
  );
};
