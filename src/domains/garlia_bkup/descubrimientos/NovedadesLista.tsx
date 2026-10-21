"use client";
import { useEffect, useState } from "react";

import type { Novedad } from "./novedades";
import { novedadesQueries } from "./novedades";

/**
 * Lista de novedades publicadas — texto simple, sin cards grandes, en
 * columna única (es contenido de lectura, no un grid de items).
 */
export function NovedadesLista() {
  const [items, setItems] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    novedadesQueries
      .listPublicadas()
      .then((data) => {
        if (mounted) setItems(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
        Sin novedades todavía
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y max-w-3xl" style={{ borderColor: "transparent" }}>
      {items.map((n) => (
        <article key={n.id} className="py-3 first:pt-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              className="text-sm font-black uppercase tracking-tight"
              style={{ color: "var(--primary)" }}
            >
              {n.titulo}
            </h3>
            <time
              className="text-micro font-bold uppercase tracking-widest shrink-0"
              style={{
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            >
              {new Date(n.fecha).toLocaleDateString()}
            </time>
          </div>
          <p
            className="text-micro font-medium leading-relaxed mt-1"
            style={{
              color: "color-mix(in srgb, var(--primary) 60%, transparent)",
            }}
          >
            {n.cuerpo}
          </p>
        </article>
      ))}
    </div>
  );
}
