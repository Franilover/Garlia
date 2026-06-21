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
  WifiOff,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { supabase } from "@/lib/api/client/supabase";
import {
  aceptarMisionOffline,
  invalidateSessionCache,
  loadMisiones,
  loadMisionesUsuario,
  reclamarMisionOffline,
} from "@/lib/api/client/syncEngine";

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
  const [offline, setOffline] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const showAviso = (msg: string) => {
    setAviso(msg);
    setTimeout(() => setAviso(null), 3500);
  };

  const userIdRef = React.useRef<string | null>(null);

  // Combina catálogo + progreso del usuario en una sola lista para la UI.
  // Se reutiliza tanto en la carga inicial como cuando llegan actualizaciones
  // en background (onUpdate de loadMisiones/loadMisionesUsuario).
  const combinarMisiones = useCallback(
    (catalogo: any[], progresoRows: any[]): MisionConProgreso[] => {
      const progresoPorMision = new Map(
        progresoRows.map((p: any) => [p.mision_id, p]),
      );
      return catalogo.map((m: any) => {
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
          recompensa_item_id: m.recompensa_item_id ?? null,
          user_estado: prog?.estado ?? null,
          progreso: prog?.progreso ?? 0,
        };
      });
    },
    [],
  );

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

        // El perfil sigue cargándose directo (su caché offline ya la maneja
        // el resto de la app). Misiones y progreso usan el syncEngine:
        // Dexie primero (funciona offline), Supabase en background si hay
        // conexión, vía el callback onUpdate.
        const [{ data: perfilData }, catalogo, progresoRows] =
          await Promise.all([
            supabase
              .from("perfiles")
              .select("username, avatar_url, nivel, xp_total, monedas")
              .eq("id", user.id)
              .single(),
            loadMisiones((catalogoActualizado) => {
              setMisiones((prev) => {
                const progresoActual = prev.map((m) => ({
                  mision_id: m.id,
                  estado: m.user_estado,
                  progreso: m.progreso,
                }));
                return combinarMisiones(catalogoActualizado, progresoActual);
              });
            }),
            loadMisionesUsuario(user.id, (progresoActualizado) => {
              setMisiones((prev) => {
                const catalogoActual = prev.map((m) => ({
                  id: m.id,
                  titulo: m.titulo,
                  descripcion: m.descripcion,
                  dificultad: m.dificultad,
                  categoria: m.categoria,
                  imagen_url: m.imagen_url,
                  requisitos: m.requisitos,
                  vence_en: m.vence_en,
                  recompensa_xp: m.recompensa.xp,
                  recompensa_monedas: m.recompensa.monedas,
                  recompensa_item_nombre: m.recompensa.item_nombre,
                  recompensa_item_imagen_url: m.recompensa.item_imagen_url,
                  recompensa_item_id: m.recompensa_item_id ?? null,
                }));
                return combinarMisiones(catalogoActual, progresoActualizado);
              });
            }),
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

        // Si no hubo respuesta de perfil (típico sin conexión y sin caché
        // local de perfil todavía), lo marcamos visualmente como offline.
        if (!perfilData) setOffline(true);

        setMisiones(combinarMisiones(catalogo, progresoRows));
      } catch (err) {
        console.error("[Misiones] Error inesperado:", err);
      } finally {
        setCargando(false);
      }
    }

    cargarTodo();
  }, [combinarMisiones]);

  // ── Aceptar misión ────────────────────────────────────────────────────
  const handleAceptarMision = async (mision: MisionConProgreso) => {
    const userId = userIdRef.current;
    if (!userId) return;
    setAceptandoId(mision.id);
    try {
      // aceptarMisionOffline escribe en Dexie de inmediato (la UI no
      // espera red) y, si hay conexión, confirma contra Supabase en el
      // mismo paso. Sin conexión, queda encolada para sincronizar después.
      await aceptarMisionOffline(userId, mision.id);

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
      setTab("en_curso");
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
      // El reclamo NUNCA se aplica de forma optimista: la suma de XP/monedas
      // solo la valida y ejecuta la función reclamar_mision en Supabase.
      // Sin conexión, esto devuelve ok:false con reason "offline" en vez de
      // fingir éxito — evitamos que el cliente decida cuánto XP otorgarse.
      const resultado = await reclamarMisionOffline(mision.id);

      if (resultado.ok) {
        setPerfil((prev) =>
          prev
            ? {
                ...prev,
                xp_total: resultado.nuevoXpTotal,
                monedas: resultado.nuevasMonedas,
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
        // El item se entregó en el servidor — invalidar cachés de inventario
        // para que aparezca en el perfil sin necesitar recargar la página.
        await invalidateSessionCache(`inventario_usuario:${userId}`);
        await invalidateSessionCache(`descubrimientos:${userId}`);
      } else if (resultado.reason === "offline") {
        setOffline(true);
        showAviso("Necesitas conexión a internet para reclamar la recompensa.");
      } else {
        console.warn("[Misiones] Error reclamando misión:", resultado.message);
        showAviso("No se pudo reclamar la recompensa. Intenta de nuevo.");
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
            <div className="absolute top-4 right-4 md:right-10 flex items-center gap-2">
              {offline && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5"
                  style={{
                    border:
                      "1px solid color-mix(in srgb, #d97706 30%, transparent)",
                    borderRadius: "2px",
                    background:
                      "color-mix(in srgb, #d97706 10%, var(--white-custom))",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <WifiOff size={8} style={{ color: "#d97706" }} />
                  <span
                    className="text-[8px] font-black uppercase tracking-[0.18em]"
                    style={{ color: "#d97706" }}
                  >
                    Sin conexión
                  </span>
                </div>
              )}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5"
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
                    color:
                      "color-mix(in srgb, var(--primary) 38%, transparent)",
                  }}
                />
                <span
                  className="text-[9px] font-black uppercase tracking-[0.22em] tabular-nums"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 55%, transparent)",
                  }}
                >
                  {perfil?.xp_total ?? 0}
                </span>
                <span
                  className="text-[7px] font-black uppercase tracking-[0.2em] hidden sm:inline"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 36%, transparent)",
                  }}
                >
                  xp total
                </span>
              </div>
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

      {/* ── Aviso (ej. "necesitas conexión para reclamar") ── */}
      <AnimatePresence>
        {aviso && (
          <MotionDiv
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 flex items-center gap-2"
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: 8 }}
            style={{
              borderRadius: "var(--radius-btn)",
              background:
                "color-mix(in srgb, #d97706 10%, var(--white-custom))",
              border: "1px solid color-mix(in srgb, #d97706 30%, transparent)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              whiteSpace: "nowrap",
            }}
          >
            <WifiOff size={11} style={{ color: "#d97706" }} />
            <span
              className="text-[10px] font-black uppercase tracking-tight"
              style={{ color: "#d97706" }}
            >
              {aviso}
            </span>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
}
