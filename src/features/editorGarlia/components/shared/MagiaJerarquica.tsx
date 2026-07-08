"use client";

/**
 * MagiaJerarquica
 * ───────────────────────────────────────────────────────────────────────────
 * Vista de "Entidades" agrupada por criatura de origen (columna `criatura_id`
 * en dones/runas/items/hechizos), análoga a GeografiaJerarquica pero de un
 * solo nivel:
 *
 *   [Criatura 1]
 *   Dones          Runas          Items          Hechizos
 *   [D1] [D2]      [R1]           [I1] [I2] [I3]  [H1]
 *
 *   [Criatura 2]
 *   ...
 *
 * Cada nodo "Criatura" es un chip temático que abre su editor completo
 * (openEntity("criaturas", id)). Las 4 categorías se muestran como columnas
 * internas; cada tarjeta abre el editor de esa entidad puntual
 * (openEntity("dones"|"runas"|"items"|"hechizos", id)).
 *
 * Relación usada: Don/Runa/Item/Hechizo.criatura_id → agrupa bajo su criatura
 * de origen. Las entidades sin criatura_id caen en el bloque final global
 * "Sin criatura".
 */

import { Plus, ScrollText, Sparkles, Star, Package, Bug } from "lucide-react";
import React from "react";

import { EntityCard } from "./EntityCard";
import type { SectionKey } from "../../hooks/mundo/useMundoNavigationStore";

interface Criatura {
  id: string;
  nombre: string;
  imagen_url?: string | null;
}
interface EntidadHija {
  id: string;
  nombre: string;
  imagen_url?: string | null;
  criatura_id?: string | null;
}

interface Props {
  criaturas: Criatura[];
  dones: EntidadHija[];
  runas: EntidadHija[];
  items: EntidadHija[];
  hechizos: EntidadHija[];
  loading?: boolean;
  onOpen: (section: SectionKey, id: string) => void;
  onCreateCriatura?: () => void;
  onCreateHija?: (
    tipo: "dones" | "runas" | "items" | "hechizos",
    criaturaId: string | null,
  ) => void;
  creatingCriatura?: boolean;
}

const CATEGORIAS = [
  { key: "dones" as const, label: "Dones", Icon: Star, section: "dones" as SectionKey },
  { key: "runas" as const, label: "Runas", Icon: ScrollText, section: "runas" as SectionKey },
  { key: "items" as const, label: "Items", Icon: Package, section: "items" as SectionKey },
  { key: "hechizos" as const, label: "Hechizos", Icon: Sparkles, section: "hechizos" as SectionKey },
];

function NodoCriatura({
  label,
  onClick,
  onCreate,
}: {
  label: string;
  onClick: () => void;
  onCreate?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 max-w-full">
      <button
        type="button"
        onClick={onClick}
        title={label}
        className="px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-colors truncate bg-primary/10 hover:bg-primary/20 text-primary border border-primary/15"
      >
        {label}
      </button>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          title="Añadir"
          className="p-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
        >
          <Plus size={11} className="text-primary/60" />
        </button>
      )}
    </div>
  );
}

