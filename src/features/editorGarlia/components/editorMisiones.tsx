"use client";
import Image from "next/image";

import { AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Coins,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Scroll,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { supabase } from "@/lib/api/client/supabase";

// ── Tipos ────────────────────────────────────────────────────────────────────

type Dificultad = "facil" | "media" | "dificil" | "epica";
type EstadoUsuario = "en_curso" | "completada" | "reclamada";

interface MisionRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  dificultad: Dificultad;
  categoria: string | null;
  imagen_url: string | null;
  requisitos: string | null;
  recompensa_xp: number;
  recompensa_monedas: number;
  recompensa_item_nombre: string | null;
  recompensa_item_imagen_url: string | null;
  activa: boolean;
}

interface ProgresoRow {
  user_id: string;
  estado: EstadoUsuario;
  progreso: number;
  fecha_aceptada: string | null;
  fecha_completada: string | null;
  perfil?: { username: string; avatar_url: string | null } | null;
}

interface FormState {
  id: string | null;
  titulo: string;
  descripcion: string;
  dificultad: Dificultad;
  categoria: string;
  imagen_url: string;
  requisitos: string;
  recompensa_xp: string;
  recompensa_monedas: string;
  recompensa_item_nombre: string;
  recompensa_item_imagen_url: string;
  activa: boolean;
}

const FORM_VACIO: FormState = {
  id: null,
  titulo: "",
  descripcion: "",
  dificultad: "facil",
  categoria: "",
  imagen_url: "",
  requisitos: "",
  recompensa_xp: "50",
  recompensa_monedas: "0",
  recompensa_item_nombre: "",
  recompensa_item_imagen_url: "",
  activa: true,
};

const DIFICULTAD_LABEL: Record<Dificultad, string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
  epica: "Épica",
};

const DIFICULTADES: Dificultad[] = ["facil", "media", "dificil", "epica"];

const ESTADO_LABEL: Record<EstadoUsuario, string> = {
  en_curso: "En curso",
  completada: "Completada",
  reclamada: "Reclamada",
};

// ── Helpers Dexie (cache local, igual que editorRelaciones) ──────────────────

