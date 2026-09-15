"use client";
import { BookPlus, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Btn } from "@/ui/Buttons";
import { Input, Textarea } from "@/ui/Inputs";
import { Modal } from "@/ui/Layout";

import { librosConocimientoQueries } from "./queries";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Se llama después de guardar con éxito, para refrescar el listado. */
  onSaved: () => void;
}

/**
 * Formulario admin para crear un libro de conocimiento: título + páginas
 * escritas una por una, en el orden en que se van a leer. El autor
 * agrega tantas páginas como quiera con "+ Página" y puede borrar
 * cualquiera antes de guardar. Se guardan solo las páginas con contenido.
 */
export function ModalAnadirLibro({ open, onClose, onSaved }: Props) {
  const [titulo, setTitulo] = useState("");
  const [paginas, setPaginas] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitulo("");
    setPaginas(["", ""]);
  }, [open]);

  const paginasConContenido = paginas.filter((p) => p.trim().length > 0);
  const puedeGuardar =
    titulo.trim().length > 0 && paginasConContenido.length > 0;

  const actualizarPagina = (i: number, valor: string) => {
    setPaginas((ps) => ps.map((p, idx) => (idx === i ? valor : p)));
  };

  const agregarPagina = () => setPaginas((ps) => [...ps, ""]);

  const quitarPagina = (i: number) =>
    setPaginas((ps) => (ps.length <= 1 ? ps : ps.filter((_, idx) => idx !== i)));

  const handleGuardar = async () => {
    if (!puedeGuardar || saving) return;
    setSaving(true);
    setError(null);
    try {
      await librosConocimientoQueries.crear({
        titulo: titulo.trim(),
        paginas,
      });
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
      subtitle="Universo › Libros"
      title="Añadir libro"
      onClose={onClose}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Input
          label="Título del libro"
          placeholder="Cómo se va a mostrar en el Universo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <div className="space-y-3">
          {paginas.map((contenido, i) => (
            <div key={i} className="relative">
              <Textarea
                label={`Página ${i + 1}`}
                placeholder="Contenido de esta página…"
                rows={4}
                value={contenido}
                onChange={(e) => actualizarPagina(i, e.target.value)}
              />
              {paginas.length > 1 && (
                <button
                  aria-label={`Quitar página ${i + 1}`}
                  className="absolute top-0 right-0 flex items-center justify-center w-6 h-6 rounded-[var(--radius-btn)]"
                  style={{
                    background: "var(--white-custom)",
                    color: "#ef4444",
                    border: "var(--border-width) solid rgba(239,68,68,0.2)",
                  }}
                  title="Quitar página"
                  type="button"
                  onClick={() => quitarPagina(i)}
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
        </div>

        <Btn
          icon={<Plus size={14} />}
          type="button"
          variant="outline"
          onClick={agregarPagina}
        >
          Página
        </Btn>

        {error && <p className="text-micro font-bold text-red-500">{error}</p>}

        <div className="flex justify-end pt-2">
          <Btn
            disabled={!puedeGuardar}
            icon={<BookPlus size={14} />}
            loading={saving}
            onClick={handleGuardar}
          >
            Guardar libro
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