function Columna({
  label,
  Icon,
  section,
  entidades,
  onOpen,
  onCreate,
}: {
  label: string;
  Icon: React.ElementType;
  section: SectionKey;
  entidades: EntidadHija[];
  onOpen: (section: SectionKey, id: string) => void;
  onCreate?: () => void;
}) {
  const vacia = entidades.length === 0;
  const cols = Math.min(Math.max(entidades.length, 1), 6);
  const itemSize = 52;
  const gapPx = 4;
  const anchoPx = Math.max(cols * itemSize + (cols - 1) * gapPx, 90);

  return (
    <div className={vacia ? "w-fit shrink-0" : "shrink-0"} style={vacia ? undefined : { width: anchoPx }}>
      <div className="flex items-center gap-1.5">
        <Icon size={11} className="text-accent/60 shrink-0" />
        <span
          className="text-micro font-black uppercase tracking-[0.15em] truncate"
          style={{ maxWidth: vacia ? 140 : anchoPx }}
          title={label}
        >
          {label}
        </span>
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            title={`Añadir ${label.toLowerCase()}`}
            className="p-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
          >
            <Plus size={10} className="text-primary/60" />
          </button>
        )}
      </div>
      {vacia ? (
        <div className="mt-1.5 text-micro text-primary/25">Sin {label.toLowerCase()}</div>
      ) : (
        <div
          className="mt-2 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${cols}, ${itemSize}px)` }}
        >
          {entidades.map((e) => (
            <EntityCard
              key={e.id}
              nombre={e.nombre}
              imageUrl={e.imagen_url}
              Icon={Icon}
              onClick={() => onOpen(section, e.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MagiaJerarquica({
  criaturas,
  dones,
  runas,
  items,
  hechizos,
  loading,
  onOpen,
  onCreateCriatura,
  onCreateHija,
  creatingCriatura,
}: Props) {
  if (loading && criaturas.length === 0) {
    return <div className="py-6 text-xs text-primary/30 text-center">Cargando…</div>;
  }

  const donesDe = (criaturaId: string) => dones.filter((d) => d.criatura_id === criaturaId);
  const runasDe = (criaturaId: string) => runas.filter((r) => r.criatura_id === criaturaId);
  const itemsDe = (criaturaId: string) => items.filter((i) => i.criatura_id === criaturaId);
  const hechizosDe = (criaturaId: string) => hechizos.filter((h) => h.criatura_id === criaturaId);

  const totalDe = (criaturaId: string) =>
    donesDe(criaturaId).length +
    runasDe(criaturaId).length +
    itemsDe(criaturaId).length +
    hechizosDe(criaturaId).length;

  const criaturasOrdenadas = [...criaturas].sort((a, b) => totalDe(b.id) - totalDe(a.id));
  const criaturasConVinculos = criaturasOrdenadas.filter((c) => totalDe(c.id) > 0);
  const criaturasVacias = criaturasOrdenadas.filter((c) => totalDe(c.id) === 0);

  const sinCriaturaIds = new Set(criaturas.map((c) => c.id));
  const donesSinCriatura = dones.filter(
    (d) => !d.criatura_id || !sinCriaturaIds.has(d.criatura_id),
  );
  const runasSinCriatura = runas.filter(
    (r) => !r.criatura_id || !sinCriaturaIds.has(r.criatura_id),
  );
  const itemsSinCriatura = items.filter(
    (i) => !i.criatura_id || !sinCriaturaIds.has(i.criatura_id),
  );
  const hechizosSinCriatura = hechizos.filter(
    (h) => !h.criatura_id || !sinCriaturaIds.has(h.criatura_id),
  );
  const totalSinCriatura =
    donesSinCriatura.length +
    runasSinCriatura.length +
    itemsSinCriatura.length +
    hechizosSinCriatura.length;

  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center gap-2 mb-4 px-1">
        <h2 className="text-micro font-black uppercase tracking-[0.25em] text-primary/50">
          Magia por criatura
        </h2>
        <span className="text-micro text-primary/25 tabular-nums">{criaturas.length}</span>
        <div className="flex-1" />
        {onCreateCriatura && (
          <button
            type="button"
            onClick={onCreateCriatura}
            disabled={creatingCriatura}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-micro font-bold uppercase tracking-wide text-primary disabled:opacity-50"
          >
            <Plus size={11} />
            Añadir criatura
          </button>
        )}
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-start gap-6">
          {criaturasConVinculos.map((criatura) => (
            <div
              key={criatura.id}
              className="w-fit max-w-full rounded-xl border border-primary/10 bg-primary/[0.03] overflow-hidden"
            >
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 bg-primary/10 border-b border-primary/10">
                <span />
                <button
                  type="button"
                  onClick={() => onOpen("criaturas", criatura.id)}
                  title={criatura.nombre}
                  className="justify-self-center max-w-[280px] truncate text-xs font-black uppercase tracking-[0.15em] text-primary hover:text-accent transition-colors flex items-center gap-1.5"
                >
                  <Bug size={11} className="shrink-0" />
                  {criatura.nombre}
                </button>
                <span />
              </div>
              <div className="p-4 flex flex-wrap gap-6">
                {CATEGORIAS.map(({ key, label, Icon, section }) => {
                  const entidadesDe =
                    key === "dones"
                      ? donesDe(criatura.id)
                      : key === "runas"
                        ? runasDe(criatura.id)
                        : key === "items"
                          ? itemsDe(criatura.id)
                          : hechizosDe(criatura.id);
                  // Solo mostramos columnas con contenido para no saturar el card
                  // (una criatura sin dones, por ejemplo, no necesita mostrar
                  // "Sin dones" si tampoco tiene runas/items/hechizos vacíos a la vista).
                  if (entidadesDe.length === 0) return null;
                  return (
                    <Columna
                      key={key}
                      Icon={Icon}
                      entidades={entidadesDe}
                      label={label}
                      section={section}
                      onCreate={onCreateHija ? () => onCreateHija(key, criatura.id) : undefined}
                      onOpen={onOpen}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {criaturasVacias.length > 0 &&
            criaturasVacias.map((criatura) => (
              <NodoCriatura
                key={criatura.id}
                label={criatura.nombre}
                onClick={() => onOpen("criaturas", criatura.id)}
                onCreate={
                  onCreateHija ? () => onCreateHija("dones", criatura.id) : undefined
                }
              />
            ))}
        </div>

        {totalSinCriatura > 0 && (
          <div>
            <NodoCriatura label="Sin criatura" onClick={() => {}} />
            <div className="mt-3 flex flex-wrap gap-6">
              {[
                { key: "dones" as const, label: "Dones", Icon: Star, section: "dones" as SectionKey, entidades: donesSinCriatura },
                { key: "runas" as const, label: "Runas", Icon: ScrollText, section: "runas" as SectionKey, entidades: runasSinCriatura },
                { key: "items" as const, label: "Items", Icon: Package, section: "items" as SectionKey, entidades: itemsSinCriatura },
                { key: "hechizos" as const, label: "Hechizos", Icon: Sparkles, section: "hechizos" as SectionKey, entidades: hechizosSinCriatura },
              ]
                .filter((c) => c.entidades.length > 0)
                .map((c) => (
                  <Columna
                    key={c.key}
                    Icon={c.Icon}
                    entidades={c.entidades}
                    label={c.label}
                    section={c.section}
                    onCreate={onCreateHija ? () => onCreateHija(c.key, null) : undefined}
                    onOpen={onOpen}
                  />
                ))}
            </div>
          </div>
        )}

        {criaturasConVinculos.length === 0 &&
          criaturasVacias.length === 0 &&
          totalSinCriatura === 0 && (
            <div className="py-6 text-xs text-primary/25 text-center">
              Sin criaturas todavía
            </div>
          )}
      </div>
    </div>
  );
}
