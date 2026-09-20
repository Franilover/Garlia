"use client";

import { Sparkles, Loader2, Save, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

import { SaveIndicator } from "@/domains/garlia/_shared/UIComponents";
import { type SaveStatus } from "@/ui/saveStatus";
import { useConfirm } from "@/ui/ConfirmModal";

import { useElementos } from "./useElementos";
import { useFenomenos } from "./useFenomenos";
import { useFenomenoElementos } from "./useFenomenoElementos";
import { useFenomenoProcesos } from "./useFenomenoProcesos";
import { useProcesos } from "./useProcesos";
import type { Fenomeno } from "./types";

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  return String(value);
}

function FenomenoDetail({ fenomeno }: { fenomeno: Fenomeno }) {
  const { items: relacionesProcesos, loading: loadingProcesos } = useFenomenoProcesos(fenomeno.id);
  const { items: procesos } = useProcesos();
  const { items: relacionesElementos, loading: loadingElementos } = useFenomenoElementos(fenomeno.id);
  const { items: elementos } = useElementos();

  return (
    <div className="flex flex-col gap-3">
      {fenomeno.simbolo && (
        <header className="flex items-start gap-2">
          <span className="rounded px-1.5 py-0.5 bg-primary/5 text-micro font-bold text-primary/40">
            {fenomeno.simbolo}
          </span>
        </header>
      )}

      <div className="grid grid-cols-2 gap-3 items-start">
        <div className="flex flex-col gap-1.5 min-w-0 p-2">
          <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
            Procesos
          </span>
          <p className="text-micro text-primary/35 -mt-1">Procesos que intervienen en este fenómeno</p>
          {loadingProcesos ? (
            <div className="flex items-center gap-1.5 py-2 text-micro text-primary/40">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
            </div>
          ) : relacionesProcesos.length === 0 ? (
            <p className="py-1 text-micro text-primary/30">Sin procesos asociados.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {relacionesProcesos.map((relacion) => {
                const proceso = procesos.find((item) => item.id === relacion.proceso_id);
                return (
                  <div
                    key={relacion.id}
                    className="flex items-center justify-between gap-2 px-2 py-1"
                  >
                    <span className="text-micro font-bold text-primary/70 truncate">
                      {proceso?.nombre ?? relacion.proceso_id.slice(0, 8)}
                    </span>
                    {relacion.rol && <span className="text-micro text-primary/45 shrink-0">{relacion.rol}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 min-w-0 p-2">
          <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
            Elementos
          </span>
          <p className="text-micro text-primary/35 -mt-1">Elementos involucrados en este fenómeno</p>
          {loadingElementos ? (
            <div className="flex items-center gap-1.5 py-2 text-micro text-primary/40">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
            </div>
          ) : relacionesElementos.length === 0 ? (
            <p className="py-1 text-micro text-primary/30">Sin elementos asociados.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {relacionesElementos.map((relacion) => {
                const elemento = elementos.find((item) => item.id === relacion.elemento_id);
                return (
                  <div key={relacion.id} className="px-2 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-micro font-bold text-primary/70 truncate">
                        {elemento?.nombre ?? relacion.elemento_id.slice(0, 8)}
                      </span>
                      <span className="text-micro text-primary/45 shrink-0">× {formatValue(relacion.cantidad)}</span>
                    </div>
                    {relacion.rol && <div className="mt-0.5 text-micro text-primary/35">{relacion.rol}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {fenomeno.notas && (
        <div className="flex flex-col gap-1.5 min-w-0 p-2">
          <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
            Notas
          </span>
          <p className="whitespace-pre-wrap text-micro leading-relaxed text-primary/50">{fenomeno.notas}</p>
        </div>
      )}
    </div>
  );
}

function Editor({
  fenomeno,
  onClose,
  onRename,
  onDelete,
}: {
  fenomeno: Fenomeno;
  onClose: () => void;
  /** Renombrado on-blur con guardado inmediato, mismo patrón que
   *  useFenomenos().renombrarFenomeno. Si se omite, el nombre queda de
   *  solo lectura. */
  onRename?: (nuevoNombre: string) => void;
  /** Elimina el fenómeno y cierra el panel. Si se omite, no se muestra el
   *  botón de borrar. */
  onDelete?: () => void;
}) {
  const [nombreLocal, setNombreLocal] = useState(fenomeno.nombre);
  const [status, setStatus] = useState<SaveStatus>("idle");
  useEffect(() => setNombreLocal(fenomeno.nombre), [fenomeno.id, fenomeno.nombre]);

  async function guardarNombre() {
    if (!onRename) return;
    const nuevo = nombreLocal.trim();
    if (!nuevo || nuevo === fenomeno.nombre) {
      setNombreLocal(fenomeno.nombre);
      return;
    }
    setStatus("saving");
    try {
      await onRename(nuevo);
      setStatus("saved");
    } catch (e) {
      console.error("[FenomenosPage] error renombrando:", e);
      setStatus("error");
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{ background: "color-mix(in srgb, var(--primary) 35%, transparent)", backdropFilter: "blur(8px)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          {onRename ? (
            <input
              className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
              placeholder="Nombre del fenómeno"
              value={nombreLocal}
              onChange={(e) => setNombreLocal(e.target.value)}
              onBlur={guardarNombre}
            />
          ) : (
            <span className="flex-1 min-w-0 truncate text-sm font-black text-primary">
              {fenomeno.nombre}
            </span>
          )}

          <div className="shrink-0 flex items-center gap-1.5">
            <SaveIndicator status={status} />
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-micro font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
              >
                <Trash2 size={10} />
              </button>
            )}
            {onRename && (
              <button
                type="button"
                disabled={status === "saving"}
                onClick={guardarNombre}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-micro font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                <Save size={10} /> Guardar
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Cerrar (Esc)"
            className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
          <FenomenoDetail fenomeno={fenomeno} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function FenomenosPage() {
  const { items, loading, renombrarFenomeno, eliminarFenomeno } = useFenomenos();
  const { confirm, ConfirmModal } = useConfirm();
  const [selected, setSelected] = useState<Fenomeno | null>(null);

  return (
    <div className="px-3 pb-4 pt-2">
      {loading ? (
        <p className="py-5 text-center text-micro text-primary/35">Cargando…</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              title={item.nombre}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/15 px-2.5 py-1 text-micro font-bold tracking-wide text-primary/70 transition-colors hover:border-primary/30 hover:bg-primary/10"
            >
              <Sparkles className="h-3 w-3 shrink-0 opacity-45" />
              <span className="truncate">{item.nombre}</span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <Editor
          fenomeno={selected}
          onClose={() => setSelected(null)}
          onRename={(nuevoNombre) => renombrarFenomeno(selected.id, nuevoNombre)}
          onDelete={async () => {
            const ok = await confirm({
              title: "Eliminar fenómeno",
              message: `¿Eliminar "${selected.nombre}"? Esta acción no se puede deshacer.`,
            });
            if (!ok) return;
            await eliminarFenomeno(selected.id);
            setSelected(null);
          }}
        />
      )}
      <ConfirmModal />
    </div>
  );
}
