"use client";

import React, { useState, useEffect } from "react";
import { Package } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Item, type SaveStatus } from "./types";
import { useUniqueValues } from "./hooks";
import { Campo, CampoArea, BarraAcciones, SelectorImagen, SelectorTexto } from "./UIComponents";

export function EditorItem({ item, onSaved, onDeleted }: {
  item: Item; onSaved: (i: Item) => void; onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Item>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const categorias = useUniqueValues("items", "categoria");

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const field = (k: keyof Item) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("items").update({
        nombre: form.nombre, imagen_url: form.imagen_url || null,
        descripcion: form.descripcion, categoria: form.categoria,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("items").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <ConfirmModal />
      <div className="shrink-0 p-5 pb-3 flex items-start gap-4">
        <div className="shrink-0" style={{ width: 88 }}>
          <SelectorImagen label="Imagen" value={form.imagen_url ?? ""}
            onChange={url => setForm(f => ({ ...f, imagen_url: url }))} aspect="square"
            placeholder={<Package size={20} className="opacity-20" />} />
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3 pt-0.5">
          <Campo label="Nombre" value={form.nombre ?? ""} onChange={field("nombre")} placeholder="Nombre del objeto" />
          <SelectorTexto label="Categoría" value={form.categoria ?? ""}
            onChange={v => setForm(f => ({ ...f, categoria: v }))} opciones={categorias} placeholder="Arma, reliquia, objeto…" />
        </div>
      </div>
      <div className="p-5 pt-2 space-y-5">
        <CampoArea label="Descripción" value={form.descripcion ?? ""} onChange={field("descripcion")} rows={6} placeholder="Qué es, qué hace, su historia…" />
      </div>
      <BarraAcciones status={status} onSave={save} onDelete={del} />
    </div>
  );
}
