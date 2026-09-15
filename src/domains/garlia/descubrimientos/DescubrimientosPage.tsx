"use client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useState } from "react";

import { Btn } from "@/ui/Buttons";
import { SmartImage } from "@/ui/SmartImage";
import { useAuth } from "@/providers/AuthProvider";

import { ModalPublicarDescubrimiento } from "./ModalPublicarDescubrimiento";
import { descubrimientosQueries } from "./queries";
import { CATEGORIAS_DESCUBRIMIENTOS, ICONO_NOVEDADES } from "./types";
import { useDescubrimientosPublicados } from "./useDescubrimientosPublicados";
import { NovedadesLista } from "./NovedadesLista";

const NOVEDADES_SLUG = "novedades";

/**
 * Página pública /garlia/biblioteca/descubrimientos.
 *
 * Barra de subcategorías (íconos chicos, ?cat=slug) + grilla densa a lo
 * ancho — mismo criterio minimalista que el resto de Biblioteca. La
 * categoría activa se guarda en el querystring para que se pueda linkear
 * directo (ej. .../descubrimientos?cat=criaturas).
 *
 * Admins ven además un botón "Publicar descubrimiento" que abre el
 * formulario (título, descripción, tipo, entidad, fecha, reino/ciudad
 * opcionales) y, sobre cada card ya publicada, acciones de editar/quitar.
 */
export default function DescubrimientosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin } = useAuth() as { isAdmin: boolean };

  const activa = searchParams.get("cat") || CATEGORIAS_DESCUBRIMIENTOS[0].slug;
  const esNovedades = activa === NOVEDADES_SLUG;
  const categoria = CATEGORIAS_DESCUBRIMIENTOS.find((c) => c.slug === activa);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const setCategoria = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cat", slug);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const abrirNuevo = () => {
    setEditando(null);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 pb-3 mb-3 flex-wrap">
        <nav
          className="flex items-center gap-1 flex-wrap"
          aria-label="Categorías de descubrimientos"
        >
          {CATEGORIAS_DESCUBRIMIENTOS.map(({ slug, titulo, icon: Icon }) => (
            <SubTabButton
              key={slug}
              active={activa === slug}
              icon={Icon}
              label={titulo}
              onClick={() => setCategoria(slug)}
            />
          ))}
          <div
            className="w-px self-stretch mx-1"
            style={{
              background:
                "color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          />
          <SubTabButton
            active={esNovedades}
            icon={ICONO_NOVEDADES}
            label="Novedades"
            onClick={() => setCategoria(NOVEDADES_SLUG)}
          />
        </nav>

        {isAdmin && !esNovedades && (
          <Btn icon={<Plus size={14} />} size="sm" onClick={abrirNuevo}>
            Publicar descubrimiento
          </Btn>
        )}
      </div>

      <div
        className="pb-3 mb-3"
        style={{
          borderBottom:
            "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      />

      {esNovedades ? (
        <NovedadesLista />
      ) : (
        <CategoriaGrid
          key={refreshKey}
          isAdmin={isAdmin}
          slug={activa}
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
      )}

      <ModalPublicarDescubrimiento
        editando={editando}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

function SubTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className="flex items-center justify-center transition-all"
      style={{
        width: 28,
        height: 28,
        borderRadius: "var(--radius-btn)",
        background: active
          ? "color-mix(in srgb, var(--primary) 10%, transparent)"
          : "transparent",
        color: active
          ? "var(--primary)"
          : "color-mix(in srgb, var(--primary) 40%, transparent)",
      }}
    >
      <Icon size={13} strokeWidth={active ? 2.5 : 2} />
    </button>
  );
}

function CategoriaGrid({
  slug,
  isAdmin,
  onEditar,
}: {
  slug: string;
  isAdmin: boolean;
  onEditar: (item: any) => void;
}) {
  const categoria = CATEGORIAS_DESCUBRIMIENTOS.find((c) => c.slug === slug);
  const { items, loading } = useDescubrimientosPublicados(
    categoria?.tipos ?? [],
  );
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  if (!categoria) return null;

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

  if (items.length === 0) {
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
      {items.map((item) => (
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
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
            }}
          >
            {item.imagen_url ? (
              <SmartImage
                alt={item.nombre}
                className="w-full h-full object-cover"
                src={item.imagen_url}
              />
            ) : (
              <categoria.icon
                size={18}
                style={{
                  color: "color-mix(in srgb, var(--primary) 25%, transparent)",
                }}
              />
            )}
          </div>
          <p
            className="text-micro font-black uppercase tracking-tight leading-tight line-clamp-2"
            style={{ color: "var(--primary)" }}
          >
            {item.nombre}
          </p>
        </div>
      ))}
    </div>
  );
}
