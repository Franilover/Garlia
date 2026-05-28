/**
 * parseSnippetRaw
 * ---------------
 * Extrae los valores iniciales de un snippet raw `[[kind|…]]`
 * para pre-poblar los modales cuando el usuario hace clic en ✎.
 */

export type ParsedSnippet =
  | { kind: "drop";    entidadId: string; entidadTipo: string; label: string }
  | { kind: "img";     url: string; alt: string; float: boolean }
  | { kind: "float";   url: string; alt: string; float: true }
  | { kind: "choice";  texto: string; target: string }
  | { kind: "use";     itemId: string; label: string; sectionOk: string; sectionFail: string }
  | { kind: "gate";    itemId: string; tieneTexto: string; noTieneTexto: string }
  | { kind: "section"; id: string; label: string }
  | { kind: "sound";   src: string; label: string }
  | { kind: "unknown"; parts: string[] };

export function parseSnippetRaw(raw: string | undefined): ParsedSnippet | null {
  if (!raw) return null;

  const inner = raw.startsWith("[[") && raw.endsWith("]]")
    ? raw.slice(2, -2)
    : raw;

  const parts = inner.split("|").map(p => p.trim());
  const kind  = parts[0];

  switch (kind) {
    case "drop":
      // Formato: [[drop|palabra|tipo|id|nombre]]
      // parts[1] = palabra (label visible en el texto)
      // parts[2] = tipo (item | criatura | personaje)
      // parts[3] = id de la entidad
      // parts[4] = nombre de la entidad
      return {
        kind:        "drop",
        label:       parts[1] ?? "",
        entidadTipo: parts[2] ?? "",
        entidadId:   parts[3] ?? "",
      };
    case "img":
      return { kind: "img", url: parts[1] ?? "", alt: parts[2] ?? "", float: false };
    case "float":
      return { kind: "float", url: parts[1] ?? "", alt: parts[2] ?? "", float: true };
    case "choice":
      // [[choice|Texto del botón|sectionId]]
      return { kind: "choice", texto: parts[1] ?? "", target: parts[2] ?? "" };
    case "use":
      // [[use|Palabra|itemId|sectionOk|sectionFail]]
      return { kind: "use", itemId: parts[2] ?? "", label: parts[1] ?? "", sectionOk: parts[3] ?? "", sectionFail: parts[4] ?? "" };
    case "section":
      return { kind: "section", id: parts[1] ?? "", label: parts[2] ?? "" };
    case "sound":
      return { kind: "sound", src: parts[1] ?? "", label: parts[2] ?? "" };
    default:
      return { kind: "unknown", parts };
  }
}