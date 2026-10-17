"use client";

import { useState } from "react";
import { ArrowDown, Check, Clipboard, Languages, LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";
import { supabase } from "@/infra/supabase/supabase";

type TranslationResult = {
  source_language: string;
  target_language: string;
  source_text: string;
  translated_text: string;
  mode: string;
  recognized_tokens: number;
  total_content_tokens: number;
  unresolved_words: string[];
  matches: Array<{ source: string; target: string; category: string | null; state: string | null }>;
  language_state: string | null;
  warning: string;
};

export default function TraductorAorisPage() {
  const [source, setSource] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function translate() {
    if (!source.trim()) {
      setError("Escribe una frase en español para empezar.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("traducir-espanol-aoris", {
        body: { text: source.trim() },
      });
      if (invokeError) {
        let message = invokeError.message || "No se pudo conectar con el motor.";
        if ("context" in invokeError && invokeError.context instanceof Response) {
          try {
            const details = await invokeError.context.clone().json();
            if (details?.error) message = details.error;
          } catch { /* Supabase may return a non-JSON error body. */ }
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      setResult(data as TranslationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error al traducir.");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result?.translated_text) return;
    try {
      await navigator.clipboard.writeText(result.translated_text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("No se pudo copiar el resultado desde este navegador.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Languages className="h-4 w-4" />
          Laboratorio lingüístico de Garlia
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Traductor Español → Aoris</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Escribe en español y consulta las equivalencias que existen en el léxico Aoris de Supabase.
          Las palabras sin correspondencia se marcarán para no inventar vocabulario.
        </p>
        <p className="mt-3 max-w-2xl rounded-lg border border-border bg-card px-3 py-2 text-xs leading-5 text-muted-foreground">
          El modo experimental consulta borradores lingüísticos, por eso requiere una sesión iniciada y permisos de editor o administrador.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b border-border p-5 md:border-b-0 md:border-r sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label htmlFor="spanish-source" className="text-sm font-semibold">Español</label>
              <span className="text-xs text-muted-foreground">{source.length}/2000</span>
            </div>
            <textarea
              id="spanish-source"
              value={source}
              onChange={(event) => setSource(event.target.value.slice(0, 2000))}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void translate();
              }}
              placeholder="Escribe aquí una palabra o frase en español…"
              className="min-h-48 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              maxLength={2000}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSource("volar")}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-background hover:text-foreground"
              >
                Probar «volar»
              </button>
              <button
                type="button"
                onClick={() => setSource("vuela")}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-background hover:text-foreground"
              >
                Probar «vuela»
              </button>
              <button
                type="button"
                onClick={() => { setSource(""); setResult(null); setError(null); }}
                className="rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-background"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Aoris</span>
              <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Desde Supabase</span>
            </div>
            <div aria-live="polite" className="min-h-48 rounded-xl border border-border bg-background p-4">
              {loading ? (
                <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Consultando el léxico…
                </div>
              ) : result ? (
                <div className="space-y-4">
                  <p className="break-words text-lg leading-8">{result.translated_text}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{result.recognized_tokens} equivalencia(s) encontrada(s)</span>
                    <span aria-hidden="true">·</span>
                    <span>{result.unresolved_words.length} palabra(s) sin resolver</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyResult()}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-card"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar resultado"}
                  </button>
                </div>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                  <ArrowDown className="h-5 w-5" />
                  La traducción aparecerá aquí
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void translate()}
              disabled={loading || !source.trim()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Traduciendo…" : "Traducir a Aoris"}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <section className="mt-5 space-y-4">
          {result.unresolved_words.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <h2 className="text-sm font-semibold">Palabras pendientes de equivalencia</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {result.unresolved_words.join(", ")}. Se dejaron entre corchetes en el resultado.
                No se han creado lexemas ni cambiado el canon.
              </p>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Equivalencias encontradas</h2>
            {result.matches.length ? (
              <div className="mt-3 divide-y divide-border">
                {result.matches.map((match, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">{match.source}</span>
                    <span className="text-right font-medium">{match.target}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Todavía no hay equivalencias léxicas para este texto.</p>
            )}
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm text-muted-foreground">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{result.warning} El idioma y sus lexemas están en estado de borrador; este resultado es experimental.</p>
          </div>
        </section>
      )}

      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Prototipo inicial: consulta datos existentes y no escribe en la base de datos. La traducción de oraciones
        completas requiere implementar y validar el análisis sintáctico y la generación morfológica.
      </p>
    </main>
  );
}
