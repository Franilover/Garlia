"use client";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React from "react";

import { SmartImage } from "@/ui/SmartImage";

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
 */
export default function DescubrimientosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activa = searchParams.get("cat") || CATEGORIAS_DESCUBRIMIENTOS[0].slug;
  const esNovedades = activa === NOVEDADES_SLUG;

  const setCategoria = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cat", slug);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div>
      <nav
        className="flex items-center gap-1 flex-wrap pb-3 mb-3"
        style={{
          borderBottom:
            "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
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
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        />
        <SubTabButton
          active={esNovedades}
          icon={ICONO_NOVEDADES}
          label="Novedades"
          onClick={() => setCategoria(NOVEDADES_SLUG)}
        />
      </nav>

      {esNovedades ? (
        <NovedadesLista />
      ) : (
        <CategoriaGrid slug={activa} />
      )}
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

function CategoriaGrid({ slug }: { slug: string }) {
  const categoria = CATEGORIAS_DESCUBRIMIENTOS.find((c) => c.slug === slug);
  const { items, loading } = useDescubrimientosPublicados(
    categoria?.tipos ?? [],
  );

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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-1.5 p-2 transition-colors"
          style={{
            borderRadius: "var(--radius-btn)",
            border:
              "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
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
