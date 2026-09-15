"use client";
import { Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Btn } from "@/ui/Buttons";
import { Input, Textarea } from "@/ui/Inputs";
import { Modal } from "@/ui/Layout";

import { teoriasQueries } from "./queries";
import type { TeoriaInput } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Se llama después de guardar con éxito, para refrescar el listado. */
  onSaved: () => void;
}

const FORM_VACIO: TeoriaInput = { titulo: "", contenido: "" };

/**
 * Formulario público para publicar una teoría en Universo > Teorías:
 * solo título + texto libre. Cualquier usuario logueado puede publicar
 * (ver sql/teorias.sql) — a diferencia de Descubrimientos, esto no es un
 * panel de admin.
 */
export function ModalPublicarTeoria({ open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<TeoriaInput>(FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(FORM_VACIO);
  }, [open]);

  const puedeGuardar =
    form.titulo.trim().length > 0 && form.contenido.trim().length > 0;

  const handleGuardar = async () => {
    if (!puedeGuardar || saving) return;
    setSaving(true);
    setError(null);
    try {
      await teoriasQueries.crear(form);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      maxWidth="max-w-2xl"
      open={open}
      subtitle="Universo › Teorías"
      title="Publicar teoría"
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Input
              label="Título"
              placeholder="Cómo se va a mostrar en el Universo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
          </div>
          <Btn
            className="w-full sm:w-auto shrink-0"
            disabled={!puedeGuardar}
            icon={<Sparkles size={14} />}
            loading={saving}
            onClick={handleGuardar}
          >
            Publicar
          </Btn>
        </div>

        <Textarea
          label="Teoría"
          placeholder="Desarrolla tu teoría acá…"
          rows={5}
          value={form.contenido}
          onChange={(e) =>
            setForm((f) => ({ ...f, contenido: e.target.value }))
          }
        />

        {error && <p className="text-micro font-bold text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}
