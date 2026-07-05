"use client";
import { ChevronLeft } from "lucide-react";
import React from "react";

import type { WikiEntity } from "@/components/forms/Markdown/MarkdownEditor";
import { PanelEditor } from "@/features/editorGarlia/components/canciones/editor/PanelEditor";
import type { Cancion } from "@/features/editorGarlia/hooks/canciones/types";
import { type Ciudad , type Nota, type Personaje, type Reino } from "@/features/editorGarlia/hooks/types";
import { EditorCiudad } from "@/features/editorGarlia/views/EditorCiudad";
import { EditorCriatura } from "@/features/editorGarlia/views/EditorCriatura";
import {
  EditorGrupo,
  type Grupo,
} from "@/features/editorGarlia/views/EditorGrupo";
import { EditorHechizos } from "@/features/editorGarlia/views/EditorHechizos";
import { EditorItem } from "@/features/editorGarlia/views/EditorItem";
import { EditorNota } from "@/features/editorGarlia/views/EditorNota";
import { EditorPersonaje } from "@/features/editorGarlia/views/EditorPersonaje";
import { EditorReino } from "@/features/editorGarlia/views/EditorReino";
import { supabase } from "@/lib/api/client/supabase";


// ─── Tipos mínimos de entidades (espejo de los de EditorMundo.tsx) ────────────
export type CriaturaMin = {
  id: string;
  nombre: string;
  imagen_url?: string;
  habitat?: string;
};
export type ObjetoMin = {
  id: string;
  nombre: string;
  imagen_url?: string;
  categoria?: string;
};
export type CiudadMin = {
  id: string;
  nombre: string;
  imagen_url?: string;
  tipo?: string;
  reino_id?: string;
};
export type EntidadMagicaMin = { id: string; nombre: string };
export type RunaMin = {
  id: string;
  nombre: string;
  imagen_url?: string | null;
};

export type OverlayKind =
  | "reino"
  | "criatura"
  | "objeto"
  | "personaje"
  | "hechizo"
  | "don"
  | "runa"
  | "nota"
  | "ciudad"
  | "grupo"
  | "cancion"
  | null;

type Setter<T> = React.Dispatch<React.SetStateAction<T[]>>;

export type EntidadOverlayProps = {
  overlay: OverlayKind;
  entities: WikiEntity[];

  // ── Item seleccionado por entidad (uno solo está presente a la vez) ───────
  selected: {
    reino: Reino | null;
    criatura: (CriaturaMin & Record<string, any>) | null;
    objeto: (ObjetoMin & Record<string, any>) | null;
    ciudad: Ciudad | null;
    personaje: Personaje | null;
    hechizo: EntidadMagicaMin | null;
    don: EntidadMagicaMin | null;
    runa: RunaMin | null;
    nota: Nota | null;
    grupo: Grupo | null;
    cancion: Cancion | null;
  };

  // ── Listas completas, para resolver navegación cruzada sin ir a la red ────
  data: {
    reinos: Reino[];
    criaturas: CriaturaMin[];
    objetos: ObjetoMin[];
    ciudades: CiudadMin[];
    personajes: Personaje[];
    grupos: Grupo[];
    canciones: Cancion[];
  };

  // ── Setters de esas mismas listas (para reflejar saved/deleted) ───────────
  setters: {
    setReinos: Setter<Reino>;
    setCriaturas: Setter<CriaturaMin>;
    setObjetos: Setter<ObjetoMin>;
    setCiudades: Setter<CiudadMin>;
    setPersonajes: Setter<Personaje>;
    setHechizos: Setter<EntidadMagicaMin>;
    setDones: Setter<EntidadMagicaMin>;
    setRunas: Setter<RunaMin>;
  };

  // ── Acciones / selección / mutaciones que no son simples setState ─────────
  actions: {
    clearAllOverlays: () => void;
    selectReino: (r: Reino | null) => void;
    selectCiudad: (c: Ciudad | null) => void;
    selectGrupo: (g: Grupo | null) => void;
    selectCancion: (c: Cancion | null) => void;
    setSelectedReino: (r: Reino | null) => void;
    setSelectedCriatura: (c: any | null) => void;
    setSelectedObjeto: (o: any | null) => void;
    setSelectedCiudad: (c: Ciudad | null) => void;
    setSelectedPersonaje: (p: Personaje | null) => void;
    setSelectedHechizo: (h: EntidadMagicaMin | null) => void;
    setSelectedDon: (d: EntidadMagicaMin | null) => void;
    setSelectedRuna: (r: RunaMin | null) => void;
    setSelectedNota: (n: Nota | null) => void;
    setSelectedGrupo: (g: Grupo | null) => void;
    eliminarNota: (id: string) => void | Promise<void>;
    actualizarNota: (n: Nota) => void | Promise<void>;
    eliminarGrupo: (id: string) => void | Promise<void>;
    actualizarGrupo: (g: Grupo) => void | Promise<void>;
  };
};

