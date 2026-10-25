"use client";

/**
 * GarumisSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Sección del editor de mundo dedicada a los Garumis: criaturas canónicas
 * derivadas de los Originales (Orumi, Varum, Nyru).
 *
 * Estado actual: stub de navegación.  Las subsecciones (Catálogo, Árbol de
 * linajes, Ficha, Creador, Originales) se implementarán en fases sucesivas
 * después de auditar las tablas existentes en Supabase.
 *
 * Tablas relevantes ya existentes en Supabase que esta sección reutilizará:
 *   - criaturas          → identidad biológica base
 *   - clados             → clasificación filogenética (4 filas actuales)
 *   - organismos         → modelo biológico canónico
 *   - criatura_organismos → vínculo criatura ↔ organismo
 *   - historia_evolutiva → relaciones evolutivas entre especies
 *   - rasgos_biologicos  → rasgos descriptivos reutilizables
 *   - clado_rasgos       → rasgos asociados a cada clado
 *   - clado_criaturas    → clasificación secundaria de criaturas
 *
 * Tablas nuevas propuestas (a crear solo tras auditoría):
 *   - garumis            → registro central de cada especie Garumi
 *   - originales_garumi  → Orumi, Varum, Nyru y sus datos propios
 *   - garumi_relaciones  → relaciones evolutivas / ramificaciones
 *   - garumi_rasgos      → capacidades y características consultables
 *   - garumi_notas       → borradores e ideas sin canonizar
 */

import { Dna, Leaf, GitBranch, Plus, BookOpen, Sparkles } from "lucide-react";
import React from "react";

// ── Tipos locales ─────────────────────────────────────────────────────────────

type SubseccionKey =
  | "catalogo"
  | "arbol"
  | "originales"
  | "creador";

interface Subseccion {
  key: SubseccionKey;
  label: string;
  descripcion: string;
  Icon: React.ElementType;
  disponible: boolean;
}

// ── Configuración de subsecciones ────────────────────────────────────────────

const SUBSECCIONES: Subseccion[] = [
  {
    key: "catalogo",
    label: "Catálogo",
    descripcion: "Fichas de todas las especies Garumi con filtros por Original, etapa evolutiva y capacidades.",
    Icon: Leaf,
    disponible: false,
  },
  {
    key: "arbol",
    label: "Árbol de linajes",
    descripcion: "Visualización de cada Original y sus descendientes, con líneas evolutivas y ramificaciones.",
    Icon: GitBranch,
    disponible: false,
  },
  {
    key: "originales",
    label: "Originales",
    descripcion: "Fichas de Orumi, Varum y Nyru: naturaleza, rasgos generales y descendientes.",
    Icon: Sparkles,
    disponible: false,
  },
  {
    key: "creador",
    label: "Nuevo Garumi",
    descripcion: "Formulario guiado para registrar una propuesta y guardarla como borrador antes de canonizarla.",
    Icon: Plus,
    disponible: false,
  },
];

// ── Componente ────────────────────────────────────────────────────────────────

export function GarumisSection() {
  const [subseccion, setSubseccion] = React.useState<SubseccionKey | null>(null);

  // Cuando haya subsecciones implementadas se renderizarán aquí según `subseccion`.
  // Por ahora siempre muestra el menú de entrada.
  void subseccion;

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ background: "var(--bg-main)" }}
    >
      {/* Cabecera */}
      <div
        className="shrink-0 flex items-center gap-3 px-6 py-5 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <span
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-btn)",
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "var(--primary)",
          }}
        >
          <Dna size={18} strokeWidth={2} />
        </span>
        <div>
          <h1
            className="font-black uppercase tracking-widest"
            style={{ fontSize: 13, color: "var(--primary)" }}
          >
            Garumis
          </h1>
          <p
            className="text-micro font-medium"
            style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
          >
            Criaturas canónicas derivadas de los Originales
          </p>
        </div>
      </div>

      {/* Cuerpo — grid de tarjetas de subsección */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
        >
          {SUBSECCIONES.map(({ key, label, descripcion, Icon, disponible }) => (
            <button
              key={key}
              type="button"
              disabled={!disponible}
              className="text-left flex flex-col gap-2 p-4 transition-all"
              style={{
                borderRadius: "var(--radius-card)",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
                background: disponible
                  ? "color-mix(in srgb, var(--primary) 4%, transparent)"
                  : "color-mix(in srgb, var(--primary) 2%, transparent)",
                opacity: disponible ? 1 : 0.55,
                cursor: disponible ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (!disponible) return;
                (e.currentTarget as HTMLElement).style.background =
                  "color-mix(in srgb, var(--primary) 8%, transparent)";
              }}
              onMouseLeave={(e) => {
                if (!disponible) return;
                (e.currentTarget as HTMLElement).style.background =
                  "color-mix(in srgb, var(--primary) 4%, transparent)";
              }}
              onClick={() => disponible && setSubseccion(key)}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  size={14}
                  strokeWidth={2}
                  style={{ color: "var(--primary)", flexShrink: 0 }}
                />
                <span
                  className="font-black uppercase tracking-widest"
                  style={{
                    fontSize: 11,
                    color: "var(--primary)",
                  }}
                >
                  {label}
                </span>
                {!disponible && (
                  <span
                    className="ml-auto font-black uppercase tracking-widest"
                    style={{
                      fontSize: 9,
                      color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Próximamente
                  </span>
                )}
              </div>
              <p
                className="text-micro leading-relaxed"
                style={{
                  color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                  fontSize: 11,
                }}
              >
                {descripcion}
              </p>
            </button>
          ))}
        </div>

        {/* Nota de estado */}
        <div
          className="mt-6 flex items-start gap-3 p-4"
          style={{
            borderRadius: "var(--radius-card)",
            border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <BookOpen
            size={14}
            strokeWidth={2}
            style={{
              color: "color-mix(in srgb, var(--primary) 45%, transparent)",
              flexShrink: 0,
              marginTop: 1,
            }}
          />
          <p
            className="text-micro leading-relaxed"
            style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)", fontSize: 11 }}
          >
            Las subsecciones se implementarán en fases. El primer paso es auditar
            las tablas existentes en Supabase —{" "}
            <span style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>
              criaturas, clados, organismos, historia_evolutiva
            </span>{" "}
            — para no duplicar datos canónicos que ya están almacenados. Solo se
            crearán tablas nuevas para lo que realmente falte.
          </p>
        </div>
      </div>
    </div>
  );
}
