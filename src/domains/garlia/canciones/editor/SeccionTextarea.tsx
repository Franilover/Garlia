"use client";

import { Loader2, CheckCircle2, AlertCircle, WifiOff, Circle } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef, useImperativeHandle } from "react";

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
  /**
   * Ref al contenedor que envuelve al RichEditor (ver uso más abajo en
   * SeccionTextarea). Se usa para medir la altura REAL de cada línea
   * renderizada en pantalla, en vez de asumir una altura fija por línea.
   *
   * Por qué hace falta: RichEditor usa `white-space: pre-wrap` +
   * `word-break: break-word` (ver RichEditor.tsx), así que una línea de
   * letra larga hace WRAP visual a 2+ líneas dentro del mismo <p> cuando
   * no cabe en el ancho del editor. Antes cada fila de esta columna medía
   * `FONT_SIZE_PX * 1.7` fijo, sin saber que una línea lógica podía ocupar
   * más alto en pantalla — resultado: apenas una sola línea larga hacía
   * wrap, todos los números de las filas siguientes quedaban más arriba
   * que su letra correspondiente (el desface que se reporta).
   *
   * Con `editorRef`, medimos el alto real de cada <p> (y de cada <br>
   * suelto dentro de él) vía ResizeObserver y usamos esas alturas en vez
   * de una constante — así cada número queda a la misma altura que su
   * línea, haga wrap o no.
   */
  editorRef,
}: {
  texto:    string;
  refTexto: string | null;
  countMode: CountMode;
  align?: "start" | "end";
  editorRef?: React.RefObject<HTMLElement | null>;
}) {
  const lineas = texto.split("\n");
  const refLineas = refTexto !== null ? refTexto.split("\n") : null;
  const justify = align === "start" ? "justify-start" : "justify-end";

  // ── Medición real de alturas de línea ───────────────────────────────
  // rowHeights[i] = alto en px de la fila i tal como se ve en pantalla.
  // Si no hay editorRef (o aún no midió), cae de vuelta a la altura fija
  // de siempre, así el componente sigue funcionando en cualquier lugar
  // donde no se le pase la referencia al editor.
  const alturaFija = FONT_SIZE_PX * 1.7;
  const [rowHeights, setRowHeights] = useState<number[] | null>(null);

  useEffect(() => {
    const root = editorRef?.current;
    if (!root) { setRowHeights(null); return; }

    const medir = () => {
      // Lexical serializa: un párrafo (<p>) por bloque de Enter, y dentro
      // de cada uno, un <br> por cada Shift+Enter. Un párrafo vacío
      // (`<p><br data-lexical-managed-linebreak></p>`) es UNA fila; un
      // párrafo con N <br> internos son N+1 filas dentro de ese <p> — hay
      // que medir cada segmento, no solo la altura total del <p>, porque
      // un párrafo con texto que hace wrap reparte su altura entre varias
      // filas lógicas de forma pareja, mientras uno con <br><br><br>
      // reparte su altura en franjas iguales por línea vacía.
      const parrafos = Array.from(root.querySelectorAll<HTMLElement>("[data-lexical-editor] > p"));
      if (parrafos.length === 0) { setRowHeights(null); return; }

      const alturas: number[] = [];
      for (const p of parrafos) {
        const totalH = p.getBoundingClientRect().height || alturaFija;
        // Cantidad de <br> dentro de este párrafo = líneas extra dentro
        // del mismo bloque (soft breaks). N <br> ⇒ N+1 filas lógicas.
        const brs = p.querySelectorAll("br").length;
        const segmentos = Math.max(1, brs + (brs === 0 ? 1 : brs));
        // Nota: cuando el párrafo tiene texto que además hace wrap visual
        // (más líneas en pantalla que <br> reales), el navegador ya lo
        // refleja en `totalH` — repartir esa altura entre los `segmentos`
        // lógicos declarados por Lexical sigue siendo la mejor aproximación
        // posible sin reimplementar el layout de texto nosotros mismos.
        const porSegmento = totalH / segmentos;
        for (let i = 0; i < segmentos; i++) alturas.push(porSegmento);
      }
      setRowHeights(alturas);
    };

    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(root);
    // También observamos mutaciones de contenido (escribir texto cambia
    // el wrap sin necesariamente disparar resize del contenedor).
    const mo = new MutationObserver(medir);
    mo.observe(root, { childList: true, subtree: true, characterData: true });

    return () => { ro.disconnect(); mo.disconnect(); };
  }, [editorRef, texto, alturaFija]);

  return (
    <div
      aria-hidden
      className="flex flex-col shrink-0 select-none"
      // El padding-top debe calzar con el padding-top real del editor
      // (RichEditor: "4px 8px 8px") para que la fila 0 arranque alineada.
      style={{ paddingTop: 4 }}
    >
      {lineas.map((linea, idx) => {
        const miTxt  = linea;
        const refTxt = refLineas ? (refLineas[idx] ?? "") : "";
        const miVacia  = miTxt.trim() === "";
        const refVacia = refTxt.trim() === "";
        const filaAltura = rowHeights?.[idx] ?? alturaFija;

        // Se muestra el número apenas UNO de los dos lados tenga texto en
        // esa fila (antes exigía que ambos tuvieran texto), para que una
        // línea sin sincronizar en el otro idioma no desaparezca de la
        // columna.
        if (miVacia && refVacia) {
          return (
            <div
              key={idx}
              className={`flex items-center ${justify} gap-0.5`}
              style={{ fontSize: FONT_SIZE_PX, lineHeight: 1.7, height: `${filaAltura}px` }}
            />
          );
        }

        const miN  = miVacia ? 0 : contar(miTxt, countMode);
        const refN = refLineas ? (refVacia ? 0 : contar(refTxt, countMode)) : null;

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
            style={{ fontSize: FONT_SIZE_PX, lineHeight: 1.7, height: `${filaAltura}px` }}
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

export const SeccionTextarea = React.forwardRef<HTMLDivElement, {
  sec:           Seccion;
  idioma:        IdiomaKey;
  refIdioma?:    IdiomaKey;
  onSave:        (id: string, updates: Partial<Seccion>) => Promise<void>;
  nombreSeccion?: string;
  countMode:     "silabas" | "vocales";
  showSyllableColumn?: boolean;
  onTextoChange?: (texto: string) => void;
}>(function SeccionTextarea({
  sec, idioma, refIdioma, onSave, nombreSeccion: _nombreSeccion, countMode,
  showSyllableColumn = true, onTextoChange,
}, forwardedEditorRef) {
  const campo     = IDIOMAS.find(i => i.id === idioma)!.campo;
  const serverVal = (sec[campo] as string) || "";

  const [texto, setTexto] = useState(serverVal);
  const [st,    setSt]    = useState<ColState>(IDLE_STATE);

  const timer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Envuelve al RichEditor para que SyllableColumn pueda medir la altura
  // real de cada línea renderizada (ver comentario en SyllableColumn).
  // También se expone hacia afuera vía forwardRef: PanelEditor lo usa
  // para que la columna central (compartida entre español y el idioma
  // de destino) mida el editor de español aunque viva en otro componente.
  const editorWrapRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedEditorRef, () => editorWrapRef.current as HTMLDivElement, []);
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
        <div className="flex-1 min-w-0" ref={editorWrapRef}>
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
            editorRef={editorWrapRef}
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
});