// ─── Componente ────────────────────────────────────────────────────────────────
// Switch de los 11 editores de entidad. Extraído de PanelListas (EditorMundo.tsx)
// tal cual estaba: cada callback de navegación cruzada conserva exactamente su
// comportamiento original (algunos usan el wrapper selectX que persiste en
// localStorage, otros el setSelectedX directo — esa inconsistencia ya existía
// en el original y no se "corrige" acá para no cambiar comportamiento sin que
// se note).
export function EntidadOverlay({
  overlay,
  entities,
  selected,
  data,
  setters,
  actions,
}: EntidadOverlayProps) {
  const {
    reinos,
    criaturas,
    objetos,
    ciudades,
    personajes,
    grupos,
    canciones,
  } = data;
  const {
    setReinos,
    setCriaturas,
    setObjetos,
    setCiudades,
    setPersonajes,
    setHechizos,
    setDones,
    setRunas,
  } = setters;
  const {
    clearAllOverlays,
    selectReino,
    selectCiudad,
    selectGrupo,
    selectCancion,
    setSelectedReino,
    setSelectedCriatura,
    setSelectedObjeto,
    setSelectedCiudad,
    setSelectedPersonaje,
    setSelectedHechizo,
    setSelectedDon,
    setSelectedRuna,
    setSelectedNota,
    setSelectedGrupo,
    eliminarNota,
    actualizarNota,
    eliminarGrupo,
    actualizarGrupo,
  } = actions;

  if (!overlay) return null;

  return (
    <div
      className="flex flex-col min-h-0 flex-1"
      style={{ background: "var(--bg-main)" }}
    >
      {/* Botón volver al menú */}
      <div
        className="shrink-0 flex items-center px-3"
        style={{
          height: 40,
          borderBottom:
            "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <button
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary/70 transition-colors"
          type="button"
          onClick={clearAllOverlays}
        >
          <ChevronLeft size={12} />
          Volver
        </button>
      </div>

      {/* Contenido del editor activo */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {overlay === "reino" && selected.reino && (
          <EditorReino
            key={selected.reino.id}
            entities={entities}
            item={selected.reino}
            onDeleted={(id) => {
              setReinos((p) => p.filter((r) => r.id !== id));
              setSelectedReino(null);
            }}
            onSaved={(u) => {
              setReinos((p) => p.map((r) => (r.id === u.id ? u : r)));
              setSelectedReino(u);
            }}
            onSelectCiudad={async (id: string) => {
              const local = ciudades.find((x) => x.id === id);
              clearAllOverlays();
              if (local) {
                setSelectedCiudad(local as Ciudad);
                return;
              }
              const { data: remote } = await supabase
                .from("ciudades")
                .select("*")
                .eq("id", id)
                .single();
              if (remote) setSelectedCiudad(remote as Ciudad);
            }}
            onSelectItem={(id) => {
              const o = objetos.find((x) => x.id === id);
              if (!o) return;
              clearAllOverlays();
              setSelectedObjeto(o);
            }}
            onSelectPersonaje={(p) => {
              const found = personajes.find(
                (x) => x.id === p?.id || x.nombre === p?.nombre,
              );
              if (!found) return;
              clearAllOverlays();
              setSelectedPersonaje(found);
            }}
          />
        )}
        {overlay === "criatura" && selected.criatura && (
          <EditorCriatura
            key={selected.criatura.id}
            entities={entities}
            item={selected.criatura as any}
            onDeleted={(id) => {
              setCriaturas((p) => p.filter((c) => c.id !== id));
              setSelectedCriatura(null);
            }}
            onNavigateCiudad={async (id) => {
              const local = ciudades.find((x) => x.id === id);
              clearAllOverlays();
              if (local) {
                selectCiudad(local);
                return;
              }
              const { data: remote } = await supabase
                .from("ciudades")
                .select("*")
                .eq("id", id)
                .single();
              if (remote) selectCiudad(remote as Ciudad);
            }}
            onNavigateReino={async (id) => {
              const local = reinos.find((x) => x.id === id);
              clearAllOverlays();
              if (local) {
                selectReino(local);
                return;
              }
              const { data: remote } = await supabase
                .from("reinos")
                .select("*")
                .eq("id", id)
                .single();
              if (remote) selectReino(remote as Reino);
            }}
            onSaved={(u) => {
              setCriaturas((p) =>
                p.map((c) => (c.id === u.id ? { ...c, ...u } : c)),
              );
              setSelectedCriatura({ ...selected.criatura, ...u });
            }}
            onSelectGrupo={async (id) => {
              const local = grupos.find((x) => x.id === id);
              clearAllOverlays();
              if (local) {
                selectGrupo(local);
                return;
              }
              const { data: remote } = await supabase
                .from("grupos_mundo")
                .select("*")
                .eq("id", id)
                .single();
              if (remote)
                selectGrupo({
                  ...remote,
                  miembro_ids: remote.miembro_ids ?? [],
                } as Grupo);
            }}
            onSelectItem={(id) => {
              const o = objetos.find((x) => x.id === id);
              if (!o) return;
              clearAllOverlays();
              setSelectedObjeto(o);
            }}
            onSelectPersonaje={(id) => {
              const p = personajes.find((x) => x.id === id);
              if (!p) return;
              clearAllOverlays();
              setSelectedPersonaje(p);
            }}
          />
        )}
        {overlay === "objeto" && selected.objeto && (
          <EditorItem
            key={selected.objeto.id}
            entities={entities}
            item={selected.objeto as any}
            onDeleted={(id) => {
              setObjetos((p) => p.filter((o) => o.id !== id));
              setSelectedObjeto(null);
            }}
            onNavigateCiudad={async (id) => {
              const local = ciudades.find((x) => x.id === id);
              clearAllOverlays();
              if (local) {
                selectCiudad(local);
                return;
              }
              const { data: remote } = await supabase
                .from("ciudades")
                .select("*")
                .eq("id", id)
                .single();
              if (remote) selectCiudad(remote as Ciudad);
            }}
            onNavigateReino={async (id) => {
              const local = reinos.find((x) => x.id === id);
              clearAllOverlays();
              if (local) {
                selectReino(local);
                return;
              }
              const { data: remote } = await supabase
                .from("reinos")
                .select("*")
                .eq("id", id)
                .single();
              if (remote) selectReino(remote as Reino);
            }}
            onSaved={(u) => {
              setObjetos((p) =>
                p.map((o) => (o.id === u.id ? { ...o, ...u } : o)),
              );
              setSelectedObjeto({ ...selected.objeto, ...u });
            }}
          />
        )}
        {overlay === "ciudad" && selected.ciudad && (
          <EditorCiudad
            key={selected.ciudad.id}
            entities={entities}
            item={selected.ciudad}
            onDeleted={(id) => {
              setCiudades((p) => p.filter((l) => l.id !== id));
              setSelectedCiudad(null);
            }}
            onNavigateReino={(id) => {
              const r = reinos.find((x) => x.id === id);
              if (!r) return;
              clearAllOverlays();
              setSelectedReino(r);
            }}
            onSaved={(u) => {
              const uMin: CiudadMin = {
                id: u.id,
                nombre: u.nombre,
                imagen_url: u.imagen_url ?? undefined,
                tipo: u.tipo ?? undefined,
                reino_id: u.reino_id ?? undefined,
              };
              setCiudades((p) =>
                p.map((l) => (l.id === u.id ? { ...l, ...uMin } : l)),
              );
              setSelectedCiudad({ ...selected.ciudad, ...u });
            }}
            onSelectItem={(id) => {
              const o = objetos.find((x) => x.id === id);
              if (!o) return;
              clearAllOverlays();
              setSelectedObjeto(o);
            }}
            onSelectPersonaje={(id) => {
              const p = personajes.find((x) => x.id === id);
              if (!p) return;
              clearAllOverlays();
              setSelectedPersonaje(p);
            }}
          />
        )}
        {overlay === "personaje" && selected.personaje && (
          <EditorPersonaje
            key={selected.personaje.id}
            entities={entities}
            item={selected.personaje}
            onDeleted={(id) => {
              setPersonajes((p) => p.filter((x) => x.id !== id));
              setSelectedPersonaje(null);
            }}
            onNavigate={(tab, nombre) => {
              if (tab === "criaturas") {
                const c = criaturas.find(
                  (x) =>
                    (x.nombre ?? "").toLowerCase() === nombre.toLowerCase(),
                );
                if (!c) return;
                clearAllOverlays();
                setSelectedCriatura(c);
              } else if (tab === "reinos") {
                const r = reinos.find(
                  (x) =>
                    (x.nombre ?? "").toLowerCase() === nombre.toLowerCase(),
                );
                if (!r) return;
                clearAllOverlays();
                setSelectedReino(r);
              }
            }}
            onOpenGrupo={async (id) => {
              const local = grupos.find((x) => x.id === id);
              clearAllOverlays();
              if (local) {
                selectGrupo(local);
                return;
              }
              const { data: remote } = await supabase
                .from("grupos_mundo")
                .select("*")
                .eq("id", id)
                .single();
              if (remote)
                selectGrupo({
                  ...remote,
                  miembro_ids: remote.miembro_ids ?? [],
                } as Grupo);
            }}
            onSaved={(u) => {
              setPersonajes((p) => p.map((x) => (x.id === u.id ? u : x)));
              setSelectedPersonaje(u);
            }}
            onSelectCancion={async (id) => {
              const local = canciones.find((x) => x.id === id);
              clearAllOverlays();
              if (local) {
                selectCancion(local as unknown as Cancion);
                return;
              }
              const { data: remote } = await supabase
                .from("canciones")
                .select("*")
                .eq("id", id)
                .single();
              if (remote) selectCancion(remote as unknown as Cancion);
            }}
            onSelectPersonaje={(id) => {
              const p = personajes.find((x) => x.id === id);
              if (!p) return;
              clearAllOverlays();
              setSelectedPersonaje(p);
            }}
          />
        )}
        {overlay === "hechizo" && selected.hechizo && (
          <EditorHechizos
            initialSelectedId={selected.hechizo.id}
            modo="hechizos"
            onItemDeleted={(id) => {
              setHechizos((p) => p.filter((h) => h.id !== id));
              setSelectedHechizo(null);
            }}
            onItemSaved={(updated) =>
              setHechizos((p) =>
                p.map((h) =>
                  h.id === updated.id
                    ? { id: updated.id, nombre: updated.nombre }
                    : h,
                ),
              )
            }
            onSelectedIdChange={(id) => {
              if (!id) setSelectedHechizo(null);
            }}
          />
        )}
        {overlay === "don" && selected.don && (
          <EditorHechizos
            initialSelectedId={selected.don.id}
            modo="dones"
            onItemDeleted={(id) => {
              setDones((p) => p.filter((d) => d.id !== id));
              setSelectedDon(null);
            }}
            onItemSaved={(updated) =>
              setDones((p) =>
                p.map((d) =>
                  d.id === updated.id
                    ? { id: updated.id, nombre: updated.nombre }
                    : d,
                ),
              )
            }
            onSelectedIdChange={(id) => {
              if (!id) setSelectedDon(null);
            }}
          />
        )}
        {overlay === "runa" && selected.runa && (
          <EditorHechizos
            initialSelectedId={selected.runa.id}
            modo="runas"
            onItemDeleted={(id) => {
              setRunas((p) => p.filter((r) => r.id !== id));
              setSelectedRuna(null);
            }}
            onItemSaved={(updated) =>
              setRunas((p) =>
                p.map((r) =>
                  r.id === updated.id
                    ? {
                        id: updated.id,
                        nombre: updated.nombre,
                        imagen_url: (updated as any).imagen_url,
                      }
                    : r,
                ),
              )
            }
            onSelectedIdChange={(id) => {
              if (!id) setSelectedRuna(null);
            }}
          />
        )}
        {overlay === "nota" && selected.nota && (
          <EditorNota
            key={selected.nota.id}
            nota={selected.nota}
            onDeleted={(id) => {
              void eliminarNota(id);
              setSelectedNota(null);
            }}
            onSaved={async (updated) => {
              await actualizarNota(updated);
              setSelectedNota(updated);
            }}
          />
        )}
        {overlay === "grupo" && selected.grupo && (
          <EditorGrupo
            key={selected.grupo.id}
            grupo={selected.grupo}
            onClickMiembro={(id, tabla) => {
              if (tabla === "personajes") {
                const p = personajes.find((x) => x.id === id);
                if (!p) return;
                clearAllOverlays();
                setSelectedPersonaje(p);
              } else if (tabla === "criaturas") {
                const c = criaturas.find((x) => x.id === id);
                if (!c) return;
                clearAllOverlays();
                setSelectedCriatura(c);
              } else if (tabla === "items") {
                const o = objetos.find((x) => x.id === id);
                if (!o) return;
                clearAllOverlays();
                setSelectedObjeto(o);
              } else if (tabla === "reinos") {
                const r = reinos.find((x) => x.id === id);
                if (!r) return;
                clearAllOverlays();
                setSelectedReino(r);
              }
            }}
            onDeleted={async (id) => {
              await eliminarGrupo(id);
              setSelectedGrupo(null);
            }}
            onSaved={async (updated) => {
              await actualizarGrupo(updated);
              setSelectedGrupo(updated);
            }}
          />
        )}
        {overlay === "cancion" && selected.cancion && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <PanelEditor
              key={selected.cancion.id}
              cancionId={selected.cancion.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}
