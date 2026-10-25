"use client";
/**
 * SoundNode.tsx
 * ─────────────
 * Nodo Lexical inline para [[sound|url|volume]].
 *
 * Cambios vs original:
 * - SoundChipView ahora tiene botón Play/Stop usando Tone.js (lazy import).
 * - useSoundPlayer: hook local liviano — lazy-importa Tone.js solo cuando
 *   el usuario toca Play, para no cargar ~400KB en el bundle inicial.
 * - El chip original (click para editar, X para borrar) no cambió de API.
 */
import type {
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $getNodeByKey, DecoratorNode } from "lexical";
import React, { useCallback, useRef, useState } from "react";
import { Music2, Play, Square } from "lucide-react";

import { snippetEditHandler } from "./sharedTypes";
import { SnippetChip } from "./SnippetChip";

export interface SoundPayload {
  url: string;
  volume: number;
}

export type SerializedSoundNode = Spread<
  { type: "sound-snippet"; version: 1 } & SoundPayload,
  SerializedLexicalNode
>;

// ─── Hook de reproducción con Tone.js (lazy import) ──────────────────────────

function useSoundPlayer() {
  // Mapa url → instancia Player de Tone. Usamos ref para no re-renderizar
  // cuando cambia, y para que el cleanup funcione aunque el componente
  // se desmonte antes de que termine el fade-out.
  const playersRef = useRef<Map<string, unknown>>(new Map());

  const play = useCallback(async (url: string, volume = 0.8) => {
    // Lazy import: Tone.js solo se descarga cuando el usuario toca Play.
    const Tone = await import("tone");
    // Requerido por los browsers: el AudioContext solo puede iniciar
    // después de un gesto del usuario. Tone.start() lo desbloquea.
    await Tone.start();

    // Si ya está sonando esta URL, la paramos antes de reiniciar.
    const existing = playersRef.current.get(url) as any;
    if (existing) {
      try { existing.stop(); existing.dispose(); } catch { /* ignorar */ }
    }

    const player = new Tone.Player({
      url,
      autostart: true,
      volume: Tone.gainToDb(Math.max(0.001, Math.min(1, volume))), // 0–1 → dB
      fadeIn: 0.3,
      fadeOut: 0.5,
    }).toDestination();

    playersRef.current.set(url, player);
    return player;
  }, []);

  const stop = useCallback(async (url: string) => {
    const player = playersRef.current.get(url) as any;
    if (player) {
      try { player.stop(); player.dispose(); } catch { /* ignorar */ }
      playersRef.current.delete(url);
    }
  }, []);

  return { play, stop };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function soundLabel(url: string): string {
  const file = url.split("/").pop() ?? url;
  return file.replace(/\.[a-z0-9]+$/i, "");
}

function SoundChipView({
  payload,
  nodeKey,
  editor,
}: {
  payload: SoundPayload;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const { play, stop } = useSoundPlayer();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const togglePlay = useCallback(
    async (e: React.MouseEvent) => {
      // Evitar que el click propague al SnippetChip y abra el editor de snippet.
      e.stopPropagation();
      if (loading) return;

      if (playing) {
        await stop(payload.url);
        setPlaying(false);
      } else {
        setLoading(true);
        try {
          await play(payload.url, payload.volume);
          setPlaying(true);
        } catch (err) {
          console.error("[SoundNode] Error reproduciendo:", err);
        } finally {
          setLoading(false);
        }
      }
    },
    [play, stop, payload.url, payload.volume, playing, loading],
  );

  return (
    <SnippetChip
      icon={
        <span className="flex items-center gap-0.5">
          {/* Botón Play/Stop — independiente del click de edición */}
          <button
            className="flex items-center justify-center hover:text-accent transition-colors disabled:opacity-40"
            disabled={loading}
            style={{ lineHeight: 1 }}
            title={playing ? "Parar" : "Reproducir"}
            type="button"
            onClick={togglePlay}
          >
            {playing
              ? <Square size={9} />
              : <Play size={9} />
            }
          </button>
          <Music2 size={10} />
        </span>
      }
      text={soundLabel(payload.url)}
      title={`Sonido — volumen ${payload.volume}${playing ? " · sonando" : ""}`}
      onClick={() =>
        snippetEditHandler.current?.({
          kind: "sound",
          nodeKey,
          payload,
          replace: (next) =>
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if ($isSoundNode(node)) node.setPayload(next);
            }),
          remove: () =>
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if ($isSoundNode(node)) node.remove();
            }),
        })
      }
      onDelete={() =>
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isSoundNode(node)) node.remove();
        })
      }
    />
  );
}

export class SoundNode extends DecoratorNode<React.ReactNode> {
  __payload: SoundPayload;

  static getType(): string {
    return "sound-snippet";
  }

  static clone(node: SoundNode): SoundNode {
    return new SoundNode(node.__payload, node.__key);
  }

  constructor(payload: SoundPayload, key?: NodeKey) {
    super(key);
    this.__payload = payload;
  }

  static importJSON(
    serialized: SerializedLexicalNode & Record<string, unknown>,
  ): SoundNode {
    const { url, volume } = serialized as unknown as SerializedSoundNode;
    return $createSoundNode({ url, volume });
  }

  exportJSON(): SerializedSoundNode {
    return { ...this.__payload, type: "sound-snippet", version: 1 };
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  setPayload(next: SoundPayload): void {
    this.getWritable().__payload = next;
  }

  getPayload(): SoundPayload {
    return this.__payload;
  }

  getTextContent(): string {
    return soundLabel(this.__payload.url);
  }

  isInline(): true {
    return true;
  }

  decorate(editor: LexicalEditor): React.ReactNode {
    return (
      <SoundChipView editor={editor} nodeKey={this.getKey()} payload={this.__payload} />
    );
  }
}

export function $createSoundNode(payload: SoundPayload): SoundNode {
  return new SoundNode(payload);
}

export function $isSoundNode(
  node: LexicalNode | null | undefined,
): node is SoundNode {
  return node instanceof SoundNode;
}

export function soundRawToPayload(raw: string): SoundPayload | null {
  const inner = raw.startsWith("[[") && raw.endsWith("]]") ? raw.slice(2, -2) : raw;
  const parts = inner.split("|").map((p) => p.trim());
  if (parts[0] !== "sound") return null;
  return {
    url: parts[1] ?? "",
    volume: parseFloat(parts[2] ?? "0.5"),
  };
}

export function soundPayloadToRaw(p: SoundPayload): string {
  return `[[sound|${p.url}|${p.volume}]]`;
}
