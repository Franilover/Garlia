"use client";

/**
 * BiologiaPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Sección Biología, hermana de Física en el toggle superior de RunasPage.
 * Ahora muestra directamente el cladograma (Cladística) sin sub-tabs:
 *   - Ecosistemas se manejan desde Entidades → Criaturas (ver
 *     CriaturasJerarquica / EcosistemaEditor), ya no vive acá.
 *   - Perfiles atómicos de criatura (afinidad.ts de Elementos + Oris de
 *     Física) tampoco se muestran acá — si hace falta recuperar el acceso,
 *     ver PerfilesAtomicosPage en PerfilAtomicoCriaturaPanel.tsx.
 *
 * 100% self-contained (trae sus propios datos de Supabase, como Física) y
 * NO toca EditorCriatura.tsx — solo referencia criaturas por id.
 */

import { Download, Loader2, Upload, X } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { supabase } from "@/infra/supabase/supabase";
import { GridCatalogoGrupo } from "@/domains/garlia/_shared/GridCatalogoGrupo";
import { useCompuestosConElementos } from "@/domains/garlia/elementos/useCompuestosConElementos";
import { useElementos } from "@/domains/garlia/elementos/useElementos";
import { useOrganos } from "@/domains/garlia/elementos/useOrganos";
import { useCelulas } from "@/domains/garlia/elementos/useCelulas";
import { useTejidos } from "@/domains/garlia/elementos/useTejidos";
import { useSistemas } from "@/domains/garlia/elementos/useSistemas";
import { useOrganismos } from "@/domains/garlia/elementos/useOrganismos";
import { CompuestoPanelFlotante } from "@/domains/garlia/elementos/CompuestosPage";
import type { Organo, Sistema, Organismo, Celula, Tejido, Compuesto } from "@/domains/garlia/elementos/types";

import { CladisticaPage } from "./CladisticaPage";
import { CatalogoTejidosBiologia, PanelEditorCelula, PanelEditorTejido } from "./CatalogoTejidosBiologia";
import { CatalogoSistemasBiologia, PanelEditorSistema, PanelEditorOrganismo } from "./CatalogoSistemasBiologia";
import { GrupoCompuestoPanelFlotante } from "@/domains/garlia/elementos/GruposCompuestosPage";
import { useClados } from "./useBiologia";
import type { Clado } from "./types";

interface Props {
  /** El padre decide qué hacer al clickear una criatura (ej. abrir su editor). */
  onSelectCriatura?: (id: string) => void;
}

