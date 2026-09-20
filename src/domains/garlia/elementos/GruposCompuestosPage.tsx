"use client";

/**
 * GruposCompuestosPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Ya NO existe la sub-sección de página "Grupos de compuestos" (la tabla
 * "grupos_compuestos" fue eliminada de Supabase hace tiempo). Este archivo
 * solo sobrevive por GrupoCompuestoPanelFlotante: el modal genérico de
 * edición de un Órgano ya vinculado — nombre, función, fórmula (vía
 * SelectorFormulaTejidos + useOrganoTejidos) y notas — que reutilizan
 * MineralEditor, EditorItem, EditorCriatura, FloraEditor, BiologiaPage y
 * GridCatalogoGrupo. Recibe el registro por props (grupo, onActualizar,
 * onEliminar) y resuelve su propia composición internamente.
 *
 * NOTA: este componente manejaba antes dos catálogos hermanos, Órgano y
 * Formación (parametrizado por `tipo`), con Formación resolviendo su
 * fórmula vía Vetas/Granos. Formación/Veta/Grano fueron removidos por
 * completo del proyecto — decisión explícita del usuario — así que este
 * panel ya solo maneja Órgano, y el prop `tipo` desapareció.
 */

import { Boxes, Beaker, ChevronLeft, Layers, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { SelectorFormulaTejidos, type FilaFormulaTejido } from "@/domains/garlia/_shared/SelectorFormulaTejidos";
import { SaveIndicator } from "@/domains/garlia/_shared/UIComponents";
import { type SaveStatus } from "@/ui/saveStatus";
import { useOrganoTejidos } from "@/domains/garlia/elementos/useOrganoTejidos";
import { useCatalogoTejidos } from "@/domains/garlia/elementos/useCatalogoTejidos";
import { useCelulas } from "@/domains/garlia/elementos/useCelulas";
import { useTejidos } from "@/domains/garlia/elementos/useTejidos";
import { PanelEditorTejido, PanelEditorCelula } from "@/domains/garlia/biologia/CatalogoTejidosBiologia";
import { BreadcrumbJerarquia } from "@/domains/garlia/biologia/BreadcrumbJerarquia";
import { useCelulasDeUnOrgano } from "@/domains/garlia/elementos/useCelulasDeUnOrgano";
import { useSistemasYOrganismosDeOrganos } from "@/domains/garlia/elementos/useSistemasYOrganismosDeOrganos";
import type { EntradaCatalogoGrupo } from "@/domains/garlia/_shared/useEntidadVinculosGrupo";

import type { Compuesto } from "./types";

/**
 * Portal propio SOLO para el segundo nivel de anidamiento real (Célula
 * abierta DESDE ADENTRO del panel de Tejido) — ahí sí hay dos niveles
 * simultáneos genuinos y necesita su propio marco flotante encima. El
 * primer nivel (Tejido o Célula abiertos directo desde la fórmula del
 * Órgano) ya NO usa este portal: reemplaza el contenido de cajaInterna en
 * el mismo marco de siempre, para no verse como "otro modal" — ver el
 * bloque de abajo que arma `contenidoActivo`.
 */
function MiniPortalAnidado({
  children,
  onCerrar,
}: {
  children: React.ReactNode;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCerrar]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{
        backdropFilter: "blur(4px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * Panel flotante centrado del detalle de un Órgano — mismo comportamiento
 * visual que ElementoPanelFlotante/CompuestoPanelFlotante en
 * ElementosPage.tsx: modal centrado con backdrop blur, cierra con click en
 * el backdrop, Escape, o el botón X.
 */
export function GrupoCompuestoPanelFlotante({
  grupo,
  compuestos,
  onCerrar,
  onBack,
  onActualizar,
  onEliminar,
  onAbrirCompuesto,
  onAbrirOrganoExterno,
  onAbrirSistemaExterno,
  onAbrirOrganismoExterno,
  sinAnimacion,
  sinPortalPropio,
}: {
  grupo: EntradaCatalogoGrupo;
  compuestos: Compuesto[];
  onCerrar: () => void;
  /** Flecha de volver a la izquierda del header — mismo lugar que
   *  ChevronLeft en CompuestoEditor/ElementoEditor. Opcional. */
  onBack?: () => void;
  onActualizar: (id: string, cambios: Partial<EntradaCatalogoGrupo>) => void;
  onEliminar?: (id: string) => void;
  onAbrirCompuesto?: (compuestoId: string) => void;
  /**
   * Navegar a OTRO Órgano desde el breadcrumb "Tejido → Órgano" dentro del
   * PanelEditorTejido anidado — ese Tejido puede pertenecer a un Órgano
   * distinto al que este panel muestra. Cierra este modal y delega en el
   * padre (BiologiaPage) abrir el editor del Órgano elegido, mismo patrón
   * que onAbrirCompuesto.
   */
  onAbrirOrganoExterno?: (organoId: string) => void;
  /**
   * Navegar al Sistema elegido desde el nivel "Sistema" del breadcrumb de
   * este Órgano — cierra este modal y delega en el padre (BiologiaPage)
   * abrir el editor del Sistema, mismo patrón que onAbrirOrganoExterno.
   */
  onAbrirSistemaExterno?: (sistemaId: string) => void;
  /**
   * Navegar al Organismo elegido desde el nivel "Organismo" del breadcrumb
   * de este Órgano (techo de la cadena) — mismo patrón que
   * onAbrirSistemaExterno.
   */
  onAbrirOrganismoExterno?: (organismoId: string) => void;
  /** true cuando este panel se abrió como salto desde OTRO nivel del
   *  breadcrumb — suprime la animación de entrada. */
  sinAnimacion?: boolean;
  /**
   * true para que este panel no monte su propio createPortal/backdrop —
   * en su lugar, un shell compartido (ver PanelFlotanteShellBiologia en
   * BiologiaPage.tsx) provee un único portal para los 3 catálogos
   * hermanos de Biología (Célula/Tejido, Sistema/Organismo, Órgano),
   * eliminando el parpadeo al saltar entre ellos.
   */
  sinPortalPropio?: boolean;
}) {
  const tejidos = useOrganoTejidos(grupo.id);
  const formula = tejidos;
  // Unión transitiva de TODAS las Células de TODOS los Tejidos de este
  // Órgano (a diferencia de `tejidos.items`, que solo trae la primera
  // Célula por fila) — usada en el nivel "Célula" del breadcrumb.
  const celulasDelOrgano = useCelulasDeUnOrgano(grupo.id);
  // Sistemas que usan este Órgano y, a partir de esos Sistemas, los
  // Organismos que los usan — completa los dos niveles de arriba del
  // breadcrumb (Célula ⇄ Tejido ⇄ Órgano ⇄ Sistema ⇄ Organismo).
  const sistemasYOrganismos = useSistemasYOrganismosDeOrganos([grupo.id]);
  const catalogo = useCatalogoTejidos();

  // ── Editor completo del Tejido propio de una fila de la fórmula — mismo
  // panel que Biología > Catálogo de Tejidos (ver CatalogoTejidosBiologia.tsx),
  // reutilizado acá para no duplicar el editor. Solo se instancian los
  // catálogos globales (useCelulas/useTejidos) cuando el panel está
  // realmente abierto. ───────────────────────────────────────────────────
  const [tejidoAbiertoId, setTejidoAbiertoId] = useState<string | null>(null);
  // Editor de la Célula que compone una fila — abierto directo desde
  // "hecho de: [Célula]" en SelectorFormulaTejidos (cadena real
  // Tejido→Célula→Compuesto), o desde adentro de PanelEditorTejido al
  // navegar Tejido→Célula. Mismo shape de estado que tejidoAbiertoId, pero
  // apunta a Célula — panel independiente, no reemplaza al de arriba
  // (pueden estar los dos abiertos: Tejido debajo, Célula encima). ───────
  const [celulaAbiertaId, setCelulaAbiertaId] = useState<string | null>(null);
  const celulasCatalogo = useCelulas();
  const tejidosCatalogo = useTejidos();

  // SaveIndicator + botón Guardar explícito en el header — el guardado
  // real sigue siendo autosave on-change (onActualizar ya persiste),
  // mismo criterio que PanelFlotanteHeader en CatalogoTejidosBiologia/
  // CatalogoSistemasBiologia: el botón solo confirma visualmente.
  const [status, setStatus] = useState<SaveStatus>("idle");
  function handleGuardar() {
    setStatus("saving");
    setStatus("saved");
  }

  useEffect(() => {
    if (sinPortalPropio) return; // el shell externo ya maneja Escape + scroll lock
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCerrar, sinPortalPropio]);

  // Contenido de la caja blanca (header + body) — se reutiliza tanto en el
  // modo con portal propio como en el modo "shell externo". Contenido
  // propio del Órgano (header + fórmula + función/notas) — se muestra
  // dentro del marco cuando NO hay Tejido/Célula de una fila abierto; si
  // hay uno abierto, el marco muestra ESE editor en su lugar (ver
  // cajaInterna más abajo) en vez de apilar un modal nuevo encima con su
  // propio marco — mismo mecanismo que el shell de BiologiaPage.tsx para
  // los 5 niveles raíz, aplicado acá para este nivel de anidamiento
  // (Órgano ⇄ su Tejido/Célula de una fila).
  const contenidoOrgano = (
      <>
        {/* Header: flecha volver (opcional) + nombre editable + SaveIndicator
            + Guardar + eliminar + cerrar */}
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Volver"
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer"
            >
              <ChevronLeft size={12} />
            </button>
          )}
          <input
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
            placeholder="Nombre (ej: Hoja)…"
            value={grupo.nombre ?? ""}
            onChange={(e) => onActualizar(grupo.id, { nombre: e.target.value })}
          />
          <div className="shrink-0 flex items-center gap-1.5">
            <SaveIndicator status={status} />
            {onEliminar && (
              <button
                type="button"
                onClick={() => onEliminar(grupo.id)}
                title="Eliminar"
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-micro font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
              >
                <Trash2 size={10} />
              </button>
            )}
            <button
              type="button"
              disabled={status === "saving"}
              onClick={handleGuardar}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-micro font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
            >
              <Save size={10} /> Guardar
            </button>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar (Esc)"
            className="shrink-0 p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="shrink-0 px-3 pt-2">
          <BreadcrumbJerarquia
            niveles={[
              {
                label: "Célula",
                icono: <Beaker size={10} />,
                activo: false,
                items: celulasDelOrgano.items.map((c) => ({ id: c.id, nombre: c.nombre })),
                loading: celulasDelOrgano.loading,
                onNavegar: (celulaId) => setCelulaAbiertaId(celulaId),
              },
              {
                label: "Tejido",
                icono: <Layers size={10} />,
                activo: false,
                items: tejidos.items.map((f) => ({ id: f.tejido_id, nombre: f.nombre })),
                loading: tejidos.loading,
                onNavegar: (tejidoId) => setTejidoAbiertoId(tejidoId),
              },
              { label: "Órgano", icono: <Boxes size={10} />, activo: true },
              {
                label: "Sistema",
                icono: <Layers size={10} />,
                activo: false,
                items: sistemasYOrganismos.sistemaItems.map((s) => ({ id: s.id, nombre: s.nombre })),
                loading: sistemasYOrganismos.loading,
                onNavegar: onAbrirSistemaExterno,
              },
              {
                label: "Organismo",
                icono: <Boxes size={10} />,
                activo: false,
                items: sistemasYOrganismos.organismoItems.map((o) => ({ id: o.id, nombre: o.nombre })),
                loading: sistemasYOrganismos.loading,
                onNavegar: onAbrirOrganismoExterno,
              },
            ]}
          />
        </div>

        {/* Contenido: dos columnas — izquierda composición (fórmula),
            derecha texto (función + notas). Header ya tiene el título. */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Columna izquierda: composición / vínculos */}
            <div className="md:w-1/2 min-w-0">
              <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-1.5">
                Fórmula
              </p>
              {formula.loading ? (
                <p className="text-micro text-primary/25 italic">Cargando…</p>
              ) : (
                <SelectorFormulaTejidos
                  items={formula.items as unknown as FilaFormulaTejido[]}
                  onVincularExistente={(id) => void formula.vincularExistente(id)}
                  onCrearYVincular={(nombre) => void formula.crearYVincular(nombre)}
                  catalogoDisponible={catalogo.items}
                  loadingCatalogo={catalogo.loading}
                  labelCatalogo="Tejido"
                  onActualizarProporcion={(vinculoId, proporcion) =>
                    void formula.actualizarProporcion(vinculoId, proporcion)
                  }
                  onQuitar={(vinculoId) => void formula.quitarCompuesto(vinculoId)}
                  onAbrirCelula={(celulaId) => setCelulaAbiertaId(celulaId)}
                  onAbrirTejido={(tejidoId) => setTejidoAbiertoId(tejidoId)}
                />
              )}
            </div>

            {/* Columna derecha: bloques de texto — función + notas */}
            <div className="md:w-1/2 min-w-0 flex flex-col gap-4">
              <div>
                <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-1.5">
                  Función
                </p>
                <input
                  className="w-full bg-transparent px-0 py-1 text-xs text-primary/80 outline-none placeholder:text-primary/25"
                  placeholder="Para qué sirve…"
                  value={grupo.funcion ?? ""}
                  onChange={(e) => onActualizar(grupo.id, { funcion: e.target.value })}
                />
              </div>

              <div>
                <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-1.5">
                  Notas
                </p>
                <textarea
                  className="w-full min-h-[6rem] bg-transparent px-0 py-1 text-xs text-primary/70 resize-none outline-none transition-colors placeholder:text-primary/25"
                  placeholder="Notas…"
                  value={grupo.notas ?? ""}
                  onChange={(e) => onActualizar(grupo.id, { notas: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </>
  );

  // Editor de Tejido de una fila de la fórmula — reemplaza el contenido
  // del Órgano DENTRO DEL MISMO marco cuando está abierto (en vez de
  // apilarse como un modal nuevo encima). El editor de Célula que cuelga
  // de una fila de ESE Tejido (si el usuario navega un nivel más adentro)
  // sí necesita su propio mini-portal — ver más abajo.
  const tejidoActivo = tejidosCatalogo.items.find((t) => t.id === tejidoAbiertoId) ?? null;

  // Editor de Célula de una fila de la fórmula del Órgano DIRECTO (no
  // anidado dentro de un Tejido) — mismo mecanismo: reemplaza el
  // contenido del Órgano dentro del mismo marco.
  const celulaActivaDirecta = !tejidoAbiertoId
    ? celulasCatalogo.items.find((c) => c.id === celulaAbiertaId) ?? null
    : null;

  let contenidoActivo: React.ReactNode = contenidoOrgano;

  if (tejidoActivo) {
    contenidoActivo = (
      <PanelEditorTejido sinMarco
        item={tejidoActivo}
        celulas={celulasCatalogo.items}
        loadingCelulas={celulasCatalogo.loading}
        compuestos={compuestos}
        onCerrar={() => setTejidoAbiertoId(null)}
        onActualizar={tejidosCatalogo.actualizar}
        onEliminar={tejidosCatalogo.eliminar}
        onAbrirCelula={(celulaId) => setCelulaAbiertaId(celulaId)}
        onAbrirOrgano={(organoId) => {
          setTejidoAbiertoId(null);
          onCerrar();
          onAbrirOrganoExterno?.(organoId);
        }}
        onAbrirCompuesto={
          onAbrirCompuesto
            ? (compuestoId) => {
                setTejidoAbiertoId(null);
                onCerrar();
                onAbrirCompuesto(compuestoId);
              }
            : undefined
        }
      />
    );
  } else if (celulaActivaDirecta) {
    contenidoActivo = (
      <PanelEditorCelula sinMarco
        item={celulaActivaDirecta}
        compuestos={compuestos}
        onCerrar={() => setCelulaAbiertaId(null)}
        onActualizar={celulasCatalogo.actualizar}
        onEliminar={celulasCatalogo.eliminar}
        onAbrirCompuesto={
          onAbrirCompuesto
            ? (compuestoId) => {
                setCelulaAbiertaId(null);
                onCerrar();
                onAbrirCompuesto(compuestoId);
              }
            : undefined
        }
        onAbrirTejido={(tejidoId) => {
          setCelulaAbiertaId(null);
          setTejidoAbiertoId(tejidoId);
        }}
      />
    );
  }

  // Marco blanco compartido — SIEMPRE el mismo nodo, sin importar qué
  // nivel (Órgano, Tejido, o Célula directo) esté activo. Solo cambia
  // `contenidoActivo` adentro — así nunca se ve como "otro modal
  // apilado", es el mismo panel reemplazando su contenido.
  const cajaInterna = (
      <div
        className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: sinAnimacion ? "none" : "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {contenidoActivo}
      </div>
  );

  // Segundo nivel de anidamiento real: Célula abierta DESDE ADENTRO del
  // panel de Tejido que ya reemplazó el contenido de arriba — acá sí hay
  // dos niveles simultáneos genuinos (Tejido de fondo, Célula encima), así
  // que la Célula sí necesita su propio marco flotante.
  const celulaAnidadaEnTejido = tejidoAbiertoId
    ? celulasCatalogo.items.find((c) => c.id === celulaAbiertaId) ?? null
    : null;

  const editoresAnidados = celulaAnidadaEnTejido ? (
    <MiniPortalAnidado onCerrar={() => setCelulaAbiertaId(null)}>
      <PanelEditorCelula
        item={celulaAnidadaEnTejido}
        compuestos={compuestos}
        onCerrar={() => setCelulaAbiertaId(null)}
        onActualizar={celulasCatalogo.actualizar}
        onEliminar={celulasCatalogo.eliminar}
        onAbrirCompuesto={
          onAbrirCompuesto
            ? (compuestoId) => {
                setCelulaAbiertaId(null);
                setTejidoAbiertoId(null);
                onCerrar();
                onAbrirCompuesto(compuestoId);
              }
            : undefined
        }
        onAbrirTejido={(tejidoId) => {
          setCelulaAbiertaId(null);
          setTejidoAbiertoId(tejidoId);
        }}
      />
    </MiniPortalAnidado>
  ) : null;

  if (sinPortalPropio) {
    return (
      <>
        {cajaInterna}
        {editoresAnidados}
      </>
    );
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--primary) 35%, transparent)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      {cajaInterna}
      {editoresAnidados}
    </div>,
    document.body,
  );
}
