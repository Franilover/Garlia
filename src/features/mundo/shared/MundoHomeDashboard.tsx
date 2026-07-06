"use client";

/**
 * MundoHomeDashboard
 * ───────────────────────────────────────────────────────────────────────────
 * Reemplaza a <MundoMenu /> como vista por defecto cuando section === null.
 * En vez de una barra lateral angosta con una lista de botones, esto es un
 * "home dashboard": ocupa todo el ancho, agrupa las 12 secciones en tarjetas
 * grandes clickeables organizadas por categoría (Entidades, Geografía,
 * Historia, Organización, Magia), usando MUNDO_MENU_GROUPS como única fuente
 * de verdad (misma lista que ya usaban MundoMenu y SiblingSectionTabs).
 *
 * No agrega estado nuevo: solo llama selectSection() del store existente.
 */

import React from "react";

import { useMundoNavigation } from "../store/useMundoNavigationStore";
import { MUNDO_MENU_GROUPS } from "./mundoMenuGroups";

export function MundoHomeDashboard() {
  const selectSection = useMundoNavigation((s) => s.selectSection);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-xl font-black text-primary">Editor de Mundo</h1>
          <p className="text-xs text-primary/40 mt-1">
            Elegí una sección para empezar a editar.
          </p>
        </header>

        <div className="flex flex-col gap-8">
          {MUNDO_MENU_GROUPS.map((group) => (
            <section key={group.title}>
              <h2 className="text-micro font-black uppercase tracking-widest text-primary/30 mb-3">
                {group.title}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectSection(item.key)}
                    className="group flex flex-col items-start gap-3 p-4 rounded-2xl border border-primary/10 bg-primary/[0.02] text-left transition-colors hover:bg-primary/5 hover:border-primary/25"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center group-hover:border-primary/25 transition-colors">
                      <item.Icon size={16} className="text-primary/60" strokeWidth={2} />
                    </div>
                    <span className="text-sm font-semibold text-primary/80">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
