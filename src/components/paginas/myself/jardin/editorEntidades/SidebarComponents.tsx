"use client";

import React, { useState } from "react";
import {
  Loader2, Eye, EyeOff, Plus, Globe,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { TAB_CONFIG, MUNDO_SECTIONS, type TabKey, type MundoSectionKey } from "./types";

// ─── EntidadCard ──────────────────────────────────────────────────────────────

export function EntidadCard({ item, tab, selected, onClick, onToggleOculto }: {
  item: any; tab: TabKey; selected: boolean; onClick: () => void;
  onToggleOculto?: (id: string, oculto: boolean) => void;
}) {
  const img = tab === "personajes" ? item.img_url : item.imagen_url;
  const TabIcon = TAB_CONFIG[tab as Exclude<TabKey, "mundo">].Icon;
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleOculto || toggling) return;
    setToggling(true);
    const nuevoOculto = !item.oculto;
    try {
      await supabase.from("reinos").update({ oculto: nuevoOculto }).eq("id", item.id);
      onToggleOculto(item.id, nuevoOculto);
    } finally {
      setToggling(false);
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
        selected ? "bg-primary/15 border border-primary/30" : "hover:bg-primary/5 border border-transparent hover:border-primary/10"
      }`}
    >
      <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
        {img ? <img src={img} alt={item.nombre} className="w-full h-full object-cover" /> : <TabIcon size={16} className="text-primary/20" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold truncate ${selected ? "text-primary" : "text-primary/70 group-hover:text-primary/90"}`}>
          {item.nombre}
        </p>
        {tab === "personajes" && (item.especie || item.reino) && (
          <p className="text-[10px] text-primary/35 truncate">{[item.especie, item.reino].filter(Boolean).join(" · ")}</p>
        )}
        {tab === "criaturas" && item.habitat && <p className="text-[10px] text-primary/35 truncate">{item.habitat}</p>}
        {tab === "items" && item.categoria && <p className="text-[10px] text-primary/35 truncate">{item.categoria}</p>}
      </div>
      {tab === "reinos" && onToggleOculto && (
        <button
          onClick={handleToggle}
          title={item.oculto ? "Mostrar reino" : "Ocultar reino"}
          className={`shrink-0 p-1.5 rounded-lg transition-all border ${
            item.oculto
              ? "text-orange-400 bg-orange-400/10 border-orange-400/20 hover:bg-orange-400/20"
              : "text-primary/25 bg-transparent border-transparent hover:text-primary/60 hover:bg-primary/8 hover:border-primary/10"
          } ${toggling ? "opacity-40 pointer-events-none" : ""}`}
        >
          {toggling
            ? <Loader2 size={11} className="animate-spin" />
            : item.oculto ? <EyeOff size={11} /> : <Eye size={11} />
          }
        </button>
      )}
    </button>
  );
}

// ─── TabNav ───────────────────────────────────────────────────────────────────

export function TabNav({ tab, mundoSection, onTabChange, onMundoSectionChange }: {
  tab: TabKey;
  mundoSection: MundoSectionKey;
  onTabChange: (t: TabKey) => void;
  onMundoSectionChange: (s: MundoSectionKey) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1 p-1 bg-primary/5 rounded-xl border border-primary/10">
        {(Object.keys(TAB_CONFIG) as Exclude<TabKey, "mundo">[]).map(k => {
          const { Icon: TabIcon, label } = TAB_CONFIG[k];
          return (
            <button key={k} onClick={() => onTabChange(k)}
              title={label}
              className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${
                tab === k ? "bg-primary/15 text-primary border border-primary/20" : "text-primary/25 hover:text-primary/60"
              }`}
            >
              <TabIcon size={13} />
            </button>
          );
        })}
        <button
          onClick={() => onTabChange("mundo")}
          title="Mundo"
          className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${
            tab === "mundo" ? "bg-primary/15 text-primary border border-primary/20" : "text-primary/25 hover:text-primary/60"
          }`}
        >
          <Globe size={13} />
        </button>
      </div>

      {/* Subsecciones de Mundo — solo visibles cuando tab === "mundo" */}
      {tab === "mundo" && (
        <div className="flex flex-col gap-0.5 px-1">
          {MUNDO_SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => onMundoSectionChange(s.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-xs font-bold ${
                mundoSection === s.key
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-primary/40 hover:text-primary/70 hover:bg-primary/5 border border-transparent"
              }`}
            >
              <span className="text-sm">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}