"use client";

import { AnimatePresence } from "framer-motion";
import {
  Award,
  CheckCircle2,
  Clock,
  Loader2,
  Scroll,
  Sparkles,
  Star,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { supabase } from "@/lib/api/client/supabase";
import { invalidateSessionCache } from "@/lib/api/client/syncEngine";

import {
  BarraProgreso,
  EmptyMisiones,
  ModalMision,
  PastillaDificultad,
  type Dificultad,
  type MisionConProgreso,
} from "../components/MisionesComponents";

// ─── Tipos locales de carga ─────────────────────────────────────────────────

interface PerfilMisiones {
  username: string;
  avatar_url?: string;
  nivel?: number;
  xp_total?: number;
  monedas?: number;
}

interface MisionesProps {
  datos?: {
    username?: string;
    avatar_url?: string;
  };
}

type TabId = "tablon" | "en_curso" | "completadas";

// ─── Componente principal ──────────────────────────────────────────────────

export default function Misiones({ datos: datosProp }: MisionesProps) {
  const [tab, setTab] = useState<TabId>("tablon");
  const [misionModal, setMisionModal] = useState<MisionConProgreso | null>(
    null,
  );

  const [perfil, setPerfil] = useState<PerfilMisiones | null>(null);
  const [misiones, setMisiones] = useState<MisionConProgreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aceptandoId, setAceptandoId] = useState<string | null>(null);
  const [reclamandoId, setReclamandoId] = useState<string | null>(null);

  const userIdRef = React.useRef<string | null>(null);

  // ── Carga inicial ─────────────────────────────────────────────────────
  useEffect(() => {
    async function cargarTodo() {
      setCargando(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          console.warn("[Misiones] Sin sesión activa:", userError?.message);
          setCargando(false);
          return;
        }
        userIdRef.current = user.id;

        const [
          { data: perfilData },
          { data: misionesData },
          { data: progresoData },
        ] = await Promise.all([
          supabase
            .from("perfiles")
            .select("username, avatar_url, nivel, xp_total, monedas")
            .eq("id", user.id)
            .single(),
          // Catálogo completo de misiones disponibles (tablón).
          supabase
            .from("misiones")
            .select(
              "id, titulo, descripcion, dificultad, categoria, imagen_url, requisitos, vence_en, recompensa_xp, recompensa_monedas, recompensa_item_nombre, recompensa_item_imagen_url",
            )
            .order("dificultad", { ascending: true }),
          // Progreso del usuario en cada misión (si existe).
          supabase
            .from("misiones_usuario")
            .select(
              "mision_id, estado, progreso, fecha_aceptada, fecha_completada",
            )
            .eq("user_id", user.id),
        ]);

        setPerfil(
          perfilData
            ? {
                username:
                  perfilData.username ?? datosProp?.username ?? "Aventurero",
                avatar_url: perfilData.avatar_url ?? datosProp?.avatar_url,
                nivel: perfilData.nivel ?? 1,
                xp_total: perfilData.xp_total ?? 0,
                monedas: perfilData.monedas ?? 0,
              }
            : {
                username: datosProp?.username ?? "Aventurero",
                avatar_url: datosProp?.avatar_url,
                nivel: 1,
                xp_total: 0,
                monedas: 0,
              },
        );

        const progresoPorMision = new Map(
          (progresoData ?? []).map((p: any) => [p.mision_id, p]),
        );

        const misionesCombinadas: MisionConProgreso[] = (
          misionesData ?? []
        ).map((m: any) => {
          const prog = progresoPorMision.get(m.id);
          return {
            id: m.id,
            titulo: m.titulo,
            descripcion: m.descripcion,
            dificultad: (m.dificultad as Dificultad) ?? "facil",
            categoria: m.categoria,
            imagen_url: m.imagen_url,
            requisitos: m.requisitos,
            vence_en: m.vence_en,
            recompensa: {
              xp: m.recompensa_xp ?? 0,
              monedas: m.recompensa_monedas ?? undefined,
              item_nombre: m.recompensa_item_nombre ?? undefined,
              item_imagen_url: m.recompensa_item_imagen_url ?? undefined,
            },
            user_estado: prog?.estado ?? null,
            progreso: prog?.progreso ?? 0,
          };
        });

        setMisiones(misionesCombinadas);
      } catch (err) {
        console.error("[Misiones] Error inesperado:", err);
      } finally {
        setCargando(false);
      }
    }

    cargarTodo();
  }, []);

  // ── Aceptar misión ────────────────────────────────────────────────────
  const handleAceptarMision = async (mision: MisionConProgreso) => {
    const userId = userIdRef.current;
    if (!userId) return;
    setAceptandoId(mision.id);
    try {
      const { error } = await supabase.from("misiones_usuario").upsert({
        user_id: userId,
        mision_id: mision.id,
        estado: "en_curso",
        progreso: 0,
        fecha_aceptada: new Date().toISOString(),
      });
      if (!error) {
        setMisiones((prev) =>
          prev.map((m) =>
            m.id === mision.id
              ? { ...m, user_estado: "en_curso", progreso: 0 }
              : m,
          ),
        );
        setMisionModal((prev) =>
          prev && prev.id === mision.id
            ? { ...prev, user_estado: "en_curso", progreso: 0 }
            : prev,
        );
        await invalidateSessionCache(`misiones_usuario:${userId}`);
        setTab("en_curso");
      } else {
        console.warn("[Misiones] Error aceptando misión:", error.message);
      }
    } finally {
      setAceptandoId(null);
    }
  };

  // ── Reclamar recompensa ───────────────────────────────────────────────
  const handleReclamarMision = async (mision: MisionConProgreso) => {
    const userId = userIdRef.current;
    if (!userId) return;
    setReclamandoId(mision.id);
    try {
      // Toda la validación (estado completada, doble-reclamo, suma de XP y
      // monedas) ocurre dentro de la función reclamar_mision en Supabase
      // (SECURITY DEFINER), así que el cliente nunca decide cuánto XP suma.
      const { data, error } = await supabase.rpc("reclamar_mision", {
        p_mision_id: mision.id,
      });

      if (!error) {
        const resultado = Array.isArray(data) ? data[0] : data;
        setPerfil((prev) =>
          prev
            ? {
                ...prev,
                xp_total: resultado?.nuevo_xp_total ?? prev.xp_total,
                monedas: resultado?.nuevas_monedas ?? prev.monedas,
              }
            : prev,
        );
        setMisiones((prev) =>
          prev.map((m) =>
            m.id === mision.id ? { ...m, user_estado: "reclamada" } : m,
          ),
        );
        setMisionModal(null);
        await invalidateSessionCache(`misiones_usuario:${userId}`);
        await invalidateSessionCache(`perfil_usuario:${userId}`);
      } else {
        console.warn("[Misiones] Error reclamando misión:", error.message);
      }
    } finally {
      setReclamandoId(null);
    }
  };

  // ── Derivados ──────────────────────────────────────────────────────────
  const misionesTablon = misiones.filter((m) => !m.user_estado);
  const misionesEnCurso = misiones.filter((m) => m.user_estado === "en_curso");
  const misionesCompletadas = misiones.filter(
    (m) => m.user_estado === "completada" || m.user_estado === "reclamada",
  );

  const tabs = [
    {
      id: "tablon" as const,
      label: "Tablón",
      icon: Scroll,
      count: misionesTablon.length,
    },
    {
      id: "en_curso" as const,
      label: "En curso",
      icon: Clock,
      count: misionesEnCurso.length,
    },
    {
      id: "completadas" as const,
      label: "Completadas",
      icon: CheckCircle2,
      count: misionesCompletadas.length,
    },
  ];

  const misionesVisibles =
    tab === "tablon"
      ? misionesTablon
      : tab === "en_curso"
        ? misionesEnCurso
        : misionesCompletadas;

  if (cargando)
    return (
      <div className="flex items-center justify-center min-h-60">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="animate-spin"
            size={20}
            style={{
              color: "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
          />
          <span
            className="text-[9px] font-black uppercase tracking-[0.3em]"
            style={{
              color: "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
          >
            Cargando misiones…
          </span>
        </div>
      </div>
    );

  return (
    <>
      <AnimatePresence>
        {misionModal && (
          <ModalMision
            aceptando={aceptandoId === misionModal.id}
            mision={misionModal}
            reclamando={reclamandoId === misionModal.id}
            onAceptar={handleAceptarMision}
            onClose={() => setMisionModal(null)}
            onReclamar={handleReclamarMision}
          />
        )}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto pb-20">
        {/* ── HERO HEADER ── */}
        <div className="animate-in fade-in duration-700">
          <div
            className="relative w-full overflow-hidden"
            style={{
              height: "96px",
              background:
                "color-mix(in srgb, var(--primary) 7%, var(--bg-main))",
              borderBottom:
                "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  color-mix(in srgb, var(--primary) 4%, transparent) 0px,
                  color-mix(in srgb, var(--primary) 4%, transparent) 1px,
                  transparent 1px,
                  transparent 24px
                )`,
              }}
            />
            <div
              className="absolute top-4 right-4 md:right-10 flex items-center gap-1.5 px-3 py-1.5"
              style={{
                border:
                  "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                borderRadius: "2px",
                background:
                  "color-mix(in srgb, var(--white-custom) 75%, transparent)",
                backdropFilter: "blur(6px)",
              }}
            >
              <Sparkles
                size={8}
                style={{
                  color: "color-mix(in srgb, var(--primary) 38%, transparent)",
                }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-[0.22em] tabular-nums"
                style={{
                  color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                }}
              >
                {perfil?.xp_total ?? 0}
              </span>
              <span
                className="text-[7px] font-black uppercase tracking-[0.2em] hidden sm:inline"
                style={{
                  color: "color-mix(in srgb, var(--primary) 36%, transparent)",
                }}
              >
                xp total
              </span>
            </div>
          </div>

          <div
            className="px-6 md:px-10 flex items-end gap-5 md:gap-7"
            style={{ marginTop: "-52px", paddingBottom: "20px" }}
          >
            <div
              className="relative shrink-0"
              style={{
                width: 104,
                height: 104,
                borderRadius: "50%",
                overflow: "hidden",
                background:
                  "color-mix(in srgb, var(--primary) 8%, var(--bg-main))",
                flexShrink: 0,
              }}
            >
              {perfil?.avatar_url ? (
                <img
                  alt={perfil?.username}
                  className="w-full h-full object-contain"
                  src={perfil.avatar_url}
                />
              ) : (
                <Scroll
                  className="absolute inset-0 m-auto"
                  size={36}
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 22%, transparent)",
                  }}
                />
              )}
            </div>

            <div
              className="flex flex-col gap-1 pb-1"
              style={{ paddingTop: "56px" }}
            >
              <div
                className="inline-flex w-fit items-center gap-1.5 px-2 py-0.5"
                style={{
                  border:
                    "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                  borderRadius: "2px",
                  background:
                    "color-mix(in srgb, var(--primary) 4%, transparent)",
                }}
              >
                <Star
                  size={7}
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 38%, transparent)",
                  }}
                />
                <span
                  className="text-[7px] font-black uppercase tracking-[0.22em]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 48%, transparent)",
                  }}
                >
                  Nivel {perfil?.nivel ?? 1}
                </span>
              </div>
              <h1
                className="font-serif italic leading-none capitalize"
                style={{
                  fontSize: "clamp(1.7rem, 4vw, 2.6rem)",
                  color: "var(--primary)",
                  letterSpacing: "0.01em",
                }}
              >
                Misiones
              </h1>
              <p
                className="font-serif italic"
                style={{
                  fontSize: "0.83rem",
                  color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
              >
                Desafíos y recompensas de {perfil?.username ?? "tu aventura"}
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            BODY — sidebar + content
        ══════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row gap-6 items-start mt-6 px-4 md:px-8">
          {/* ── LEFT SIDEBAR ── */}
          <div className="w-full md:w-64 xl:w-72 shrink-0 md:sticky md:top-16 self-start flex flex-col gap-4 animate-in fade-in duration-500">
            <div
              className="overflow-hidden"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              }}
            >
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="flex-1 h-px"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 8%, transparent)",
                    }}
                  />
                  <p
                    className="text-[7px] font-black uppercase tracking-[0.3em]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 28%, transparent)",
                    }}
                  >
                    Botín
                  </p>
                  <div
                    className="flex-1 h-px"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 8%, transparent)",
                    }}
                  />
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-1.5"
                      style={{
                        color:
                          "color-mix(in srgb, var(--primary) 40%, transparent)",
                      }}
                    >
                      <Sparkles size={10} />
                      <span className="text-[8px] font-black uppercase tracking-wider">
                        Experiencia
                      </span>
                    </div>
                    <span
                      className="text-[13px] font-black tabular-nums"
                      style={{ color: "var(--primary)" }}
                    >
                      {perfil?.xp_total ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-1.5"
                      style={{
                        color:
                          "color-mix(in srgb, var(--primary) 40%, transparent)",
                      }}
                    >
                      <Award size={10} />
                      <span className="text-[8px] font-black uppercase tracking-wider">
                        Monedas
                      </span>
                    </div>
                    <span
                      className="text-[13px] font-black tabular-nums"
                      style={{ color: "var(--primary)" }}
                    >
                      {perfil?.monedas ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="px-5 py-4"
                style={{
                  borderTop:
                    "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <div className="space-y-3.5">
                  {[
                    {
                      icon: <Scroll size={10} />,
                      label: "Tablón",
                      count: misionesTablon.length,
                    },
                    {
                      icon: <Clock size={10} />,
                      label: "En curso",
                      count: misionesEnCurso.length,
                    },
                    {
                      icon: <CheckCircle2 size={10} />,
                      label: "Completadas",
                      count: misionesCompletadas.length,
                    },
                  ].map(({ icon, label, count }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <div
                        className="flex items-center gap-1.5"
                        style={{
                          color:
                            "color-mix(in srgb, var(--primary) 40%, transparent)",
                        }}
                      >
                        {icon}
                        <span className="text-[8px] font-black uppercase tracking-wider">
                          {label}
                        </span>
                      </div>
                      <span
                        className="text-[13px] font-black tabular-nums"
                        style={{ color: "var(--primary)" }}
                      >
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 min-w-0 w-full">
            {/* Tabs */}
            <div
              className="flex items-center gap-1 mb-5 p-1 w-fit"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 4%, transparent)",
                borderRadius: "var(--radius-btn)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
              }}
            >
              {tabs.map(({ id, label, icon: Icon, count }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
                    style={{
                      borderRadius: "calc(var(--radius-btn) - 2px)",
                      background: active ? "var(--primary)" : "transparent",
                      color: active
                        ? "var(--btn-text)"
                        : "color-mix(in srgb, var(--primary) 45%, transparent)",
                    }}
                    onClick={() => setTab(id)}
                  >
                    <Icon size={11} />
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {label}
                    </span>
                    <span
                      className="text-[8px] font-black tabular-nums px-1"
                      style={{
                        borderRadius: "2px",
                        background: active
                          ? "color-mix(in srgb, var(--btn-text) 20%, transparent)"
                          : "color-mix(in srgb, var(--primary) 8%, transparent)",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grid de misiones */}
            <AnimatePresence mode="wait">
              <MotionDiv
                key={tab}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {misionesVisibles.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyMisiones
                      label={
                        tab === "tablon"
                          ? "No hay misiones disponibles por ahora…"
                          : tab === "en_curso"
                            ? "Aún no has aceptado ninguna misión…"
                            : "Todavía no completas ninguna misión…"
                      }
                    />
                  </div>
                ) : (
                  misionesVisibles.map((m) => (
                    <button
                      key={m.id}
                      className="group flex flex-col text-left overflow-hidden transition-all"
                      style={{
                        background: "var(--white-custom)",
                        borderRadius: "var(--radius-card)",
                        border:
                          "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "color-mix(in srgb, var(--primary) 24%, transparent)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "color-mix(in srgb, var(--primary) 10%, transparent)";
                      }}
                      onClick={() => setMisionModal(m)}
                    >
                      <div
                        className="w-full h-28 shrink-0 overflow-hidden relative"
                        style={{
                          background:
                            "color-mix(in srgb, var(--primary) 5%, transparent)",
                        }}
                      >
                        {m.imagen_url ? (
                          <img
                            alt={m.titulo}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            src={m.imagen_url}
                          />
                        ) : (
                          <Scroll
                            className="absolute inset-0 m-auto"
                            size={24}
                            style={{
                              color:
                                "color-mix(in srgb, var(--primary) 16%, transparent)",
                            }}
                          />
                        )}
                        <div className="absolute top-2 left-2">
                          <PastillaDificultad dificultad={m.dificultad} />
                        </div>
                        {m.user_estado === "reclamada" && (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{
                              background:
                                "color-mix(in srgb, var(--white-custom) 55%, transparent)",
                            }}
                          >
                            <CheckCircle2
                              size={22}
                              style={{
                                color:
                                  "color-mix(in srgb, var(--primary) 45%, transparent)",
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 p-3 flex-1">
                        <h3
                          className="font-serif italic text-[13px] leading-tight capitalize"
                          style={{ color: "var(--primary)" }}
                        >
                          {m.titulo}
                        </h3>

                        {m.user_estado === "en_curso" && (
                          <BarraProgreso progreso={m.progreso ?? 0} />
                        )}

                        <div className="flex items-center gap-2 mt-auto pt-1">
                          <span
                            className="flex items-center gap-1 text-[9px] font-black tabular-nums"
                            style={{
                              color:
                                "color-mix(in srgb, var(--primary) 40%, transparent)",
                            }}
                          >
                            <Sparkles size={9} />
                            {m.recompensa.xp} XP
                          </span>
                          {!!m.recompensa.monedas && (
                            <span
                              className="flex items-center gap-1 text-[9px] font-black tabular-nums"
                              style={{
                                color:
                                  "color-mix(in srgb, var(--primary) 40%, transparent)",
                              }}
                            >
                              <Award size={9} />
                              {m.recompensa.monedas}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </MotionDiv>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
