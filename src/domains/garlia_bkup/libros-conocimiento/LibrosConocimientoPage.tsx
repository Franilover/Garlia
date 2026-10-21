"use client";
import { BookOpen, Trash2 } from "lucide-react";
import React, { useState } from "react";

import { useAuth } from "@/providers/AuthProvider";

import { BotonAnadirLibro } from "./BotonAnadirLibro";
import { ModalAnadirLibro } from "./ModalAnadirLibro";
import { librosConocimientoQueries } from "./queries";
import { useLibrosConocimiento } from "./useLibrosConocimiento";
import { VisorLibroConocimiento } from "./VisorLibroConocimiento";

/**
 * Página pública /garlia/universo/libros ("libros de conocimiento").
 *
 * Distinto de /garlia/libros (biblioteca de historia/aventura con
 * capítulos). Acá cada card es sólo un libro simple: título + páginas de
 * texto. Solo admin puede añadir/borrar (ver BotonAnadirLibro). Al hacer
 * click en una card se abre el visor de "dos páginas abiertas".
 */
export default function LibrosConocimientoPage() {
  const { isAdmin } = useAuth() as { isAdmin: boolean };
  const { items, loading, refresh } = useLibrosConocimiento();
  const [modalOpen, setModalOpen] = useState(false);
  const [libroAbiertoId, setLibroAbiertoId] = useState<string | null>(null);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  const handleBorrar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (borrandoId) return;
    setBorrandoId(id);
    try {
      await librosConocimientoQueries.eliminar(id);
      await refresh();
    } finally {
      setBorrandoId(null);
    }
  };

  return (
    <div>
      {loading ? (
        <p
          className="text-micro font-bold uppercase tracking-widest py-8 text-center"
          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
        >
          Cargando…
        </p>
      ) : items.length === 0 && !isAdmin ? (
        <p
          className="text-micro font-bold uppercase tracking-widest py-10 text-center"
          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
        >
          Nada publicado todavía
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <BotonAnadirLibro onClick={() => setModalOpen(true)} />
          {items.map((item) => (
            <button
              key={item.id}
              className="relative group flex flex-col gap-1.5 p-3 text-left transition-colors"
              style={{
                borderRadius: "var(--radius-btn)",
                border:
                  "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
              }}
              type="button"
              onClick={() => setLibroAbiertoId(item.id)}
            >
              {isAdmin && (
                <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    aria-label="Borrar libro"
                    className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-btn)]"
                    style={{
                      background: "var(--white-custom)",
                      color: "#ef4444",
                      border: "var(--border-width) solid rgba(239,68,68,0.2)",
                    }}
                    title="Borrar libro"
                    type="button"
                    onClick={(e) => handleBorrar(item.id, e)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}

              <BookOpen
                size={18}
                style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
              />
              <p
                className="text-micro font-black uppercase tracking-tight leading-tight"
                style={{ color: "var(--primary)" }}
              >
                {item.titulo}
              </p>
            </button>
          ))}
        </div>
      )}

      <ModalAnadirLibro
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />

      <VisorLibroConocimiento
        libroId={libroAbiertoId}
        onClose={() => setLibroAbiertoId(null)}
      />
    </div>
  );
}