// ─── Descarga: el cladograma de Biología en un solo JSON ──────────────────
// Mismo patrón que descargarDatosElementos/descargarDatosFisica — un solo
// archivo autocontenido con taxones + config de rangos.
function descargarDatosBiologia(datos: {
  clados: ReturnType<typeof useClados>["clados"];
}) {
  const payload = {
    exportado_en: new Date().toISOString(),
    clados: datos.clados,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `biologia-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Subida: leer un JSON con el mismo formato exportado (clados) y ───────
// devolver los clados nuevos listos para insertar. Mismo espíritu que
// parsearArchivoElementosJSON/parsearArchivoFisicaJSON.
//
// padre_id no se remapea: como los clados nuevos todavía no tienen id
// asignado por Supabase, cualquier padre_id del archivo que no exista ya
// en la base se resetea a null (queda como raíz) para no dejar referencias
// colgantes — mismo criterio conservador que usa eliminar() en useBiologia.
interface ImportacionBiologia {
  cladosNuevos: Omit<Clado, "id" | "created_at" | "updated_at">[];
  /** Clados del archivo que coinciden por nombre con uno existente: se actualizan en vez de saltarse. */
  cladosActualizar: (Partial<Clado> & { id: string })[];
  padresOmitidos: { nombre: string }[];
}

function parsearArchivoBiologiaJSON(raw: string, cladosExistentes: Clado[]): ImportacionBiologia {
  const data = JSON.parse(raw);
  const lista: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.clados) ? data.clados : null;
  if (!lista) {
    throw new Error('El JSON debe ser un arreglo de clados, o un objeto con la clave "clados".');
  }

  const idsExistentes = new Set(cladosExistentes.map((c) => c.id));
  const porNombre = new Map(cladosExistentes.map((c) => [c.nombre, c]));
  const cladosNuevos: Omit<Clado, "id" | "created_at" | "updated_at">[] = [];
  const cladosActualizar: (Partial<Clado> & { id: string })[] = [];
  const padresOmitidos: { nombre: string }[] = [];

  for (const item of lista) {
    const c = item as Partial<Clado>;
    if (!c.nombre) {
      throw new Error(`Clado inválido (falta nombre): ${JSON.stringify(c).slice(0, 120)}`);
    }

    const existente = porNombre.get(c.nombre);

    // padre_id: solo se acepta si apunta a un clado que ya existe en la
    // base (los ids del propio archivo, si trae, no sirven porque los
    // clados nuevos todavía no tienen id asignado por Supabase).
    let padreId = c.padre_id ?? null;
    if (padreId && !idsExistentes.has(padreId)) {
      padresOmitidos.push({ nombre: c.nombre });
      padreId = null;
    }

    const datos = {
      nombre: c.nombre,
      sinapomorfia: c.sinapomorfia ?? "",
      padre_id: padreId,
      descripcion: c.descripcion ?? "",
      criatura_ids: c.criatura_ids ?? [],
      orden: c.orden ?? 0,
    };

    if (existente) {
      cladosActualizar.push({ id: existente.id, ...datos });
    } else {
      cladosNuevos.push(datos);
    }
  }

  return { cladosNuevos, cladosActualizar, padresOmitidos };
}

/**
 * Shell compartido de los 3 catálogos hermanos de Biología (Tejidos/
 * Células, Sistemas/Organismos, Órgano) — un único createPortal con un
 * único backdrop y un único z-[9999]. Antes, cada catálogo montaba su
 * propio PanelFlotanteBase/portal: al saltar entre catálogos hermanos
 * (ej. Célula → Sistema), React desmontaba un nodo DOM y montaba otro
 * (componentes JSX distintos, cada uno con su propia animación de
 * entrada), lo que se veía como un parpadeo "cierra y abre". Este shell
 * resuelve eso siendo el ÚNICO nodo DOM del backdrop/marco — los
 * catálogos, con sinPortalPropio=true, solo devuelven su caja interna
 * (header + contenido) como children de este shell, así el nodo raíz del
 * marco nunca se desmonta al cambiar de catálogo activo.
 */
function PanelFlotanteShellBiologia({
  children,
  onCerrar,
}: {
  children: React.ReactNode;
  onCerrar: () => void;
}) {
  React.useEffect(() => {
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
  }, [onCerrar]);

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
      {children}
    </div>,
    document.body,
  );
}

/**
 * Decide, según panelActivo.tipo, cuál de los 5 editores de nivel raíz
 * renderizar dentro del shell — ver comentario de panelActivo en
 * BiologiaCatalogos. Cada editor recibe exactamente las mismas props que
 * recibía antes (item/onActualizar/onEliminar/onAbrirX), solo que ahora
 * "item" se busca acá según panelActivo.id en vez de vivir en un useState
 * local del catálogo dueño.
 */
function PanelEditorActivoBiologia({
  panelActivo,
  sinAnimacion,
  celulas,
  onActualizarCelula,
  onEliminarCelula,
  tejidos,
  loadingTejidos,
  onActualizarTejido,
  onEliminarTejido,
  sistemas,
  loadingSistemas,
  onActualizarSistema,
  onEliminarSistema,
  organismos,
  onActualizarOrganismo,
  onEliminarOrganismo,
  organos,
  onActualizarOrgano,
  compuestos,
  loadingCompuestos,
  onCerrar,
  onAbrirCompuesto,
  onAbrirCelula,
  onAbrirTejido,
  onAbrirOrgano,
  onAbrirSistema,
  onAbrirOrganismo,
}: {
  panelActivo: { tipo: "celula" | "tejido" | "organo" | "sistema" | "organismo"; id: string };
  sinAnimacion: boolean;
  celulas: Celula[];
  onActualizarCelula: (id: string, cambios: Partial<Celula>) => void;
  onEliminarCelula: (id: string) => Promise<{ ok: boolean; error: unknown }>;
  tejidos: Tejido[];
  loadingTejidos?: boolean;
  onActualizarTejido: (id: string, cambios: Partial<Tejido>) => void;
  onEliminarTejido: (id: string) => Promise<{ ok: boolean; error: unknown }>;
  sistemas: Sistema[];
  loadingSistemas?: boolean;
  onActualizarSistema: (id: string, cambios: Partial<Sistema>) => void;
  onEliminarSistema: (id: string) => Promise<{ ok: boolean; error: unknown }>;
  organismos: Organismo[];
  onActualizarOrganismo: (id: string, cambios: Partial<Organismo>) => void;
  onEliminarOrganismo: (id: string) => Promise<{ ok: boolean; error: unknown }>;
  organos: Organo[];
  onActualizarOrgano: (id: string, cambios: Partial<Organo>) => void;
  compuestos: Compuesto[];
  loadingCompuestos?: boolean;
  onCerrar: () => void;
  onAbrirCompuesto: (compuestoId: string) => void;
  onAbrirCelula: (id: string) => void;
  onAbrirTejido: (id: string) => void;
  onAbrirOrgano: (id: string) => void;
  onAbrirSistema: (id: string) => void;
  onAbrirOrganismo: (id: string) => void;
}) {
  if (panelActivo.tipo === "celula") {
    const item = celulas.find((c) => c.id === panelActivo.id);
    if (!item) return null;
    return (
      <PanelEditorCelula
        item={item}
        compuestos={compuestos}
        loadingCompuestos={loadingCompuestos}
        sinAnimacion={sinAnimacion}
        onCerrar={onCerrar}
        onActualizar={onActualizarCelula}
        onEliminar={onEliminarCelula}
        onAbrirCompuesto={onAbrirCompuesto}
        onAbrirTejido={onAbrirTejido}
        onAbrirOrgano={onAbrirOrgano}
        onAbrirSistema={onAbrirSistema}
        onAbrirOrganismo={onAbrirOrganismo}
      />
    );
  }

  if (panelActivo.tipo === "tejido") {
    const item = tejidos.find((t) => t.id === panelActivo.id);
    if (!item) return null;
    return (
      <PanelEditorTejido
        item={item}
        celulas={celulas}
        loadingCelulas={false}
        compuestos={compuestos}
        loadingCompuestos={loadingCompuestos}
        sinAnimacion={sinAnimacion}
        onCerrar={onCerrar}
        onActualizar={onActualizarTejido}
        onEliminar={onEliminarTejido}
        onAbrirCelula={onAbrirCelula}
        onAbrirCompuesto={onAbrirCompuesto}
        onAbrirOrgano={onAbrirOrgano}
        onAbrirSistema={onAbrirSistema}
        onAbrirOrganismo={onAbrirOrganismo}
      />
    );
  }

  if (panelActivo.tipo === "sistema") {
    const item = sistemas.find((s) => s.id === panelActivo.id);
    if (!item) return null;
    return (
      <PanelEditorSistema
        item={item}
        organos={organos}
        loadingOrganos={false}
        sinAnimacion={sinAnimacion}
        onCerrar={onCerrar}
        onActualizar={onActualizarSistema}
        onEliminar={onEliminarSistema}
        onAbrirOrgano={onAbrirOrgano}
        onAbrirCelula={onAbrirCelula}
        onAbrirTejido={onAbrirTejido}
        onAbrirOrganismo={onAbrirOrganismo}
      />
    );
  }

  if (panelActivo.tipo === "organismo") {
    const item = organismos.find((o) => o.id === panelActivo.id);
    if (!item) return null;
    return (
      <PanelEditorOrganismo
        item={item}
        sistemas={sistemas}
        loadingSistemas={loadingSistemas}
        sinAnimacion={sinAnimacion}
        onCerrar={onCerrar}
        onActualizar={onActualizarOrganismo}
        onEliminar={onEliminarOrganismo}
        onAbrirSistema={onAbrirSistema}
        onAbrirCelula={onAbrirCelula}
        onAbrirTejido={onAbrirTejido}
        onAbrirOrgano={onAbrirOrgano}
      />
    );
  }

  // panelActivo.tipo === "organo"
  const item = organos.find((o) => o.id === panelActivo.id);
  if (!item) return null;
  return (
    <GrupoCompuestoPanelFlotante
      grupo={item}
      tipo="organo"
      compuestos={compuestos}
      sinAnimacion={sinAnimacion}
      onCerrar={onCerrar}
      onActualizar={onActualizarOrgano}
      onAbrirCompuesto={onAbrirCompuesto}
      onAbrirOrganoExterno={onAbrirOrgano}
      onAbrirSistemaExterno={onAbrirSistema}
      onAbrirOrganismoExterno={onAbrirOrganismo}
      sinPortalPropio
    />
  );
}

/**
 * Catálogos de Biología (Células vía Tejidos, Tejidos, Sistemas, Órganos)
 * — sin Cladística, que ahora se muestra aparte vía BiologiaCladograma
 * (ver más abajo) para poder ubicarla en otro lugar del layout general
 * (RunasPage la pone al final, debajo de las columnas de Física/Biología).
 */
export function BiologiaCatalogos({ onSelectCriatura }: Props) {
  // ── Órganos: catálogo propio, mismo motor que Física ─────
  // Órganos = tabla real "organos" (mismo catálogo que usa Flora para
  // vincular por planta_organos, y Criaturas por criatura_organos). Ya no
  // tiene columna `componentes` — la fórmula vive vía Tejidos/Células.
  // (El catálogo "reacciones" ya no se renderiza acá como "Procesos" — es
  // la misma tabla que Química → Tabla → Reacciones y Física → Habilidades,
  // así que se dejó un único render global en Tabla→Reacciones para evitar
  // 3 fetches/estados desincronizados del mismo dato.) Self-contained,
  // igual que el resto de Biología: trae sus propios datos acá sin tocar
  // CladisticaPage ni depender de una planta puntual.
  const { items: catalogoOrganos, setItems: setCatalogoOrganos } = useOrganos();
  const { items: compuestosCatalogo, setItems: setCompuestosCatalogo, loading: loadingCompuestos } = useCompuestosConElementos();
  const { items: elementosCatalogo } = useElementos();

  // ── Catálogos de los 4 niveles restantes de la jerarquía — antes vivían
  // dentro de CatalogoTejidosBiologia/CatalogoSistemasBiologia (cada uno
  // hacía su propio fetch), pero al pasar esos componentes a "controlados"
  // (ver panelActivo abajo) el estado y el fetch de datos también subió
  // acá, porque PanelEditorActivoBiologia necesita los mismos items/
  // actualizar/eliminar para poder montar el editor dentro del shell.
  const celulas = useCelulas();
  const tejidos = useTejidos();
  const sistemas = useSistemas();
  const organismos = useOrganismos();

  const [creandoSistema, setCreandoSistema] = useState(false);
  const [creandoOrganismo, setCreandoOrganismo] = useState(false);

  async function crearSistema() {
    setCreandoSistema(true);
    try {
      const { data: nuevo, error } = await supabase
        .from("sistemas")
        .insert([{ nombre: "Nuevo sistema" }])
        .select()
        .single();
      if (!error && nuevo) {
        sistemas.setItems((prev) => [...prev, nuevo as Sistema]);
      }
    } finally {
      setCreandoSistema(false);
    }
  }

  async function crearOrganismo() {
    setCreandoOrganismo(true);
    try {
      const { data: nuevo, error } = await supabase
        .from("organismos")
        .insert([{ nombre: "Nuevo organismo" }])
        .select()
        .single();
      if (!error && nuevo) {
        organismos.setItems((prev) => [...prev, nuevo as Organismo]);
      }
    } finally {
      setCreandoOrganismo(false);
    }
  }

  async function actualizarSistema(id: string, cambios: Partial<Sistema>) {
    sistemas.setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)));
    const { error } = await supabase.from("sistemas").update(cambios).eq("id", id);
    if (error) console.error("[BiologiaPage] error actualizando sistema:", error);
  }

  async function actualizarOrganismo(id: string, cambios: Partial<Organismo>) {
    organismos.setItems((prev) => prev.map((o) => (o.id === id ? { ...o, ...cambios } : o)));
    const { error } = await supabase.from("organismos").update(cambios).eq("id", id);
    if (error) console.error("[BiologiaPage] error actualizando organismo:", error);
  }

  async function eliminarSistema(id: string): Promise<{ ok: boolean; error: unknown }> {
    const { error } = await supabase.from("sistemas").delete().eq("id", id);
    if (error) return { ok: false, error };
    sistemas.setItems((prev) => prev.filter((s) => s.id !== id));
    return { ok: true, error: null };
  }

  async function eliminarOrganismo(id: string): Promise<{ ok: boolean; error: unknown }> {
    const { error } = await supabase.from("organismos").delete().eq("id", id);
    if (error) return { ok: false, error };
    organismos.setItems((prev) => prev.filter((o) => o.id !== id));
    return { ok: true, error: null };
  }

  // Click en un Compuesto de matriz (Tejido) o en un Compuesto de la
  // composición de una Célula abre acá su editor completo — mismo patrón
  // que FloraEditor.tsx (setItemAbierto({ tipo: "compuesto", id })).
  const [compuestoAbiertoId, setCompuestoAbiertoId] = useState<string | null>(null);

  // Fix (2026-09-11): el breadcrumb de 5 niveles (Célula ⇄ Tejido ⇄
  // Órgano ⇄ Sistema ⇄ Organismo) tenía un solo panel "activo" a la vez,
  // pero repartido en 5 useState distintos (uno por nivel) dentro de 3
  // componentes hermanos separados (CatalogoTejidosBiologia,
  // CatalogoSistemasBiologia, GridCatalogoGrupo). Cada uno montaba su
  // propio createPortal — al saltar entre catálogos hermanos (ej.
  // Célula → Sistema), React desmontaba un nodo DOM y montaba otro
  // (componentes JSX distintos con su propia animación de entrada), lo
  // que se veía como un parpadeo "cierra y abre" del fondo del modal.
  //
  // Ahora hay un ÚNICO estado acá arriba: qué panel de nivel raíz está
  // abierto (si hay alguno). Los 3 catálogos pasaron a ser "controlados"
  // (reciben seleccionadoId/onSeleccionar por props, ya no tienen su
  // propio useState de selección) y un solo PanelFlotanteShellBiologia
  // monta el editor correspondiente — un único nodo de portal/backdrop
  // que nunca se desmonta al cambiar de tipo de panel.
  type TipoPanelBiologia = "celula" | "tejido" | "organo" | "sistema" | "organismo";
  const [panelActivo, setPanelActivo] = useState<{ tipo: TipoPanelBiologia; id: string } | null>(
    null,
  );
  // true cuando la apertura actual vino de un salto de breadcrumb (no un
  // click nuevo en la grilla) — suprime la animación de entrada del panel
  // para no parpadear al saltar entre niveles de la jerarquía. Se apaga
  // solo en el siguiente tick, igual que antes.
  const [navegandoEntreNiveles, setNavegandoEntreNiveles] = useState(false);
  const abrirPanel = (tipo: TipoPanelBiologia, id: string, esNavegacion = false) => {
    if (esNavegacion) {
      setNavegandoEntreNiveles(true);
      requestAnimationFrame(() => setNavegandoEntreNiveles(false));
    }
    setPanelActivo({ tipo, id });
  };
  const cerrarPanel = () => setPanelActivo(null);

  async function actualizarOrgano(id: string, cambios: Partial<Organo>) {
    setCatalogoOrganos((prev) => prev.map((g) => (g.id === id ? { ...g, ...cambios } : g)));
    const { error } = await supabase.from("organos").update(cambios).eq("id", id);
    if (error) console.error("[BiologiaPage] error guardando órgano:", error);
  }

  return (
    <div className="flex flex-wrap gap-4 min-h-0">
      <div
        className="p-2.5 min-w-[220px]"
        style={{
          flexGrow: Math.max(celulas.items.length + tejidos.items.length, 1),
          flexBasis: 0,
        }}
      >
        <CatalogoTejidosBiologia
          celulas={celulas.items}
          loadingCelulas={celulas.loading}
          tejidos={tejidos.items}
          loadingTejidos={tejidos.loading}
          celulaSeleccionadaId={panelActivo?.tipo === "celula" ? panelActivo.id : null}
          onSeleccionarCelula={(id) => (id ? abrirPanel("celula", id) : cerrarPanel())}
          tejidoSeleccionadoId={panelActivo?.tipo === "tejido" ? panelActivo.id : null}
          onSeleccionarTejido={(id) => (id ? abrirPanel("tejido", id) : cerrarPanel())}
        />
      </div>

      <div
        className="p-2.5 min-w-[220px]"
        style={{
          flexGrow: Math.max(sistemas.items.length + organismos.items.length, 1),
          flexBasis: 0,
        }}
      >
        <CatalogoSistemasBiologia
          sistemas={sistemas.items}
          loadingSistemas={sistemas.loading}
          organismos={organismos.items}
          loadingOrganismos={organismos.loading}
          sistemaSeleccionadoId={panelActivo?.tipo === "sistema" ? panelActivo.id : null}
          onSeleccionarSistema={(id) => (id ? abrirPanel("sistema", id) : cerrarPanel())}
          organismoSeleccionadoId={panelActivo?.tipo === "organismo" ? panelActivo.id : null}
          onSeleccionarOrganismo={(id) => (id ? abrirPanel("organismo", id) : cerrarPanel())}
        />
      </div>

      <div
        className="p-2.5 min-w-[220px]"
        style={{ flexGrow: Math.max(catalogoOrganos.length, 1), flexBasis: 0 }}
      >
        <GridCatalogoGrupo
          modo="grupo"
          titulo="Órganos"
          icono="organo"
          items={catalogoOrganos}
          compuestos={compuestosCatalogo}
          onActualizar={actualizarOrgano}
          onAbrirCompuesto={(id) => setCompuestoAbiertoId(id)}
          seleccionadoId={panelActivo?.tipo === "organo" ? panelActivo.id : null}
          onSeleccionar={(id) => (id ? abrirPanel("organo", id) : cerrarPanel())}
        />
      </div>

      {/* Shell único para los 5 niveles del breadcrumb de Biología — ver
         comentario de panelActivo arriba. Un solo createPortal/backdrop
         que nunca se desmonta al saltar entre niveles: solo cambia cuál
         editor recibe como children, así no hay parpadeo del fondo del
         modal. Cada PanelEditorX de acá adentro navega a otro nivel
         llamando a abrirPanel (con esNavegacion=true para suprimir la
         animación de entrada) en vez de manejar su propio estado. */}
      {panelActivo && (
        <PanelFlotanteShellBiologia onCerrar={cerrarPanel}>
          <PanelEditorActivoBiologia
            panelActivo={panelActivo}
            sinAnimacion={navegandoEntreNiveles}
            celulas={celulas.items}
            onActualizarCelula={celulas.actualizar}
            onEliminarCelula={async (id) => {
              const res = await celulas.eliminar(id);
              if (res.ok) cerrarPanel();
              return res;
            }}
            tejidos={tejidos.items}
            loadingTejidos={tejidos.loading}
            onActualizarTejido={tejidos.actualizar}
            onEliminarTejido={async (id) => {
              const res = await tejidos.eliminar(id);
              if (res.ok) cerrarPanel();
              return res;
            }}
            sistemas={sistemas.items}
            loadingSistemas={sistemas.loading}
            onActualizarSistema={actualizarSistema}
            onEliminarSistema={async (id) => {
              const res = await eliminarSistema(id);
              if (res.ok) cerrarPanel();
              return res;
            }}
            organismos={organismos.items}
            onActualizarOrganismo={actualizarOrganismo}
            onEliminarOrganismo={async (id) => {
              const res = await eliminarOrganismo(id);
              if (res.ok) cerrarPanel();
              return res;
            }}
            organos={catalogoOrganos}
            onActualizarOrgano={actualizarOrgano}
            compuestos={compuestosCatalogo}
            loadingCompuestos={loadingCompuestos}
            onCerrar={cerrarPanel}
            onAbrirCompuesto={(id) => {
              // Cierra el panel activo antes de subir el id: si no,
              // CompuestoPanelFlotante (montado por el padre, portal
              // aparte) queda apilado ENCIMA de este — mismo z-[9999]
              // fijo en ambos, así que un tercer nivel abierto desde el
              // Compuesto podía terminar tapado por el panel que seguía
              // vivo de fondo.
              cerrarPanel();
              setCompuestoAbiertoId(id);
            }}
            onAbrirCelula={(id) => abrirPanel("celula", id, true)}
            onAbrirTejido={(id) => abrirPanel("tejido", id, true)}
            onAbrirOrgano={(id) => abrirPanel("organo", id, true)}
            onAbrirSistema={(id) => abrirPanel("sistema", id, true)}
            onAbrirOrganismo={(id) => abrirPanel("organismo", id, true)}
          />
        </PanelFlotanteShellBiologia>
      )}

      {compuestoAbiertoId &&
        (() => {
          const compuesto = compuestosCatalogo.find((c) => c.id === compuestoAbiertoId);
          if (!compuesto) return null;
          return (
            <CompuestoPanelFlotante
              compuesto={compuesto}
              elementos={elementosCatalogo}
              todosLosCompuestos={compuestosCatalogo}
              onCerrar={() => setCompuestoAbiertoId(null)}
              onActualizar={(id, cambios) =>
                setCompuestosCatalogo((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)),
                )
              }
            />
          );
        })()}
    </div>
  );
}

/**
 * Cladograma de Biología (Cladística), con import/export propio — separado
 * de BiologiaCatalogos para poder ubicarlo en otra zona del layout general
 * (ver comentario arriba). Mismo comportamiento de siempre, solo que ahora
 * no vive pegado a la columna de Tejidos/Sistemas/Órganos.
 */
export function BiologiaCladograma({ onSelectCriatura }: Props) {
  // Traído acá solo para armar el JSON de descarga — Cladística sigue
  // manejando sus propios datos internamente (self-contained), esto no le
  // saca esa responsabilidad.
  const { clados, setClados } = useClados();

  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [mensajeImportacion, setMensajeImportacion] = useState<string | null>(null);

  async function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    setImportando(true);
    setMensajeImportacion(null);
    try {
      const texto = await archivo.text();
      const { cladosNuevos, cladosActualizar, padresOmitidos } = parsearArchivoBiologiaJSON(texto, clados);
      if (cladosNuevos.length === 0 && cladosActualizar.length === 0) {
        setMensajeImportacion("Nada para importar.");
        return;
      }

      const partes: string[] = [];

      if (cladosNuevos.length > 0) {
        const { data, error } = await supabase.from("clados").insert(cladosNuevos).select();
        if (error) throw error;
        const insertados = (data ?? []) as Clado[];
        setClados((prev) => [...prev, ...insertados]);
        partes.push(`${insertados.length} clado${insertados.length === 1 ? "" : "s"} nuevo${insertados.length === 1 ? "" : "s"} importado${insertados.length === 1 ? "" : "s"}`);
      }

      if (cladosActualizar.length > 0) {
        let actualizados = 0;
        for (const { id, ...datos } of cladosActualizar) {
          const { error } = await supabase.from("clados").update(datos).eq("id", id);
          if (error) {
            console.error("[BiologiaPage] error actualizando clado", id, error);
            continue;
          }
          actualizados++;
        }
        setClados((prev) =>
          prev.map((c) => {
            const cambio = cladosActualizar.find((x) => x.id === c.id);
            return cambio ? { ...c, ...cambio } : c;
          }),
        );
        partes.push(`${actualizados} clado${actualizados === 1 ? "" : "s"} existente${actualizados === 1 ? "" : "s"} actualizado${actualizados === 1 ? "" : "s"}`);
      }

      if (padresOmitidos.length > 0) {
        partes.push(`${padresOmitidos.length} sin padre_id válido (quedaron como raíz)`);
      }
      setMensajeImportacion(partes.join(" · "));
    } catch (err) {
      console.error("[BiologiaPage] error importando JSON:", err);
      setMensajeImportacion(err instanceof Error ? `Error: ${err.message}` : "Error al leer el archivo.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="min-w-0">
      {mensajeImportacion && (
        <div className="flex items-center justify-between gap-2 px-2 mb-1 text-micro text-primary/60">
          <span className="min-w-0">{mensajeImportacion}</span>
          <button
            type="button"
            onClick={() => setMensajeImportacion(null)}
            className="shrink-0 text-primary/30 hover:text-primary/60 cursor-pointer"
            title="Cerrar"
          >
            <X size={10} />
          </button>
        </div>
      )}

      <CladisticaPage onSelectCriatura={onSelectCriatura} />
    </div>
  );
}

/**
 * Wrapper de compatibilidad: Cladograma + catálogos lado a lado, como
 * antes de separarlos en BiologiaCladograma/BiologiaCatalogos. Ya no lo
 * usa RunasPage (que ahora ubica cada mitad en su propio lugar del
 * layout general), pero se mantiene por si algún otro consumidor lo
 * necesita en el futuro.
 */
export function BiologiaPage({ onSelectCriatura }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 min-h-0">
      <div className="flex-1 min-w-0">
        <BiologiaCladograma onSelectCriatura={onSelectCriatura} />
      </div>
      <div className="flex-1 min-w-0 border-l border-primary/10 pl-3">
        <BiologiaCatalogos onSelectCriatura={onSelectCriatura} />
      </div>
    </div>
  );
}
