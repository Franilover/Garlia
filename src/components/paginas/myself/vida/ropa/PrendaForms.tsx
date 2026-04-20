"use client";
import React, { useState } from "react";
import { Save, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { ChipGroup } from "@/components/ui/Chip";

export type Categoria = "Superior" | "Inferior" | "Calzado" | "Accesorios" | "Outfit";
export type Temporada = "Primavera" | "Verano" | "Otoño" | "Invierno";
export type Vibra     = "Casual" | "Formal" | "Sport" | "Noche" | "Aesthetic";
export type Color     = "Negro" | "Blanco" | "Gris" | "Rosa" | "Rojo" | "Azul" | "Verde" | "Beige" | "Marrón" | "Lila";

export interface FormData {
  nombre:     string;
  categoria:  Categoria;
  imagen_url: string;
  temporadas: Temporada[];
  vibras:     Vibra[];
  colores:    Color[];
}

export const CATEGORIAS: Categoria[] = ["Superior", "Inferior", "Calzado", "Accesorios", "Outfit"];
export const TEMPORADAS: Temporada[] = ["Primavera", "Verano", "Otoño", "Invierno"];
export const VIBRAS: Vibra[]         = ["Casual", "Formal", "Sport", "Noche", "Aesthetic"];
export const COLORES: Color[]        = ["Negro", "Blanco", "Gris", "Rosa", "Rojo", "Azul", "Verde", "Beige", "Marrón", "Lila"];

export const COLOR_DOT: Record<Color, string> = {
  Negro: "#1a1a1a", Blanco: "#f5f5f5", Gris: "#9ca3af", Rosa: "#f9a8d4",
  Rojo: "#ef4444",  Azul: "#3b82f6",  Verde: "#22c55e", Beige: "#d4b896",
  Marrón: "#92400e", Lila: "#c084fc",
};

export const EMPTY_FORM: FormData = {
  nombre: "", categoria: "Superior", imagen_url: "",
  temporadas: [], vibras: [], colores: [],
};

export function toggleArr<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

interface PrendaFormProps {
  initial: FormData;
  onSave:  (data: FormData) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
  title:   string;
  icon:    React.ReactNode;
}

export function PrendaForm({ initial, onSave, onClose, saving, title, icon }: PrendaFormProps) {
  const [form, setForm]         = useState<FormData>(initial);
  const [showPicker, setShowPicker] = useState(false);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <div className="flex items-center justify-between p-5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">{title}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 text-muted-on-surface hover:text-on-surface transition-colors" style={{ borderRadius: "9999px" }}>
          <X size={16} />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "80vh" }}>
        {}
        {!showPicker ? (
          <button
            onClick={() => setShowPicker(true)}
            className={cn(
              "relative w-full aspect-video border-2 border-dashed transition-all overflow-hidden group",
              form.imagen_url ? "border-primary/20" : "border-primary/10 hover:border-primary/30"
            )}
            style={{ borderRadius: "var(--radius-card)" }}
          >
            {form.imagen_url ? (
              <>
                <img src={form.imagen_url} className="w-full h-full object-cover" alt="preview" />
                <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <ImageIcon size={16} className="text-white" />
                  <span className="text-[10px] font-black uppercase text-white tracking-widest">Cambiar foto</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-primary/5">
                <ImageIcon size={28} className="text-primary/20" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-on-surface">Elegir foto</span>
              </div>
            )}
          </button>
        ) : (
          <div className="border border-primary/10 overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-on-surface">Selecciona una foto</p>
              <button onClick={() => setShowPicker(false)} className="text-muted-on-surface hover:text-on-surface"><X size={14} /></button>
            </div>
            <div className="px-4 pb-4">
              <SimpleImagePicker
                onSelect={(url) => { set("imagen_url", url); setShowPicker(false); }}
                onClose={() => setShowPicker(false)}
              />
            </div>
          </div>
        )}

        {!showPicker && (
          <>
            {}
            <input
              type="text"
              placeholder="NOMBRE..."
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value.toUpperCase())}
              className="input-brand text-[10px] font-black"
            />

            {}
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface mb-2">Categoría</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIAS.map((cat) => (
                  <button key={cat} onClick={() => set("categoria", cat)}
                    className={cn(
                      "px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all border",
                      form.categoria === cat
                        ? "bg-primary text-btn-text border-primary"
                        : "bg-primary/5 text-muted-on-surface border-primary/10 hover:border-primary/30"
                    )}
                    style={{ borderRadius: "var(--radius-btn)" }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {}
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface mb-2">Temporada</p>
              <ChipGroup options={TEMPORADAS} selected={form.temporadas} onToggle={(v) => set("temporadas", toggleArr(form.temporadas, v))} />
            </div>

            {}
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface mb-2">Vibra</p>
              <ChipGroup options={VIBRAS} selected={form.vibras} onToggle={(v) => set("vibras", toggleArr(form.vibras, v))} />
            </div>

            {}
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface mb-2">Colores</p>
              <ChipGroup options={COLORES} selected={form.colores} onToggle={(v) => set("colores", toggleArr(form.colores, v))} colorDot={COLOR_DOT} />
            </div>

            <button
              onClick={() => onSave(form)}
              disabled={!form.nombre || !form.imagen_url || saving}
              className="btn-brand w-full text-[10px] uppercase tracking-widest"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Guardar
            </button>
          </>
        )}
      </div>
    </>
  );
}