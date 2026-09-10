"use client";

/**
 * PerfilAtomicoCriaturaPanel.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Perfil de una criatura — actualmente solo Rasgos evolutivos: marca física
 * permanente por Fantasía evolutiva/residual (exposición ambiental
 * acumulada a un Oris concreto). Ver types.ts para el detalle de diseño.
 *
 * Nota: los bloques de "Canalización" (Oris que la criatura puede usar
 * activamente), "Composición material" (elementos que forman su tejido
 * duro/mineral, con el motor de afinidad.ts) y "Notas" libres se quitaron
 * del frontend a pedido — el estado/persistencia de esos campos (oris_ids,
 * componentes, notas) sigue existiendo en types.ts y en la tabla, solo no
 * se editan desde acá.
 */

import { Atom, Boxes, Bug, Plus, Search, Waypoints, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { useElementos } from "@/domains/garlia/elementos/useElementos";
import { type Elemento, type Sistema } from "@/domains/garlia/elementos/types";
import { useOris } from "@/domains/garlia/fisica/useFisica";
import { useCriaturasCatalogoMin } from "@/domains/garlia/runas/useCriaturasCatalogoMin";
import { useSistemas } from "@/domains/garlia/elementos/useSistemas";
import { useCriaturaSistemas } from "@/domains/garlia/criaturas/useCriaturaSistemas";
import { SistemaPanelFlotante } from "@/domains/garlia/criaturas/SistemaPanelFlotante";

import { usePerfilesAtomicosCriatura } from "./useBiologia";
import { TIPO_RASGO_EVOLUTIVO_LABEL, type RasgoEvolutivo } from "./types";


// ─── Rasgos evolutivos (Fantasía evolutiva/residual) ───────────────────────
// Marca física permanente por exposición ambiental acumulada a un Oris/-ium
// concreto — distinto de "canaliza este Oris": acá la criatura no controla
// nada, solo quedó marcada por vivir expuesta a esa fuerza (ver conceptos
// "Las tres fuentes de fantasía" en Física).
function RasgoEvolutivoRow({
  rasgo,
  orisDisponibles,
  onChange,
  onEliminar,
}: {
  rasgo: RasgoEvolutivo;
  orisDisponibles: { id: string; nombre: string }[];
  onChange: (cambios: Partial<RasgoEvolutivo>) => void;
  onEliminar: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-primary/10 bg-primary/[0.02]">
      <div className="flex items-center gap-1.5">
        <select
          value={rasgo.oris_id}
          onChange={(e) => onChange({ oris_id: e.target.value })}
          className="min-w-0 bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30"
        >
          <option value="">Oris de origen…</option>
          {orisDisponibles.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
        <select
          value={rasgo.tipo}
          onChange={(e) => onChange({ tipo: e.target.value as RasgoEvolutivo["tipo"] })}
          className="shrink-0 bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary/70 outline-none border border-primary/10 focus:border-primary/30"
        >
          {(Object.keys(TIPO_RASGO_EVOLUTIVO_LABEL) as RasgoEvolutivo["tipo"][]).map((t) => (
            <option key={t} value={t}>
              {t === "evolutiva" ? "Evolutiva" : "Residual"}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onEliminar}
          title="Eliminar rasgo"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
        >
          <X size={11} />
        </button>
      </div>
      <input
        value={rasgo.descripcion}
        onChange={(e) => onChange({ descripcion: e.target.value })}
        placeholder="Ej. Piel resistente al calor por exposición residual a Thermoris…"
        className="w-full bg-transparent text-xs text-primary/80 outline-none placeholder:text-primary/30 border-b border-primary/10 pb-1 focus:border-primary/30"
      />
      <p className="text-micro text-primary/30">{TIPO_RASGO_EVOLUTIVO_LABEL[rasgo.tipo]}</p>
    </div>
  );
}

// ─── Panel de una criatura individual ───────────────────────────────────────

export function PanelPerfilCriatura({
  criaturaId,
  criaturaNombre,
  elementos,
  orisDisponibles,
  obtenerOCrear,
  actualizar,
}: {
  criaturaId: string;
  criaturaNombre: string;
  elementos: Elemento[];
  orisDisponibles: { id: string; nombre: string }[];
  obtenerOCrear: ReturnType<typeof usePerfilesAtomicosCriatura>["obtenerOCrear"];
  actualizar: ReturnType<typeof usePerfilesAtomicosCriatura>["actualizar"];
}) {
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [rasgosEvolutivos, setRasgosEvolutivos] = useState<RasgoEvolutivo[]>([]);

  // ── Sistemas vinculados directo a la Criatura (criatura_sistemas) — al
  // lado de Rasgos evolutivos. Distinto de "Órganos/Organismo" del Editor
  // de Criatura: acá el Sistema cuelga directo de la Criatura, sin pasar
  // por un Organismo del catálogo (ej. un sistema mágico exclusivo suyo). ──
  const sistemasCriatura = useCriaturaSistemas(criaturaId);
  const { items: catalogoSistemas } = useSistemas();
  const [editandoSistemaId, setEditandoSistemaId] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    void obtenerOCrear(criaturaId).then((p) => {
      if (cancelado || !p) return;
      setPerfilId(p.id);
      setRasgosEvolutivos(p.rasgos_evolutivos ?? []);
    });
    return () => {
      cancelado = true;
    };
  }, [criaturaId]);

  const guardar = (patch: { rasgos_evolutivos?: RasgoEvolutivo[] }) => {
    if (!perfilId) return;
    void actualizar(perfilId, patch);
  };

  const agregarRasgo = () => {
    const next: RasgoEvolutivo[] = [
      ...rasgosEvolutivos,
      { id: `rasgo-${Date.now()}`, oris_id: "", descripcion: "", tipo: "residual" },
    ];
    setRasgosEvolutivos(next);
    guardar({ rasgos_evolutivos: next });
  };
  const cambiarRasgo = (id: string, cambios: Partial<RasgoEvolutivo>) => {
    const next = rasgosEvolutivos.map((r) => (r.id === id ? { ...r, ...cambios } : r));
    setRasgosEvolutivos(next);
    guardar({ rasgos_evolutivos: next });
  };
  const eliminarRasgo = (id: string) => {
    const next = rasgosEvolutivos.filter((r) => r.id !== id);
    setRasgosEvolutivos(next);
    guardar({ rasgos_evolutivos: next });
  };

  if (!perfilId) {
    return <div className="py-4 text-xs text-primary/30 text-center">Cargando perfil…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rasgos evolutivos + Sistemas vinculados, lado a lado — mismo
          patrón de grid que Órganos/Organismo en EditorCriatura.tsx. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-0 items-start">
        <div className="flex flex-col gap-1.5 lg:pr-4">
          <div className="flex items-center justify-between">
            <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
              Rasgos evolutivos
            </span>
            <button
              type="button"
              onClick={agregarRasgo}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-micro font-black uppercase tracking-wide border border-dashed border-primary/20 text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
            >
              <Plus size={9} /> Agregar rasgo
            </button>
          </div>
          <p className="text-micro text-primary/30 -mt-0.5">
            Marca física permanente por exposición ambiental a un Oris — distinto de canalizarlo.
          </p>
          {rasgosEvolutivos.length === 0 ? (
            <p className="text-micro text-primary/25 italic py-1">Sin rasgos evolutivos todavía</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rasgosEvolutivos.map((r) => (
                <RasgoEvolutivoRow
                  key={r.id}
                  rasgo={r}
                  orisDisponibles={orisDisponibles}
                  onChange={(cambios) => cambiarRasgo(r.id, cambios)}
                  onEliminar={() => eliminarRasgo(r.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:pl-4 lg:border-l lg:border-primary/10">
          <PanelSistemasCriatura
            items={sistemasCriatura.items}
            loading={sistemasCriatura.loading}
            catalogo={catalogoSistemas}
            onAgregar={(id) => void sistemasCriatura.vincularExistente(id)}
            onActualizarProporcion={sistemasCriatura.actualizarProporcion}
            onQuitar={(vinculoId) => void sistemasCriatura.quitar(vinculoId)}
            onAbrirSistema={setEditandoSistemaId}
          />
        </div>
      </div>

      {editandoSistemaId &&
        (() => {
          const sistemaActivo = sistemasCriatura.items.find(
            (s) => s.sistema_id === editandoSistemaId,
          )?.sistema;
          if (!sistemaActivo) return null;
          return (
            <SistemaPanelFlotante sistema={sistemaActivo} onCerrar={() => setEditandoSistemaId(null)} />
          );
        })()}
    </div>
  );
}

// ─── Panel Sistemas vinculados: vincula/gestiona Sistema(s) directo a la
// Criatura vía criatura_sistemas (proporción libre) — mismo lenguaje visual
// que PanelOrganismosCriatura en EditorCriatura.tsx, pero sin rol/cantidad/
// es_principal (el shape acá es más simple: pertenencia + proporción). ─────

function PanelSistemasCriatura({
  items,
  loading,
  catalogo,
  onAgregar,
  onActualizarProporcion,
  onQuitar,
  onAbrirSistema,
}: {
  items: {
    vinculo_id: string;
    sistema_id: string;
    proporcion: string | null;
    sistema: Sistema;
  }[];
  loading: boolean;
  catalogo: Sistema[];
  onAgregar: (sistemaId: string) => void;
  onActualizarProporcion: (vinculoId: string, proporcion: string) => void;
  onQuitar: (vinculoId: string) => void;
  onAbrirSistema: (sistemaId: string) => void;
}) {
  const [buscando, setBuscando] = useState(false);

  const yaVinculadosIds = useMemo(() => new Set(items.map((v) => v.sistema_id)), [items]);
  const disponibles = useMemo(
    () => catalogo.filter((s) => !yaVinculadosIds.has(s.id)),
    [catalogo, yaVinculadosIds],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <p className="text-micro font-black uppercase tracking-[0.2em] text-primary/40">
          Sistemas vinculados
        </p>
        <p className="text-micro text-primary/30 mt-0.5">
          Sistema(s) enlazado directo a esta Criatura, sin pasar por un Organismo del catálogo.
        </p>
      </div>

      {loading ? (
        <p className="text-micro text-primary/25 italic py-1">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-micro text-primary/25 italic py-1">Sin Sistemas vinculados todavía.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((v) => (
            <div
              key={v.vinculo_id}
              className="flex items-center gap-1.5 bg-primary/5 rounded-md px-2.5 py-2 border border-primary/10"
            >
              <Waypoints size={11} className="text-primary/40 shrink-0" />
              <button
                type="button"
                onClick={() => onAbrirSistema(v.sistema_id)}
                title="Ver Órganos"
                className="flex-1 min-w-0 text-left truncate text-micro font-bold text-primary/80 hover:text-accent transition-colors cursor-pointer"
              >
                {v.sistema.nombre || "Sin nombre"}
              </button>
              <input
                value={v.proporcion ?? ""}
                onChange={(e) => onActualizarProporcion(v.vinculo_id, e.target.value)}
                placeholder="Proporción…"
                className="w-20 shrink-0 bg-transparent px-0 py-0.5 text-micro text-primary/60 outline-none text-right placeholder:text-primary/25"
              />
              <button
                type="button"
                onClick={() => onQuitar(v.vinculo_id)}
                title="Quitar"
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-primary/40 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {buscando ? (
        <div className="flex flex-col gap-1 border border-primary/10 rounded-md p-2">
          {disponibles.length === 0 ? (
            <p className="text-micro text-primary/25 italic py-1">
              No hay más Sistemas disponibles en el catálogo.
            </p>
          ) : (
            disponibles.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onAgregar(s.id);
                  setBuscando(false);
                }}
                className="text-left text-micro text-primary/70 hover:text-accent px-1.5 py-1 rounded hover:bg-primary/5 transition-colors cursor-pointer"
              >
                {s.nombre}
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => setBuscando(false)}
            className="self-start text-micro text-primary/35 hover:text-primary/60 mt-1 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setBuscando(true)}
          className="flex items-center gap-1 self-start text-micro font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors cursor-pointer"
        >
          <Boxes size={10} /> Agregar sistema existente
        </button>
      )}
    </div>
  );
}

// ─── Página principal: buscador de criatura + panel ─────────────────────────

export function PerfilesAtomicosPage() {
  const { items: elementos, loading: loadingElementos } = useElementos();
  const { items: oris, loading: loadingOris } = useOris();
  const { criaturas: catalogo, loading: loadingCatalogo } = useCriaturasCatalogoMin();
  // Cargado una sola vez acá arriba (no adentro de PanelPerfilCriatura) para
  // que cambiar de criatura no dispare un select("*") completo de la tabla
  // perfiles_atomicos_criatura cada vez — con esto el cambio es instantáneo,
  // ya que obtenerOCrear reusa lo que ya está en memoria.
  const { loading: loadingPerfiles, obtenerOCrear, actualizar } =
    usePerfilesAtomicosCriatura();
  const [criaturaId, setCriaturaId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtradas = useMemo(
    () => catalogo.filter((c) => c.nombre.toLowerCase().includes(search.toLowerCase())),
    [catalogo, search],
  );

  const criaturaSeleccionada = catalogo.find((c) => c.id === criaturaId) ?? null;

  const orisDisponibles = useMemo(
    () => (oris ?? []).map((o) => ({ id: o.id, nombre: o.nombre })),
    [oris],
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-64 shrink-0">
        <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg border border-primary/10 bg-primary/[0.02]">
          <Search size={11} className="text-primary/30 shrink-0" />
          <input
            className="flex-1 min-w-0 bg-transparent text-xs outline-none placeholder:text-primary/30"
            placeholder="Buscar criatura…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loadingCatalogo ? (
          <div className="py-4 text-xs text-primary/30 text-center">Cargando…</div>
        ) : (
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {filtradas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCriaturaId(c.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-colors ${
                  c.id === criaturaId
                    ? "bg-primary/10 text-primary"
                    : "text-primary/60 hover:bg-primary/5"
                }`}
              >
                <span className="shrink-0 w-5 h-5 rounded-full overflow-hidden bg-primary/8 flex items-center justify-center">
                  {c.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={c.nombre} className="w-full h-full object-cover" src={c.imagen_url} />
                  ) : (
                    <Bug size={9} className="text-primary/25" />
                  )}
                </span>
                <span className="truncate">{c.nombre}</span>
              </button>
            ))}
            {filtradas.length === 0 && (
              <p className="text-micro text-primary/25 italic px-2 py-2">Sin resultados</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {loadingElementos || loadingOris || loadingPerfiles ? (
          <div className="py-6 text-xs text-primary/30 text-center">Cargando…</div>
        ) : criaturaSeleccionada ? (
          <PanelPerfilCriatura
            key={criaturaSeleccionada.id}
            criaturaId={criaturaSeleccionada.id}
            criaturaNombre={criaturaSeleccionada.nombre}
            elementos={elementos}
            orisDisponibles={orisDisponibles}
            obtenerOCrear={obtenerOCrear}
            actualizar={actualizar}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-primary/15 p-6 text-center">
            <Atom size={16} className="mx-auto mb-2 text-primary/20" />
            <p className="text-xs text-primary/30">
              Elegí una criatura de la lista para ver o editar su perfil atómico.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
