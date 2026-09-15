"use client";
import { Trash2 } from "lucide-react";
import React, { useState } from "react";

import { useAuth } from "@/providers/AuthProvider";

import { BotonPublicarTeoria } from "./BotonPublicarTeoria";
import { ModalPublicarTeoria } from "./ModalPublicarTeoria";
import { teoriasQueries } from "./queries";
import { useTeorias } from "./useTeorias";

/**
 * Página pública /garlia/universo/teorias.
 *
 * Cualquier usuario logueado puede publicar una teoría (título + texto
 * libre, ver sql/teorias.sql). Cada card muestra el autor. El botón de
 * borrar solo aparece para el autor de esa teoría o para un admin — RLS
 * hace cumplir lo mismo del lado del servidor.
 */
export default function TeoriasPage() {
  const { isAdmin, user } = useAuth() as {
    isAdmin: boolean;
    user: { id: string } | null;
  };
  const { items, loading, refresh } = useTeorias();
  const [modalOpen, setModalOpen] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  const handleBorrar = async (id: string) => {
    if (borrandoId) return;
    setBorrandoId(id);
    try {
      await teoriasQueries.eliminar(id);
      await refresh();
    } finally {
      setBorrandoId(null);
    }
  };

  return (
    <div>
      {user && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 mb-3">
          <BotonPublicarTeoria onClick={() => setModalOpen(true)} />
        </div>
      )}

      {loading ? (
        <p
          className="text-micro font-bold uppercase tracking-widest py-8 text-center"
          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
        >
          Cargando…
        </p>
      ) : items.length === 0 ? (
        <p
          className="text-micro font-bold uppercase tracking-widest py-10 text-center"
          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
        >
          Nada publicado todavía
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((item) => {
            const puedeBorrar = isAdmin || item.autor_id === user?.id;
            return (
              <div
                key={item.id}
                className="relative group flex flex-col gap-1.5 p-3 transition-colors"
                style={{
                  borderRadius: "var(--radius-btn)",
                  border:
                    "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                {puedeBorrar && (
                  <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      aria-label="Borrar teoría"
                      className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-btn)]"
                      style={{
                        background: "var(--white-custom)",
                        color: "#ef4444",
                        border: "var(--border-width) solid rgba(239,68,68,0.2)",
                      }}
                      title="Borrar teoría"
                      type="button"
                      onClick={() => handleBorrar(item.id)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}

                <p
                  className="text-micro font-black uppercase tracking-tight leading-tight"
                  style={{ color: "var(--primary)" }}
                >
                  {item.titulo}
                </p>
                <p
                  className="text-sm leading-snug line-clamp-6"
                  style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}
                >
                  {item.contenido}
                </p>
                <p
                  className="text-micro font-bold uppercase tracking-widest mt-1"
                  style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                >
                  {item.autor_username ?? "Anónimo"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <ModalPublicarTeoria
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
