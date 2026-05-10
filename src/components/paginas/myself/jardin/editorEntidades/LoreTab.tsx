
import React, { useState } from "react";
import { Globe, Mountain, Landmark, Users, Coins } from "lucide-react";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";
import { type Reino } from "./types";

// ─── Definición de secciones ─────────────────────────────────────────────────

type LoreKey = "historia" | "geografia" | "cultura" | "politica" | "economia";

const LORE_SECTIONS: {
  key: LoreKey;
  label: string;
  Icon: React.ElementType;
  placeholder: string;
  rows: number;
}[] = [
  {
    key: "historia",
    label: "Historia",
    Icon: Globe,
    placeholder: "Origen, eventos clave, cronología del reino…",
    rows: 20,
  },
  {
    key: "geografia",
    label: "Geografía",
    Icon: Mountain,
    placeholder: "Paisajes, clima, fronteras, ciudades principales…",
    rows: 20,
  },
  {
    key: "cultura",
    label: "Cultura",
    Icon: Landmark,
    placeholder: "Tradiciones, religión, idioma, costumbres, arte…",
    rows: 20,
  },
  {
    key: "politica",
    label: "Política",
    Icon: Users,
    placeholder: "Sistema de gobierno, facciones, líderes, leyes…",
    rows: 20,
  },
  {
    key: "economia",
    label: "Economía",
    Icon: Coins,
    placeholder: "Recursos, comercio, moneda, riqueza…",
    rows: 20,
  },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export function LoreTab({
  form,
  setForm,
  entities = [],
}: {
  form: Reino;
  setForm: React.Dispatch<React.SetStateAction<Reino>>;
  entities?: WikiEntity[];
}) {
  const [activeKey, setActiveKey] = useState<LoreKey>("historia");
  const { onSnippetAction } = useWikilink();

  const active = LORE_SECTIONS.find((s) => s.key === activeKey)!;

  return (
    <div className="flex h-full min-h-0">

      {/* ── Nav lateral ─────────────────────────────────────────────────────── */}
      <nav
        className="shrink-0 flex flex-col gap-0.5 p-2 border-r overflow-y-auto"
        style={{
          width: "clamp(40px, 15%, 130px)",
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        {LORE_SECTIONS.map(({ key, label, Icon }) => {
          const hasContent = !!((form as any)[key] as string | undefined)?.trim();
          const isActive = key === activeKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              title={label}
              className="relative flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all group"
              style={
                isActive
                  ? {
                      background:
                        "color-mix(in srgb, var(--primary) 12%, transparent)",
                      color: "var(--primary)",
                      border:
                        "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
                    }
                  : {
                      color:
                        "color-mix(in srgb, var(--primary) 40%, transparent)",
                      border: "1px solid transparent",
                    }
              }
            >
              {/* Icono */}
              <Icon
                size={12}
                className="shrink-0"
                style={{ opacity: isActive ? 1 : 0.55 }}
              />

              {/* Texto — oculto en pantallas muy pequeñas */}
              <span className="hidden sm:block text-[9px] font-black uppercase tracking-[0.2em] truncate">
                {label}
              </span>

              {/* Indicador de contenido */}
              {hasContent && (
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isActive
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 35%, transparent)",
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Panel editor ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Cabecera de la sección activa */}
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          <active.Icon
            size={11}
            style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
          />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/40">
            {active.label}
          </span>

          {/* Badge "vacío" si no hay contenido */}
          {!((form as any)[active.key] as string | undefined)?.trim() && (
            <span className="text-[8px] font-black uppercase tracking-widest text-primary/20 border border-primary/10 px-1.5 py-0.5 rounded-md">
              vacío
            </span>
          )}
        </div>

        {/* Editor — ocupa todo el espacio restante */}
        <div className="flex-1 overflow-y-auto p-3">
          <MarkdownEditor
            key={active.key} // remonta al cambiar sección → evita state stale
            value={(form as any)[active.key] ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, [active.key]: v }))}
            placeholder={active.placeholder}
            rows={active.rows}
            toolbar
            defaultMode="edit"
            onSnippetAction={onSnippetAction}
            entities={entities}
          />
        </div>
      </div>
    </div>
  );
}