async function dexieGetOne<T>(tabla: string, id: string): Promise<T | null> {
  try {
    const { db } = await import("@/lib/api/client/db");
    if (!db) return null;
    return (await (db as any)[tabla]?.get(id)) ?? null;
  } catch {
    return null;
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function EditorMisiones() {
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);

  const [misiones, setMisiones] = useState<MisionRow[]>([]);
  const [misionSel, setMisionSel] = useState<MisionRow | null>(null);
  const [cargandoMisiones, setCargandoMisiones] = useState(false);

  const [progreso, setProgreso] = useState<ProgresoRow[]>([]);
  const [cargandoProgreso, setCargandoProgreso] = useState(false);
  const [actualizandoUserId, setActualizandoUserId] = useState<string | null>(
    null,
  );

  const [eliminando, setEliminando] = useState<string | null>(null);

  // Modal formulario crear/editar
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(
    null,
  );

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Verificar admin ───────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const cached = await dexieGetOne<any>("perfiles", user.id);
          if (cached?.rol === "admin") setEsAdmin(true);
        }
      } catch {}
      supabase.rpc("is_admin").then(({ data }) => setEsAdmin(!!data));
    };
    run();
  }, []);

  // ── Cargar catálogo de misiones ────────────────────────────────────────────
  const cargarMisiones = useCallback(async () => {
    setCargandoMisiones(true);
    const { data, error } = await supabase
      .from("misiones")
      .select(
        "id, titulo, descripcion, dificultad, categoria, imagen_url, requisitos, recompensa_xp, recompensa_monedas, recompensa_item_nombre, recompensa_item_imagen_url, activa",
      )
      .order("creado_en", { ascending: false });
    if (!error && data) setMisiones(data as MisionRow[]);
    setCargandoMisiones(false);
  }, []);

  useEffect(() => {
    if (esAdmin) cargarMisiones();
  }, [esAdmin, cargarMisiones]);

  // ── Cargar progreso de usuarios para la misión seleccionada ───────────────
  const cargarProgreso = useCallback(async () => {
    if (!misionSel) return;
    setCargandoProgreso(true);
    const { data, error } = await supabase
      .from("misiones_usuario")
      .select(
        "user_id, estado, progreso, fecha_aceptada, fecha_completada, perfil:user_id(username, avatar_url)",
      )
      .eq("mision_id", misionSel.id)
      .order("fecha_aceptada", { ascending: false });

    if (!error && data) {
      setProgreso(
        (data as any[]).map((r) => ({
          user_id: r.user_id,
          estado: r.estado,
          progreso: r.progreso,
          fecha_aceptada: r.fecha_aceptada,
          fecha_completada: r.fecha_completada,
          perfil: r.perfil ?? null,
        })),
      );
    }
    setCargandoProgreso(false);
  }, [misionSel]);

  useEffect(() => {
    cargarProgreso();
  }, [cargarProgreso]);

  // ── Marcar como completada / devolver a en curso ──────────────────────────
  const cambiarEstadoUsuario = async (
    row: ProgresoRow,
    nuevoEstado: "en_curso" | "completada",
  ) => {
    if (!misionSel) return;
    setActualizandoUserId(row.user_id);
    const { error } = await supabase
      .from("misiones_usuario")
      .update({
        estado: nuevoEstado,
        fecha_completada:
          nuevoEstado === "completada" ? new Date().toISOString() : null,
      })
      .eq("mision_id", misionSel.id)
      .eq("user_id", row.user_id);

    if (error) {
      showToast("Error al actualizar el estado", false);
    } else {
      setProgreso((prev) =>
        prev.map((p) =>
          p.user_id === row.user_id ? { ...p, estado: nuevoEstado } : p,
        ),
      );
      showToast(
        nuevoEstado === "completada"
          ? "Marcada como completada"
          : "Devuelta a en curso",
        true,
      );
    }
    setActualizandoUserId(null);
  };

  // ── Form: abrir para crear ─────────────────────────────────────────────────
  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setShowForm(true);
  };

  // ── Form: abrir para editar ────────────────────────────────────────────────
  const abrirEditar = (m: MisionRow) => {
    setForm({
      id: m.id,
      titulo: m.titulo,
      descripcion: m.descripcion ?? "",
      dificultad: m.dificultad,
      categoria: m.categoria ?? "",
      imagen_url: m.imagen_url ?? "",
      requisitos: m.requisitos ?? "",
      recompensa_xp: String(m.recompensa_xp ?? 0),
      recompensa_monedas: String(m.recompensa_monedas ?? 0),
      recompensa_item_nombre: m.recompensa_item_nombre ?? "",
      recompensa_item_imagen_url: m.recompensa_item_imagen_url ?? "",
      activa: m.activa,
    });
    setShowForm(true);
  };

  // ── Guardar (crear o editar) ───────────────────────────────────────────────
  const guardar = async () => {
    if (!form.titulo.trim()) {
      showToast("El título es obligatorio", false);
      return;
    }
    setGuardando(true);

    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      dificultad: form.dificultad,
      categoria: form.categoria.trim() || null,
      imagen_url: form.imagen_url.trim() || null,
      requisitos: form.requisitos.trim() || null,
      recompensa_xp: Number(form.recompensa_xp) || 0,
      recompensa_monedas: Number(form.recompensa_monedas) || 0,
      recompensa_item_nombre: form.recompensa_item_nombre.trim() || null,
      recompensa_item_imagen_url:
        form.recompensa_item_imagen_url.trim() || null,
      activa: form.activa,
    };

    const { error } = form.id
      ? await supabase.from("misiones").update(payload).eq("id", form.id)
      : await supabase.from("misiones").insert(payload);

    if (error) {
      showToast("Error al guardar la misión", false);
    } else {
      showToast(form.id ? "Misión actualizada" : "Misión creada", true);
      setShowForm(false);
      cargarMisiones();
    }
    setGuardando(false);
  };

  // ── Eliminar misión ─────────────────────────────────────────────────────────
  const eliminar = async (m: MisionRow) => {
    if (
      !confirm(
        `¿Eliminar la misión "${m.titulo}"? Esto también borra el progreso de los usuarios en ella.`,
      )
    )
      return;
    setEliminando(m.id);
    const { error } = await supabase.from("misiones").delete().eq("id", m.id);
    if (error) {
      showToast("Error al eliminar", false);
    } else {
      setMisiones((prev) => prev.filter((x) => x.id !== m.id));
      if (misionSel?.id === m.id) {
        setMisionSel(null);
        setProgreso([]);
      }
      showToast("Misión eliminada", true);
    }
    setEliminando(null);
  };

  // ── Guards de acceso ────────────────────────────────────────────────────────
  if (esAdmin === null)
    return (
      <div className="flex items-center justify-center min-h-60">
        <Loader2
          className="animate-spin"
          size={18}
          style={{
            color: "color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        />
      </div>
    );

  if (!esAdmin)
    return (
      <div className="flex flex-col items-center justify-center min-h-60 gap-3 text-center px-4">
        <div
          className="w-12 h-12 flex items-center justify-center rounded-full"
          style={{
            background: "color-mix(in srgb, var(--primary) 6%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
          }}
        >
          <AlertTriangle
            size={20}
            style={{
              color: "color-mix(in srgb, var(--primary) 50%, transparent)",
            }}
          />
        </div>
        <p
          className="font-serif italic"
          style={{
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
            fontSize: "0.9rem",
          }}
        >
          Acceso restringido a administradores
        </p>
      </div>
    );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full px-4 py-6">
      <div className="flex flex-col md:flex-row gap-6 w-full items-start">
        {/* ── Lista de misiones ── */}
        <div
          className="md:w-72 shrink-0 w-full"
          style={{
            background: "var(--white-custom)",
            border:
              "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            borderRadius: "var(--radius-card)",
            overflow: "hidden",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              borderBottom:
                "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            <p
              className="text-[8px] font-black uppercase tracking-[0.25em]"
              style={{
                color: "color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
            >
              Misiones ({misiones.length})
            </p>
            <button
              className="flex items-center gap-1 px-2 py-1 transition-all"
              style={{
                borderRadius: "var(--radius-btn)",
                background: "var(--primary)",
                color: "var(--btn-text)",
                fontSize: "8px",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
              onClick={abrirCrear}
            >
              <Plus size={9} /> Nueva
            </button>
          </div>

          <div className="p-2 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
            {cargandoMisiones ? (
              <div className="flex items-center justify-center py-8">
                <Loader2
                  className="animate-spin"
                  size={16}
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 30%, transparent)",
                  }}
                />
              </div>
            ) : misiones.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p
                  className="font-serif italic text-[11px]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 25%, transparent)",
                  }}
                >
                  Sin misiones todavía
                </p>
              </div>
            ) : (
              misiones.map((m) => (
                <div key={m.id} className="group flex items-center gap-1">
                  <button
                    className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 transition-all text-left"
                    style={{
                      borderRadius: "var(--radius-btn)",
                      border: "1px solid",
                      borderColor:
                        misionSel?.id === m.id
                          ? "color-mix(in srgb, var(--primary) 50%, transparent)"
                          : "color-mix(in srgb, var(--primary) 12%, transparent)",
                      background:
                        misionSel?.id === m.id
                          ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                          : "transparent",
                      opacity: m.activa ? 1 : 0.5,
                    }}
                    onClick={() => setMisionSel(m)}
                  >
                    <div
                      className="w-6 h-6 shrink-0 overflow-hidden flex items-center justify-center"
                      style={{
                        borderRadius: "2px",
                        background:
                          "color-mix(in srgb, var(--primary) 10%, transparent)",
                      }}
                    >
                      {m.imagen_url ? (
                        <Image
                          alt={m.titulo}
                          className="w-full h-full object-contain"
                          src={m.imagen_url}
                        />
                      ) : (
                        <Scroll
                          size={10}
                          style={{
                            color:
                              "color-mix(in srgb, var(--primary) 30%, transparent)",
                          }}
                        />
                      )}
                    </div>
                    <span
                      className="flex-1 min-w-0 truncate text-[10px] font-black uppercase tracking-tight capitalize"
                      style={{ color: "var(--primary)" }}
                    >
                      {m.titulo}
                    </span>
                    {!m.activa && (
                      <span
                        className="shrink-0 text-[7px] font-black uppercase tracking-wider px-1 py-0.5"
                        style={{
                          background:
                            "color-mix(in srgb, var(--primary) 8%, transparent)",
                          borderRadius: "2px",
                          color:
                            "color-mix(in srgb, var(--primary) 45%, transparent)",
                        }}
                      >
                        inactiva
                      </span>
                    )}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-all w-7 h-7 flex items-center justify-center shrink-0"
                    disabled={eliminando === m.id}
                    style={{
                      borderRadius: "var(--radius-btn)",
                      border:
                        "1px solid color-mix(in srgb, #ef4444 25%, transparent)",
                      background: "color-mix(in srgb, #ef4444 6%, transparent)",
                      color: "#ef4444",
                    }}
                    title="Eliminar misión"
                    onClick={() => eliminar(m)}
                  >
                    {eliminando === m.id ? (
                      <Loader2 className="animate-spin" size={10} />
                    ) : (
                      <Trash2 size={10} />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Panel de detalle + progreso de usuarios ── */}
        {!misionSel ? (
          <div className="flex-1 w-full flex items-center justify-center min-h-60">
            <p
              className="font-serif italic text-[12px]"
              style={{
                color: "color-mix(in srgb, var(--primary) 25%, transparent)",
              }}
            >
              Selecciona una misión para ver su progreso
            </p>
          </div>
        ) : (
          <div className="flex-1 w-full flex flex-col gap-4 min-w-0">
            {/* Resumen de la misión */}
            <div
              className="flex items-center gap-4 px-5 py-4"
              style={{
                background: "var(--white-custom)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <div
                className="w-14 h-14 shrink-0 overflow-hidden flex items-center justify-center"
                style={{
                  borderRadius: "var(--radius-btn)",
                  background:
                    "color-mix(in srgb, var(--primary) 6%, transparent)",
                }}
              >
                {misionSel.imagen_url ? (
                  <Image
                    alt={misionSel.titulo}
                    className="w-full h-full object-cover"
                    src={misionSel.imagen_url}
                  />
                ) : (
                  <Scroll
                    size={20}
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 25%, transparent)",
                    }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="font-serif italic text-[16px] capitalize truncate"
                  style={{ color: "var(--primary)" }}
                >
                  {misionSel.titulo}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className="text-[8px] font-black uppercase tracking-wider"
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 40%, transparent)",
                    }}
                  >
                    {DIFICULTAD_LABEL[misionSel.dificultad]}
                  </span>
                  <span
                    className="flex items-center gap-1 text-[8px] font-black tabular-nums"
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 40%, transparent)",
                    }}
                  >
                    <Sparkles size={9} /> {misionSel.recompensa_xp} XP
                  </span>
                  {!!misionSel.recompensa_monedas && (
                    <span
                      className="flex items-center gap-1 text-[8px] font-black tabular-nums"
                      style={{
                        color:
                          "color-mix(in srgb, var(--primary) 40%, transparent)",
                      }}
                    >
                      <Coins size={9} /> {misionSel.recompensa_monedas}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="px-3 py-2 shrink-0 transition-all"
                style={{
                  borderRadius: "var(--radius-btn)",
                  border:
                    "1px solid color-mix(in srgb, var(--primary) 16%, transparent)",
                  color: "var(--primary)",
                  fontSize: "9px",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
                onClick={() => abrirEditar(misionSel)}
              >
                Editar
              </button>
            </div>

            {/* Tabla de progreso de usuarios */}
            <div
              style={{
                background: "var(--white-custom)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                borderRadius: "var(--radius-card)",
                overflow: "hidden",
              }}
            >
              <div
                className="px-4 py-3"
                style={{
                  borderBottom:
                    "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <p
                  className="text-[8px] font-black uppercase tracking-[0.25em]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 35%, transparent)",
                  }}
                >
                  Usuarios con esta misión ({progreso.length})
                </p>
              </div>

              {cargandoProgreso ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    className="animate-spin"
                    size={16}
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 30%, transparent)",
                    }}
                  />
                </div>
              ) : progreso.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p
                    className="font-serif italic text-[11px]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 25%, transparent)",
                    }}
                  >
                    Nadie ha aceptado esta misión aún
                  </p>
                </div>
              ) : (
                progreso.map((row) => (
                  <div
                    key={row.user_id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      borderBottom:
                        "1px solid color-mix(in srgb, var(--primary) 6%, transparent)",
                    }}
                  >
                    <div
                      className="w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center"
                      style={{
                        borderRadius: "2px",
                        background:
                          "color-mix(in srgb, var(--primary) 10%, transparent)",
                      }}
                    >
                      {row.perfil?.avatar_url ? (
                        <Image
                          alt={row.perfil.username}
                          className="w-full h-full object-contain"
                          src={row.perfil.avatar_url}
                        />
                      ) : (
                        <User
                          size={12}
                          style={{
                            color:
                              "color-mix(in srgb, var(--primary) 30%, transparent)",
                          }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[11px] font-black uppercase tracking-tight capitalize truncate"
                        style={{ color: "var(--primary)" }}
                      >
                        {row.perfil?.username ?? "Usuario"}
                      </p>
                      <span
                        className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider mt-0.5"
                        style={{
                          color:
                            row.estado === "reclamada"
                              ? "color-mix(in srgb, var(--primary) 35%, transparent)"
                              : row.estado === "completada"
                                ? "#16a34a"
                                : "color-mix(in srgb, var(--primary) 45%, transparent)",
                        }}
                      >
                        {row.estado === "en_curso" && <Clock size={9} />}
                        {row.estado === "completada" && (
                          <CheckCircle2 size={9} />
                        )}
                        {row.estado === "reclamada" && <Lock size={9} />}
                        {ESTADO_LABEL[row.estado]}
                      </span>
                    </div>

                    {/* Acción según estado */}
                    {row.estado === "en_curso" && (
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 transition-all shrink-0"
                        disabled={actualizandoUserId === row.user_id}
                        style={{
                          borderRadius: "var(--radius-btn)",
                          background: "var(--primary)",
                          color: "var(--btn-text)",
                          fontSize: "8px",
                          fontWeight: 900,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                        onClick={() =>
                          cambiarEstadoUsuario(row, "completada")
                        }
                      >
                        {actualizandoUserId === row.user_id ? (
                          <Loader2 className="animate-spin" size={10} />
                        ) : (
                          <CheckCircle2 size={10} />
                        )}
                        Marcar completada
                      </button>
                    )}

                    {row.estado === "completada" && (
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 transition-all shrink-0"
                        disabled={actualizandoUserId === row.user_id}
                        style={{
                          borderRadius: "var(--radius-btn)",
                          border:
                            "1px solid color-mix(in srgb, var(--primary) 16%, transparent)",
                          color: "var(--primary)",
                          fontSize: "8px",
                          fontWeight: 900,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                        title="Devolver a en curso"
                        onClick={() => cambiarEstadoUsuario(row, "en_curso")}
                      >
                        {actualizandoUserId === row.user_id ? (
                          <Loader2 className="animate-spin" size={10} />
                        ) : (
                          <RotateCcw size={10} />
                        )}
                        Deshacer
                      </button>
                    )}

                    {row.estado === "reclamada" && (
                      <span
                        className="text-[8px] font-black uppercase tracking-wider px-2 py-1 shrink-0"
                        style={{
                          background:
                            "color-mix(in srgb, var(--primary) 6%, transparent)",
                          borderRadius: "2px",
                          color:
                            "color-mix(in srgb, var(--primary) 35%, transparent)",
                        }}
                      >
                        Recompensa entregada
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal crear/editar misión ── */}
      <AnimatePresence>
        {showForm && (
          <>
            <MotionDiv
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 backdrop-blur-sm"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => setShowForm(false)}
            />
            <MotionDiv
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[30rem]"
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                boxShadow:
                  "0 20px 60px color-mix(in srgb, var(--primary) 16%, transparent)",
                maxHeight: "86dvh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{
                  borderBottom:
                    "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <p
                  className="font-serif italic"
                  style={{ fontSize: "1rem", color: "var(--primary)" }}
                >
                  {form.id ? "Editar misión" : "Nueva misión"}
                </p>
                <button
                  className="w-7 h-7 flex items-center justify-center transition-opacity hover:opacity-60"
                  style={{ color: "var(--primary)" }}
                  onClick={() => setShowForm(false)}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Form body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
                <Campo label="Título">
                  <input
                    className="campo-input"
                    placeholder="Ej. Derrota al Centinela de Piedra"
                    style={inputStyle}
                    value={form.titulo}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, titulo: e.target.value }))
                    }
                  />
                </Campo>

                <Campo label="Descripción">
                  <textarea
                    className="campo-input"
                    placeholder="¿En qué consiste la misión?"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, descripcion: e.target.value }))
                    }
                  />
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Dificultad">
                    <select
                      className="campo-input"
                      style={inputStyle}
                      value={form.dificultad}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          dificultad: e.target.value as Dificultad,
                        }))
                      }
                    >
                      {DIFICULTADES.map((d) => (
                        <option key={d} value={d}>
                          {DIFICULTAD_LABEL[d]}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo label="Categoría">
                    <input
                      className="campo-input"
                      placeholder="Ej. combate"
                      style={inputStyle}
                      value={form.categoria}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, categoria: e.target.value }))
                      }
                    />
                  </Campo>
                </div>

                <Campo label="URL de imagen">
                  <input
                    className="campo-input"
                    placeholder="https://…"
                    style={inputStyle}
                    value={form.imagen_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imagen_url: e.target.value }))
                    }
                  />
                </Campo>

                <Campo label="Requisitos (opcional)">
                  <input
                    className="campo-input"
                    placeholder="Ej. Nivel 5+"
                    style={inputStyle}
                    value={form.requisitos}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, requisitos: e.target.value }))
                    }
                  />
                </Campo>

                <div
                  className="flex items-center gap-2 mt-1 mb-1"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 28%, transparent)",
                  }}
                >
                  <Award size={11} />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Recompensa
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 8%, transparent)",
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Campo label="XP">
                    <input
                      className="campo-input"
                      min={0}
                      style={inputStyle}
                      type="number"
                      value={form.recompensa_xp}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          recompensa_xp: e.target.value,
                        }))
                      }
                    />
                  </Campo>
                  <Campo label="Monedas">
                    <input
                      className="campo-input"
                      min={0}
                      style={inputStyle}
                      type="number"
                      value={form.recompensa_monedas}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          recompensa_monedas: e.target.value,
                        }))
                      }
                    />
                  </Campo>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Nombre del item (opcional)">
                    <input
                      className="campo-input"
                      placeholder="Ej. Espada del alba"
                      style={inputStyle}
                      value={form.recompensa_item_nombre}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          recompensa_item_nombre: e.target.value,
                        }))
                      }
                    />
                  </Campo>
                  <Campo label="Imagen del item (opcional)">
                    <input
                      className="campo-input"
                      placeholder="https://…"
                      style={inputStyle}
                      value={form.recompensa_item_imagen_url}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          recompensa_item_imagen_url: e.target.value,
                        }))
                      }
                    />
                  </Campo>
                </div>

                <button
                  className="flex items-center gap-2 mt-1"
                  onClick={() =>
                    setForm((f) => ({ ...f, activa: !f.activa }))
                  }
                >
                  <div
                    className="w-4 h-4 flex items-center justify-center shrink-0"
                    style={{
                      borderRadius: "3px",
                      border: `1px solid ${
                        form.activa
                          ? "var(--primary)"
                          : "color-mix(in srgb, var(--primary) 25%, transparent)"
                      }`,
                      background: form.activa
                        ? "var(--primary)"
                        : "transparent",
                    }}
                  >
                    {form.activa && (
                      <svg fill="none" height="7" viewBox="0 0 7 7" width="7">
                        <path
                          d="M1 3.5L3 5.5L6 1.5"
                          stroke="white"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.2"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-[9px] font-black uppercase tracking-wider"
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 45%, transparent)",
                    }}
                  >
                    Visible en el tablón
                  </span>
                </button>
              </div>

              {/* Footer */}
              <div
                className="px-4 py-3 shrink-0 flex items-center justify-end gap-2"
                style={{
                  borderTop:
                    "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <button
                  className="px-4 py-2 transition-all"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex items-center gap-1.5 px-4 py-2 transition-all"
                  disabled={guardando}
                  style={{
                    borderRadius: "var(--radius-btn)",
                    background: "var(--primary)",
                    color: "var(--btn-text)",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                  onClick={guardar}
                >
                  {guardando ? (
                    <Loader2 className="animate-spin" size={10} />
                  ) : (
                    <Plus size={10} />
                  )}
                  {form.id ? "Guardar cambios" : "Crear misión"}
                </button>
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <MotionDiv
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 flex items-center gap-2"
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: 8 }}
            style={{
              borderRadius: "var(--radius-btn)",
              background: toast.ok
                ? "color-mix(in srgb, #16a34a 12%, var(--white-custom))"
                : "color-mix(in srgb, #ef4444 10%, var(--white-custom))",
              border: `1px solid ${
                toast.ok
                  ? "color-mix(in srgb, #16a34a 30%, transparent)"
                  : "color-mix(in srgb, #ef4444 25%, transparent)"
              }`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              whiteSpace: "nowrap",
            }}
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: toast.ok ? "#16a34a" : "#ef4444" }}
            >
              {toast.ok ? (
                <svg fill="none" height="8" viewBox="0 0 8 8" width="8">
                  <path
                    d="M1.5 4L3 5.5L6.5 2"
                    stroke="white"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.2"
                  />
                </svg>
              ) : (
                <X color="white" size={7} />
              )}
            </div>
            <span
              className="text-[10px] font-black uppercase tracking-tight"
              style={{ color: toast.ok ? "#16a34a" : "#ef4444" }}
            >
              {toast.msg}
            </span>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Helpers de presentación del formulario ──────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "color-mix(in srgb, var(--primary) 4%, transparent)",
  border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
  borderRadius: "var(--radius-btn)",
  padding: "8px 10px",
  fontSize: "12px",
  color: "var(--primary)",
  outline: "none",
};

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[8px] font-black uppercase tracking-wider"
        style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
