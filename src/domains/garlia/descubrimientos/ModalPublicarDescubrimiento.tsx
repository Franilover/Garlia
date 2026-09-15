"use client";
import { Sparkles } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { Btn } from "@/ui/Buttons";
import { ComboSelector } from "@/ui/ComboSelector";
import { Input, Textarea } from "@/ui/Inputs";
import { Modal } from "@/ui/Layout";
import { useCiudades } from "@garlia/ciudades";
import { useReinosMin } from "@garlia/reinos";

import { descubrimientosQueries } from "./queries";
import {
  LABEL_POR_TIPO,
  TODOS_LOS_TIPOS,
  type DescubrimientoInput,
  type EntidadMin,
  type TipoEntidadPublicable,
} from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Se llama después de guardar con éxito, para refrescar el listado. */
  onSaved: () => void;
  /** Si viene, el modal edita esta publicación en vez de crear una nueva. */
  editando?: {
    id: string;
    tipo_entidad: TipoEntidadPublicable;
    entidad_id: string;
    titulo: string;
    descripcion: string;
    fecha: string | null;
    reino_id: string | null;
    ciudad_id: string | null;
  } | null;
}

const FORM_VACIO: DescubrimientoInput = {
  tipo_entidad: "criatura",
  entidad_id: "",
  titulo: "",
  descripcion: "",
  fecha: null,
  reino_id: null,
  ciudad_id: null,
};

/**
 * Formulario admin para publicar (o editar) un descubrimiento en
 * Universo > Descubrimientos: título, descripción, tipo de entidad,
 * cuál entidad puntual, fecha y reino/ciudad opcionales.
 *
 * Guarda directamente contra `descubrimientos_publicos` — no toca la
 * entidad original (criatura/elemento/etc), solo crea/edita la fila
 * puente que la hace visible en el Universo público.
 */
export function ModalPublicarDescubrimiento({
  open,
  onClose,
  onSaved,
  editando,
}: Props) {
  const [form, setForm] = useState<DescubrimientoInput>(FORM_VACIO);
  const [entidades, setEntidades] = useState<EntidadMin[]>([]);
  const [loadingEntidades, setLoadingEntidades] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reinosMin = useReinosMin();
  const ciudades = useCiudades();
  const ciudadesFiltradas = useMemo(
    () =>
      form.reino_id
        ? ciudades.filter((c) => c.reino_id === form.reino_id)
        : ciudades,
    [ciudades, form.reino_id],
  );

  // ── Cargar el form al abrir (nuevo o edición) ────────────────────────────
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editando) {
      setForm({
        tipo_entidad: editando.tipo_entidad,
        entidad_id: editando.entidad_id,
        titulo: editando.titulo,
        descripcion: editando.descripcion,
        fecha: editando.fecha,
        reino_id: editando.reino_id,
        ciudad_id: editando.ciudad_id,
      });
    } else {
      setForm(FORM_VACIO);
    }
  }, [open, editando]);

  // ── Cargar entidades del tipo elegido (para el selector "cuál") ─────────
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoadingEntidades(true);
    descubrimientosQueries
      .listEntidadesDeTipo(form.tipo_entidad)
      .then((data) => {
        if (mounted) setEntidades(data);
      })
      .catch(() => {
        if (mounted) setEntidades([]);
      })
      .finally(() => {
        if (mounted) setLoadingEntidades(false);
      });
    return () => {
      mounted = false;
    };
  }, [open, form.tipo_entidad]);

  // Si cambia de reino y la ciudad elegida no pertenece más, se limpia.
  useEffect(() => {
    if (!form.ciudad_id) return;
    if (!ciudadesFiltradas.some((c) => c.id === form.ciudad_id)) {
      setForm((f) => ({ ...f, ciudad_id: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.reino_id]);

  const puedeGuardar = form.entidad_id && form.titulo.trim().length > 0;

  const handleGuardar = async () => {
    if (!puedeGuardar || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editando) {
        await descubrimientosQueries.actualizar(editando.id, form);
      } else {
        await descubrimientosQueries.crear(form);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(
        e?.message?.includes("duplicate")
          ? "Esa entidad ya está publicada."
          : e?.message ?? "No se pudo guardar.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      maxWidth="max-w-3xl"
      open={open}
      subtitle="Universo › Descubrimientos"
      title={editando ? "Editar descubrimiento" : "Publicar descubrimiento"}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Nombre / Título"
          placeholder="Cómo se va a mostrar en el Universo"
          value={form.titulo}
          onChange={(e) =>
            setForm((f) => ({ ...f, titulo: e.target.value }))
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <ComboSelector
            allowNone={false}
            items={TODOS_LOS_TIPOS.map((t) => ({
              id: t,
              label: LABEL_POR_TIPO[t],
            }))}
            label="Tipo"
            mode="single"
            value={form.tipo_entidad}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                tipo_entidad: (v as TipoEntidadPublicable) ?? f.tipo_entidad,
                entidad_id: "",
              }))
            }
          />

          <ComboSelector
            allowNone={false}
            items={entidades.map((e) => ({ id: e.id, label: e.nombre }))}
            label={LABEL_POR_TIPO[form.tipo_entidad]}
            loading={loadingEntidades}
            mode="single"
            placeholder="Elegir cuál…"
            value={form.entidad_id || null}
            onChange={(v) => setForm((f) => ({ ...f, entidad_id: v ?? "" }))}
          />
        </div>

        <div className="sm:col-span-2">
          <Textarea
            label="Descripción"
            placeholder="Opcional — si se deja vacío, se usa la descripción de la entidad original"
            rows={3}
            value={form.descripcion}
            onChange={(e) =>
              setForm((f) => ({ ...f, descripcion: e.target.value }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-micro font-black text-primary/40 uppercase tracking-widest block">
            Fecha
          </label>
          <input
            className="input-brand"
            type="date"
            value={form.fecha ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, fecha: e.target.value || null }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ComboSelector
            allowNone
            items={reinosMin.map((r) => ({ id: r.id, label: r.nombre }))}
            label="Reino"
            mode="single"
            noneLabel="Sin reino"
            placeholder="Opcional"
            value={form.reino_id}
            onChange={(v) => setForm((f) => ({ ...f, reino_id: v }))}
          />

          <ComboSelector
            allowNone
            items={ciudadesFiltradas.map((c) => ({ id: c.id, label: c.nombre }))}
            label="Ciudad"
            mode="single"
            noneLabel="Sin ciudad"
            placeholder="Opcional"
            value={form.ciudad_id}
            onChange={(v) => setForm((f) => ({ ...f, ciudad_id: v }))}
          />
        </div>

        {error && (
          <p className="sm:col-span-2 text-micro font-bold text-red-500">
            {error}
          </p>
        )}

        <Btn
          className="sm:col-span-2 mt-1"
          disabled={!puedeGuardar}
          icon={<Sparkles size={14} />}
          loading={saving}
          onClick={handleGuardar}
        >
          {editando ? "Guardar cambios" : "Publicar"}
        </Btn>
      </div>
    </Modal>
  );
}
