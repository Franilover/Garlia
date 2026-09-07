"use client";

import { Loader2, CheckCircle2, AlertCircle, WifiOff, Circle } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";

import { RichEditor } from "@/editor/lexical";
import { IDIOMAS, IDLE_STATE } from "@/domains/garlia/canciones/constants";
import { dexieSecGet } from "@/domains/garlia/canciones/seccionesDb";
import type { Seccion, IdiomaKey, ColState } from "@/domains/garlia/canciones/types";
import { DraftRestoreBanner, useDraftRestore } from "@/hooks/useEditorShared";

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

export function contar(linea: string, modo: CountMode) {
  return modo === "vocales" ? contarVocales(linea) : contarSilabas(linea);
}
export type { CountMode };

// ── Constantes de layout ─────────────────────────────────────────────────────
const FONT_SIZE_PX = 11;

// ── Columna de contadores ────────────────────────────────────────────────────

/**
 * Muestra el conteo de sílabas/vocales por línea en una columna lateral,
 * una fila por línea de texto. A diferencia del overlay anterior (que
 * posicionaba cada número en píxeles exactos sobre un <textarea>), esto
 * es una lista simple — RichEditor (Lexical/contentEditable) no tiene el
 * concepto de "línea de altura fija" que un textarea sí tiene, así que ya
 * no se puede alinear pixel-perfect con el texto real.
 */
