"use client";

import { ArrowLeft, Paperclip, Phone, Send, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { Loading } from "@/components/ui";
import { SmartImage } from "@/components/ui/SmartImage";
import { useLlamadaStore } from "@/features/personal/hooks/useLlamadaStore";
import {
  cargarMensajes,
  enviarMensaje,
  marcarComoLeido,
  subirAdjunto,
  suscribirseAMensajes,
  type Mensaje,
  type PerfilResumen,
} from "@/lib/api/client/chatEngine";
import { crearLlamada, ofrecerLlamada } from "@/lib/api/client/callEngine";
import { supabase } from "@/lib/api/client/supabase";
import { useAuth } from "@/providers/AuthProvider";

export default function DetalleConversacion() {
  const params = useParams();
  const idFromNext = params?.id as string;
  // En output:"export" + rewrite de Vercel a /placeholder, useParams()
  // devuelve el valor horneado en build ("placeholder"), no el id real
  // de la URL. Si detectamos ese caso, leemos el segmento real desde
  // window.location, que sí refleja la URL que ve el usuario.
  const [conversacionId, setConversacionId] = useState<string>(idFromNext);

  useEffect(() => {
    if (idFromNext !== "placeholder") {
      setConversacionId(idFromNext);
      return;
    }
    if (typeof window === "undefined") return;
    const partes = window.location.pathname.split("/").filter(Boolean);
    const real = partes[partes.length - 1];
    if (real) setConversacionId(real);
  }, [idFromNext]);

  const router = useRouter();
  const { user } = useAuth() as { user: any };

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otroParticipante, setOtroParticipante] = useState<PerfilResumen | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const iniciarLlamando = useLlamadaStore((s) => s.iniciarLlamando);
  const estadoLlamada = useLlamadaStore((s) => s.estado);

  // Traemos los datos del otro participante para el header y para poder
  // ofrecerle la llamada (nombre/avatar que se muestran en su pantalla).
  useEffect(() => {
    if (!conversacionId || conversacionId === "placeholder" || !user) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("conversacion_participantes")
        .select("perfil_id, perfiles!inner(id, username, avatar_url)")
        .eq("conversacion_id", conversacionId)
        .neq("perfil_id", user.id)
        .maybeSingle();
      if (mounted && data) {
        const p: any = (data as any).perfiles;
        setOtroParticipante({ id: p.id, username: p.username, avatar_url: p.avatar_url });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [conversacionId, user]);

  const handleLlamar = async () => {
    if (!user || !otroParticipante || estadoLlamada !== "inactiva") return;
    try {
      const { id: llamadaId, roomName } = await crearLlamada(conversacionId, "audio");
      iniciarLlamando({
        conversacionId,
        llamadaId,
        roomName,
        otro: {
          id: otroParticipante.id,
          nombre: otroParticipante.username,
          avatar: otroParticipante.avatar_url,
        },
      });
      await ofrecerLlamada({
        conversacionId,
        llamadaId,
        roomName,
        paraId: otroParticipante.id,
        deId: user.id,
        deNombre: user.user_metadata?.username ?? user.email ?? null,
        deAvatar: user.user_metadata?.avatar_url ?? null,
      });
    } catch {
      setError("No se pudo iniciar la llamada.");
    }
  };

  useEffect(() => {
    if (!conversacionId || conversacionId === "placeholder") return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const data = await cargarMensajes(conversacionId);
        if (mounted) setMensajes(data);
        void marcarComoLeido(conversacionId);
      } catch {
        if (mounted) setError("No se pudo cargar la conversación.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const canal = suscribirseAMensajes(conversacionId, (m) => {
      setMensajes((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
      void marcarComoLeido(conversacionId);
    });

    return () => {
      mounted = false;
      supabase.removeChannel(canal);
    };
  }, [conversacionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes.length]);

  const handleEnviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    const contenido = texto;
    setTexto("");
    try {
      await enviarMensaje(conversacionId, contenido);
    } catch {
      setError("No se pudo enviar el mensaje.");
      setTexto(contenido);
    } finally {
      setEnviando(false);
    }
  };

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoArchivo(true);
    try {
      const adjunto = await subirAdjunto(conversacionId, file);
      await enviarMensaje(conversacionId, "", adjunto);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo subir el archivo.");
    } finally {
      setSubiendoArchivo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <p className="text-primary/40 font-black uppercase text-xs tracking-widest italic">
          Necesitás iniciar sesión
        </p>
      </div>
    );
  }

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10"
        style={{
          background: "color-mix(in srgb, var(--bg-main) 92%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <button onClick={() => router.push("/personal/mensajes")} aria-label="Volver">
          <ArrowLeft className="text-primary/50" size={18} />
        </button>
        <span className="font-black text-sm text-primary uppercase tracking-wide flex-1">
          {otroParticipante?.username ?? "Conversación"}
        </span>
        <button
          disabled={!otroParticipante || estadoLlamada !== "inactiva"}
          onClick={() => void handleLlamar()}
          aria-label="Llamar"
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 34,
            height: 34,
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            opacity: !otroParticipante || estadoLlamada !== "inactiva" ? 0.4 : 1,
          }}
        >
          <Phone className="text-primary" size={15} />
        </button>
      </div>

      {/* ── Mensajes ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {mensajes.length === 0 ? (
          <p className="text-center text-primary/30 text-micro italic py-10">
            Todavía no hay mensajes. ¡Decí hola!
          </p>
        ) : (
          mensajes.map((m) => {
            const esMio = m.remitente_id === user.id;
            return (
              <div
                key={m.id}
                className={`max-w-[75%] px-4 py-2.5 rounded-[var(--radius-btn)] ${esMio ? "self-end" : "self-start"}`}
                style={{
                  background: esMio
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--primary) 6%, transparent)",
                  color: esMio ? "var(--btn-text)" : "var(--foreground)",
                }}
              >
                {m.adjunto_tipo === "imagen" && m.adjunto_url && (
                  <div className="w-48 rounded-[var(--radius-btn)] overflow-hidden mb-1">
                    <SmartImage alt="Adjunto" className="w-full h-full" src={m.adjunto_url} />
                  </div>
                )}
                {m.adjunto_tipo === "audio" && m.adjunto_url && (
                  <audio className="mb-1" controls src={m.adjunto_url} />
                )}
                {m.adjunto_tipo === "archivo" && m.adjunto_url && (
                  <a
                    className="underline text-sm font-bold block mb-1"
                    href={m.adjunto_url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    📎 Archivo adjunto
                  </a>
                )}
                {m.contenido && <p className="text-sm font-medium">{m.contenido}</p>}
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="px-4 py-2 flex items-center justify-between text-micro text-red-400 italic">
          {error}
          <button onClick={() => setError(null)}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Input ── */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          onChange={handleArchivo}
        />
        <button
          disabled={subiendoArchivo}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Adjuntar archivo"
        >
          <Paperclip
            className={subiendoArchivo ? "text-primary/20 animate-pulse" : "text-primary/50"}
            size={18}
          />
        </button>
        <input
          className="flex-1 px-4 py-2.5 rounded-[var(--radius-btn)] bg-transparent outline-none text-sm font-medium text-primary placeholder:text-primary/30"
          placeholder="Escribí un mensaje…"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
          }}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleEnviar();
            }
          }}
        />
        <button
          className="flex items-center justify-center rounded-full flex-shrink-0"
          disabled={!texto.trim() || enviando}
          style={{
            width: 36,
            height: 36,
            background: "var(--primary)",
            color: "var(--btn-text)",
            opacity: !texto.trim() || enviando ? 0.4 : 1,
          }}
          onClick={() => void handleEnviar()}
          aria-label="Enviar"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
