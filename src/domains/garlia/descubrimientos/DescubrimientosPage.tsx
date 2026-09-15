"use client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import React, { useState } from "react";

import { SmartImage } from "@/ui/SmartImage";
import { useAuth } from "@/providers/AuthProvider";

import { ModalPublicarDescubrimiento } from "./ModalPublicarDescubrimiento";
import { descubrimientosQueries } from "./queries";
import { CATEGORIAS_DESCUBRIMIENTOS, TODOS_LOS_TIPOS } from "./types";
import { useDescubrimientosPublicados } from "./useDescubrimientosPublicados";

/**
 * Página pública /garlia/universo/descubrimientos.
 *
 * Sin tabs de categoría: se listan TODAS las entidades publicadas juntas,
 * sin importar su tipo (criatura, elemento, material, reino...), en una
 * sola grilla densa y a lo ancho. El ícono de cada card sigue viniendo de
 * su categoría (para diferenciarlas visualmente cuando no tienen imagen),
 * pero ya no hay botones para filtrar por categoría.
 *
 * Admins ven además una card "Añadir" (mismo porte que las demás, con un
 * + al centro) como primer elemento de la grilla, que abre el formulario
 * (título, descripción, tipo, entidad, fecha, reino/ciudad opcionales) y,
 * sobre cada card ya publicada, acciones de editar/quitar.
 *
 * "Novedades" ya no vive acá — si se necesita, se linkea aparte.
 */
export default function DescubrimientosPage() {
  const { isAdmin, user } = useAuth() as {
    isAdmin: boolean;
    user: { id: string } | null;
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const abrirNuevo = () => {
    setEditando(null);
    setModalOpen(true);
  };

  return (
    <div>
      <TodosGrid
        key={refreshKey}
        isAdmin={isAdmin}
        perfilId={user?.id ?? null}
        onAgregar={abrirNuevo}
        onEditar={(item) => {
          setEditando({
            id: item.id,
            tipo_entidad: item.tipo_entidad,
            entidad_id: item.entidad_id,
            titulo: item.nombre,
            descripcion: item.descripcion ?? "",
            fecha: item.fecha,
            reino_id: item.reino_id,
            ciudad_id: item.ciudad_id,
          });
          setModalOpen(true);
        }}
      />

      <ModalPublicarDescubrimiento
        editando={editando}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

/** Ícono por tipo_entidad, resuelto contra la categoría a la que pertenece. */
function iconoDeTipo(tipo: string) {
  const categoria = CATEGORIAS_DESCUBRIMIENTOS.find((c) =>
    c.tipos.includes(tipo as any),
  );
  return categoria?.icon;
}

function TodosGrid({
  isAdmin,
  perfilId,
  onAgregar,
  onEditar,
}: {
  isAdmin: boolean;
  perfilId: string | null;
  onAgregar: () => void;
  onEditar: (item: any) => void;
}) {
  const { items, loading } = useDescubrimientosPublicados(TODOS_LOS_TIPOS, {
    esAdmin: isAdmin,
    perfilId,
  });
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  if (loading) {
    return (
      <p
        className="text-micro font-bold uppercase tracking-widest py-8 text-center"
        style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
      >
        Cargando…
      </p>
    );
  }

  if (items.length === 0 && !isAdmin) {
    return (
      <p
        className="text-micro font-bold uppercase tracking-widest py-10 text-center"
        style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
      >
        Nada publicado todavía
      </p>
    );
  }

  const handleBorrar = async (id: string) => {
    if (borrandoId) return;
    setBorrandoId(id);
    try {
      await descubrimientosQueries.eliminar(id);
      window.location.reload();
    } finally {
      setBorrandoId(null);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
      {isAdmin && (
        <button
          aria-label="Publicar descubrimiento"
          type="button"
          className="relative flex flex-col items-center justify-center gap-1.5 p-2 aspect-square transition-colors"
          style={{
            borderRadius: "var(--radius-btn)",
            border:
              "var(--border-width) dashed color-mix(in srgb, var(--primary) 20%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
          onClick={onAgregar}
        >
          <Plus
            size={22}
            style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
          />
          <span
            className="text-micro font-black uppercase tracking-tight"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            Añadir
          </span>
        </button>
      )}
      {items.map((item) => {
        const Icon = iconoDeTipo(item.tipo_entidad);
        return (
          <div
            key={item.id}
            className="relative group flex flex-col gap-1.5 p-2 transition-colors"
            style={{
              borderRadius: "var(--radius-btn)",
              border:
                "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            {isAdmin && (
              <div className="absolute top-1.5 right-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  aria-label="Editar"
                  className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-btn)]"
                  style={{
                    background: "var(--white-custom)",
                    color: "var(--primary)",
                    border:
                      "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
                  }}
                  title="Editar"
                  type="button"
                  onClick={() => onEditar(item)}
                >
                  <Pencil size={11} />
                </button>
                <button
                  aria-label="Quitar de la Biblioteca"
                  className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-btn)]"
                  style={{
                    background: "var(--white-custom)",
                    color: "#ef4444",
                    border: "var(--border-width) solid rgba(239,68,68,0.2)",
                  }}
                  title="Quitar de la Biblioteca"
                  type="button"
                  onClick={() => handleBorrar(item.id)}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )}

            <div
              className="w-full aspect-square overflow-hidden flex items-center justify-center"
              style={{
                borderRadius: "var(--radius-btn)",
                background:
                  "color-mix(in srgb, var(--primary) 4%, transparent)",
              }}
            >
              {item.imagen_url ? (
                <SmartImage
                  alt={item.nombre}
                  className="w-full h-full object-cover"
                  src={item.imagen_url}
                />
              ) : Icon ? (
                <Icon
                  size={18}
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 25%, transparent)",
                  }}
                />
              ) : null}
            </div>
            <p
              className="text-micro font-black uppercase tracking-tight leading-tight line-clamp-2"
              style={{ color: "var(--primary)" }}
            >
              {item.nombre}
            </p>
          </div>
        );
      })}
    </div>
  );
}
