"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, Search, X, Flame, Tag } from "lucide-react";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { Ingrediente } from "@/lib/types/personal/ingrediente";

export default function ComprasPage() {
  const { data: ingredientes, loading } = useSupabaseData<Ingrediente>("ingredientes");

  const [search, setSearch] = useState("");

  const items = useMemo(() =>
    ingredientes.filter(i =>
      !search || i.nombre.toLowerCase().includes(search.toLowerCase())
    ),
  [ingredientes, search]);

  const totales = useMemo(() => items.reduce(
    (acc, i) => ({
      kcal:          acc.kcal          + (i.kcal          ?? 0),
      proteinas:     acc.proteinas     + (i.proteinas     ?? 0),
      carbohidratos: acc.carbohidratos + (i.carbohidratos ?? 0),
      grasas:        acc.grasas        + (i.grasas        ?? 0),
      precio:        acc.precio        + ((i as any).precio_porcion ?? 0),
    }),
    { kcal: 0, proteinas: 0, carbohidratos: 0, grasas: 0, precio: 0 }
  ), [items]);

  return (
    <div className="min-h-screen bg-bg-main pb-20 text-foreground">
      <header className="sticky top-16 z-10 bg-bg-main/90 backdrop-blur-xl border-b border-primary/10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href="/personal/salud"
              className="inline-flex items-center gap-1 mb-1 text-[9px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
            >
              <ChevronLeft size={12} /> Salud
            </Link>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-primary">
              Compras
            </h1>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30" size={13} />
            <input
              placeholder="Buscar..."
              className="input-brand pl-9 pr-8 text-[11px] py-2"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-5">
        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="animate-spin text-primary/30" size={32} />
          </div>
        ) : (
          <div className="card-main overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary/8">
                  <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-primary/30 w-full">Ingrediente</th>
                  <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-primary/30 whitespace-nowrap">Kcal</th>
                  <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-primary/30 whitespace-nowrap hidden sm:table-cell">Prot</th>
                  <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-primary/30 whitespace-nowrap hidden sm:table-cell">Carb</th>
                  <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-primary/30 whitespace-nowrap hidden sm:table-cell">Gras</th>
                  <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-primary/30 whitespace-nowrap">Precio</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.id}
                    className={`border-b border-primary/5 last:border-0 hover:bg-primary/2 transition-colors ${i % 2 === 0 ? "" : "bg-primary/1.5"}`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-black uppercase italic tracking-tight text-primary leading-none">{item.nombre}</p>
                      <p className="text-[9px] font-bold text-primary/30 uppercase mt-0.5">{item.porcion_texto}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[11px] font-black text-primary">{(item.kcal ?? 0).toFixed(0)}</span>
                      <span className="text-[8px] text-primary/25 ml-0.5">kcal</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-[11px] font-black text-primary">{(item.proteinas ?? 0).toFixed(1)}</span>
                      <span className="text-[8px] text-primary/25 ml-0.5">g</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-[11px] font-black text-primary">{(item.carbohidratos ?? 0).toFixed(1)}</span>
                      <span className="text-[8px] text-primary/25 ml-0.5">g</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-[11px] font-black text-primary">{(item.grasas ?? 0).toFixed(1)}</span>
                      <span className="text-[8px] text-primary/25 ml-0.5">g</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(item as any).precio_porcion ? (
                        <span className="text-[11px] font-black text-primary">${((item as any).precio_porcion).toFixed(2)}</span>
                      ) : (
                        <span className="text-[10px] text-primary/15">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary/10 bg-primary/2">
                  <td className="px-4 py-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">{items.length} ingredientes</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[11px] font-black text-primary">{totales.kcal.toFixed(0)}</span>
                    <span className="text-[8px] text-primary/25 ml-0.5">kcal</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="text-[11px] font-black text-primary">{totales.proteinas.toFixed(1)}</span>
                    <span className="text-[8px] text-primary/25 ml-0.5">g</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="text-[11px] font-black text-primary">{totales.carbohidratos.toFixed(1)}</span>
                    <span className="text-[8px] text-primary/25 ml-0.5">g</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="text-[11px] font-black text-primary">{totales.grasas.toFixed(1)}</span>
                    <span className="text-[8px] text-primary/25 ml-0.5">g</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {totales.precio > 0 ? (
                      <span className="text-[11px] font-black text-primary">${totales.precio.toFixed(2)}</span>
                    ) : (
                      <span className="text-[10px] text-primary/15">—</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}