export function SyllableColumn({
  texto,
  refTexto,
  countMode,
  align = "end",
}: {
  texto:    string;
  /**
   * Texto CRUDO (sin partir) de la columna de referencia. Antes este
   * prop llegaba ya partido en `string[]` vía `.split("\n")` desde el
   * padre — eso perdía la distinción entre "\n" (soft break, misma
   * línea de letra) y "\n\n" (nuevo párrafo), que es justo lo que hace
   * falta para alinear filas correctamente. Ver comentario de `aFilas`
   * más abajo.
   */
  refTexto: string | null;
  countMode: CountMode;
  align?: "start" | "end";
}) {
  // ── Por qué NO se puede usar texto.split("\n") a secas ─────────────────
  // RichEditor (richTextSerializer.ts, serializeRootToRaw) usa DOS
  // convenciones de salto de línea distintas al mismo tiempo:
  //   - Enter (nuevo párrafo)      → separador "\n\n" entre párrafos
  //   - Shift+Enter (soft break)   → un solo "\n" DENTRO de un párrafo
  //   - Línea en blanco intencional (párrafo vacío) → "\n\n\n" (3+)
  // texto.split("\n") trataba cada uno de esos "\n" como una fila nueva
  // sin distinguirlos: una letra escrita con Enter generaba una fila
  // vacía FANTASMA extra por cada salto de párrafo (por el "\n\n"),
  // mientras la misma letra en el otro idioma, si se tipeó con
  // Shift+Enter, no tenía esa fila vacía — la fila N de un idioma
  // terminaba comparada contra la fila N±1 del otro. Un primer intento
  // de arreglo (colapsar cualquier "\n{2,}" a un solo "\n") sí igualaba
  // el conteo, pero de paso fusionaba las líneas en blanco INTENCIONALES
  // que el usuario deja para separar estrofas, perdiéndolas.
  //
  // La forma correcta de partir en "filas visuales" es replicar cómo
  // Lexical arma el árbol: primero separar por PÁRRAFO ("\n\n" — cada
  // uno es un <p> real, incluidos los vacíos que representan una línea
  // en blanco intencional), y luego, dentro de cada párrafo, separar por
  // soft break ("\n" simple, cada uno un <br> dentro del mismo <p>). El
  // resultado tiene exactamente una fila por línea visible en pantalla,
  // sin fantasmas y sin perder las líneas en blanco reales.
  const aFilas = (s: string) =>
    s.split("\n\n").flatMap((parrafo) => parrafo.split("\n"));

  const lineas = aFilas(texto);
  const refLineasNorm = refTexto !== null ? aFilas(refTexto) : null;
  const justify = align === "start" ? "justify-start" : "justify-end";

  return (
    <div
      aria-hidden
      className="flex flex-col shrink-0 select-none"
      // El padding-top y el line-height deben calzar exactamente con el
      // RichEditor (fontSize 11px, lineHeight 1.7, padding "4px 8px 8px")
      // para que cada número quede alineado con su línea real de texto.
      style={{ paddingTop: 4 }}
    >
      {lineas.map((linea, idx) => {
        const miTxt  = linea;
        const refTxt = refLineasNorm ? (refLineasNorm[idx] ?? "") : "";
        const miVacia  = miTxt.trim() === "";
        const refVacia = refTxt.trim() === "";

        // Antes solo se mostraba el número si AMBOS lados tenían texto en
        // esa fila (refN === null cuando no había refLineas en absoluto).
        // Ahora se muestra el número apenas UNO de los dos lados tenga
        // texto, para que una línea sin sincronizar en el otro idioma
        // (o directamente vacía/faltante) sea visible como "N/0" o "0/N"
        // en vez de desaparecer de la columna.
        if (miVacia && refVacia) {
          return (
            <div
              key={idx}
              className={`flex items-center ${justify} gap-0.5`}
              style={{ fontSize: FONT_SIZE_PX, lineHeight: 1.7, height: `${FONT_SIZE_PX * 1.7}px` }}
            />
          );
        }

        const miN  = miVacia ? 0 : contar(miTxt, countMode);
        const refN = refLineasNorm ? (refVacia ? 0 : contar(refTxt, countMode)) : null;

        let color = "";
        if (refN === null) {
          color =
            miN <= 6  ? "text-primary/30"
          : miN <= 10 ? "text-amber-400/50"
          :             "text-rose-400/50";
        } else {
          color = miN === refN ? "text-emerald-400/90" : "text-rose-400/90";
        }

        return (
          <div
            key={idx}
            className={`flex items-center ${justify} gap-0.5 ${color}`}
            style={{ fontSize: FONT_SIZE_PX, lineHeight: 1.7, height: `${FONT_SIZE_PX * 1.7}px` }}
          >
            <span className="text-micro font-black tabular-nums leading-none">
              {miN}
            </span>
            {refN !== null && (
              <>
                <span className="text-micro opacity-40 mx-px">/</span>
                <span className="text-micro font-black tabular-nums leading-none opacity-55">
                  {refN}
                </span>
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
  sec, idioma, refIdioma, onSave, nombreSeccion: _nombreSeccion, countMode,
  showSyllableColumn = true, onTextoChange,
}: {
  sec:           Seccion;
  idioma:        IdiomaKey;
  refIdioma?:    IdiomaKey;
  onSave:        (id: string, updates: Partial<Seccion>) => Promise<void>;
  nombreSeccion?: string;
  countMode:     "silabas" | "vocales";
  showSyllableColumn?: boolean;
  onTextoChange?: (texto: string) => void;
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
          onTextoChange?.(localVal);
          setSt({ ...IDLE_STATE, dirty: true, mode: "pending", msg: "Pendiente de sincronizar" });
        } else {
          setTexto(serverVal);
          onTextoChange?.(serverVal);
          setSt(IDLE_STATE);
        }
      } catch {
        setTexto(serverVal);
        onTextoChange?.(serverVal);
        setSt(IDLE_STATE);
      }
    };
    void loadLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    onTextoChange?.(val);
    draft.save(val);
    setSt(s => ({ ...s, dirty: true, saved: false, mode: s.mode === "error" ? "idle" : s.mode, msg: null }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 1500);
  }, [doSave, draft, onTextoChange]);

  // ── Texto de referencia (columna opuesta en split mode) ─────────────────
  const refCampo = refIdioma ? IDIOMAS.find(i => i.id === refIdioma)?.campo : null;
  // Texto crudo, SIN partir — SyllableColumn necesita ver los "\n" y
  // "\n\n" originales tal cual los serializó RichEditor para poder
  // separar filas correctamente (ver comentario en aFilas dentro de
  // SyllableColumn). Partir acá con .split("\n") perdía esa distinción.
  const refTexto = refCampo ? ((sec[refCampo] as string) || "") : null;


  // ── Border según estado ──────────────────────────────────────────────────
  // RichEditor usa su propio borde; lo sobreescribimos vía className
  // en el div contenedor para indicar estado de guardado. El estado
  // "dirty" (cambios sin guardar aún) ya no se muestra como anillo
  // amarillo — en su lugar hay un ícono sutil junto al tick de guardado.
  const statusRingClass =
    st.mode === "pending" ? "ring-1 ring-blue-500/40"  :
    st.mode === "error"   ? "ring-1 ring-red-500/40"   :
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
        <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1 bg-blue-500/10 border border-blue-500/20 rounded-xl text-micro font-black uppercase tracking-widest text-blue-400">
          <WifiOff size={10} />
          Guardado sin conexión — se sincronizará al reconectar
        </div>
      )}

      {/* ── Indicadores de estado — solo si hay algo que mostrar ── */}
      {(st.saving || st.saved || st.dirty || st.mode === "pending" || st.mode === "error") && (
        <div className="flex justify-end mb-0.5">
          <span className="flex items-center gap-1.5 pr-1">
            {st.saving                           && <Loader2      className="animate-spin text-primary/30" size={11} />}
            {st.saved                            && <CheckCircle2 className="text-emerald-400" size={11} />}
            {st.dirty && !st.saving              && <Circle       className="text-amber-400 fill-amber-400" size={7} />}
            {st.mode === "pending" && !st.saving && <span className="w-2 h-2 rounded-full bg-blue-400" />}
            {st.mode === "error"                 && <AlertCircle  className="text-red-400" size={11} />}
          </span>
        </div>
      )}

      {/* ── Editor con columna de contadores al costado ── */}
      <div className={`flex items-start gap-1 ${statusRingClass}`}>
        <div className="flex-1 min-w-0">
          <RichEditor
            editable
            minHeight="4rem"
            placeholder={`Letra en ${IDIOMAS.find(i => i.id === idioma)?.nombre}…`}
            value={texto}
            onChange={onChange}
          />
        </div>
        {showSyllableColumn && (
          <SyllableColumn
            countMode={countMode}
            refTexto={refTexto}
            texto={texto}
          />
        )}
      </div>

      {/* ── Mensaje de error ── */}
      {st.mode === "error" && st.msg && (
        <p className="text-micro font-black uppercase text-red-400/80 tracking-widest px-1">⚠ {st.msg}</p>
      )}
    </div>
  );
};