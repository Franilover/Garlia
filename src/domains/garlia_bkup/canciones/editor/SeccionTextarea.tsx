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
   * SeccionTextarea). Se usa para extraer, en un solo recorrido del DOM
   * real, tanto el TEXTO como la ALTURA de cada fila visual del editor.
   *
   * Por qué se lee todo del DOM y no de `texto`: `texto` llega a este
   * componente ya serializado por richTextSerializer.serializeRootToRaw(),
   * que tiene sus propias reglas de cuántos "\n" representan cada tipo de
   * salto (un <br> interno = "\n"; un salto entre párrafos = "\n\n"; un
   * párrafo vacío real, cero texto entre esos "\n\n"). Esas reglas cambian
   * según el contenido (con y sin <br> internos, con y sin párrafos
   * vacíos), así que cualquier intento de "adivinar cuántas líneas fantasma
   * insertar" para que `texto.split("\n")` calce con el DOM es un parche
   * que se rompe con la siguiente combinación no probada — como pasó acá
   * en varias iteraciones. La única forma de que el texto de una fila y su
   * altura SIEMPRE coincidan es sacar ambos del mismo lugar en el mismo
   * recorrido: por cada <p>, por cada segmento entre <br>, se lee el
   * `textContent` de ese segmento Y se mide su altura, en la misma pasada.
   */
  editorRef,
}: {
  texto:    string;
  refTexto: string | null;
  countMode: CountMode;
  align?: "start" | "end";
  editorRef?: React.RefObject<HTMLElement | null>;
}) {
  const justify = align === "start" ? "justify-start" : "justify-end";
  const alturaFija = FONT_SIZE_PX * 1.7;

  // Fallback cuando no hay editorRef (p.ej. antes de montar, o un uso de
  // SyllableColumn sin editor asociado): se cae de vuelta al split simple
  // de siempre, con altura fija por fila.
  const lineasFallback = texto.split("\n");

  // ── Filas reales: texto + altura, extraídas del DOM en un solo paso ──
  type Fila = { texto: string; altura: number };
  const [filas, setFilas] = useState<Fila[] | null>(null);
  // Distancia real (px) entre el borde superior de `editorRef` (el wrapper
  // completo, que puede incluir una toolbar propia de RichEditor por
  // encima del área de texto — corrector ortográfico, exportar, etc.) y el
  // borde superior del primer párrafo de texto. Se mide en vivo en vez de
  // asumir un padding fijo, para que cualquier elemento antes del área de
  // texto quede compensado automáticamente.
  const [offsetTop, setOffsetTop] = useState<number | null>(null);

  useEffect(() => {
    const root = editorRef?.current;
    if (!root) { setFilas(null); setOffsetTop(null); return; }

    const medir = () => {
      const parrafos = Array.from(root.querySelectorAll<HTMLElement>("[data-lexical-editor] > p"));
      if (parrafos.length === 0) { setFilas(null); setOffsetTop(null); return; }

      const rootTop = root.getBoundingClientRect().top;
      setOffsetTop(parrafos[0].getBoundingClientRect().top - rootTop);

      const resultado: Fila[] = [];

      for (const p of parrafos) {
        // Cada <p> se parte en segmentos por cada <br> interno (Shift+Enter).
        // childNodes recorre spans de texto y <br> en orden real del DOM,
        // así que agrupar el texto entre <br> consecutivos da exactamente
        // las líneas visuales de ESTE párrafo — sin adivinar nada sobre
        // cómo se serializó a "\n" en otro lugar.
        const hijos = Array.from(p.childNodes);
        const segmentosTexto: string[] = [""];
        for (const hijo of hijos) {
          if (hijo.nodeName === "BR") {
            segmentosTexto.push("");
          } else {
            segmentosTexto[segmentosTexto.length - 1] += hijo.textContent ?? "";
          }
        }

        // Altura total del párrafo tal como se ve en pantalla, repartida
        // entre sus segmentos internos (si el texto además hace wrap
        // visual dentro de un segmento, el navegador ya refleja eso en la
        // altura total del <p> — repartirla en partes iguales entre los
        // segmentos declarados por Lexical sigue siendo la mejor
        // aproximación sin reimplementar el layout de texto).
        const totalH = p.getBoundingClientRect().height || alturaFija;
        const porSegmento = totalH / segmentosTexto.length;
        // El margin-bottom del <p> (separación real entre párrafos en
        // pantalla) no está incluido en getBoundingClientRect().height, y
        // solo existe visualmente DESPUÉS del último segmento de este
        // párrafo — por eso se suma únicamente ahí, no repartido entre
        // todos los segmentos internos.
        const margenInferior = parseFloat(getComputedStyle(p).marginBottom) || 0;

        segmentosTexto.forEach((seg, i) => {
          const esUltimo = i === segmentosTexto.length - 1;
          resultado.push({
            texto: seg,
            altura: porSegmento + (esUltimo ? margenInferior : 0),
          });
        });
      }

      setFilas(resultado);
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

  // El texto de referencia (columna opuesta, otro idioma) no siempre tiene
  // su propio editorRef medido acá — se empareja por índice de fila visual
  // contra `filas`/`lineasFallback`, que es la mejor correspondencia
  // disponible entre dos editores independientes.
  const refLineas = refTexto !== null ? refTexto.split("\n") : null;

  const usandoDom = filas !== null;
  const totalFilas = usandoDom ? filas!.length : lineasFallback.length;

  return (
    <div
      aria-hidden
      className="flex flex-col shrink-0 select-none"
      // Antes: paddingTop fijo de 4px (asumiendo que el editor arranca
      // pegado al wrapper). Ahora: el offset medido en vivo contra el
      // primer párrafo real — así compensa automáticamente cualquier
      // toolbar u otro elemento por encima del área de texto. Si aún no
      // midió (editor recién montado / sin editorRef), cae de vuelta a 4px.
      style={{ paddingTop: offsetTop ?? 4 }}
    >
      {Array.from({ length: totalFilas }, (_, idx) => {
        const miTxt  = usandoDom ? filas![idx].texto : lineasFallback[idx];
        const filaAltura = usandoDom ? filas![idx].altura : alturaFija;
        const refTxt = refLineas ? (refLineas[idx] ?? "") : "";
        const miVacia  = miTxt.trim() === "";
        const refVacia = refTxt.trim() === "";

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