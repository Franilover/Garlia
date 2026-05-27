/**
 * parseSnippetRaw
 * ---------------
 * Extrae los valores iniciales de un snippet raw `[[kind|…]]`
 * para pre-poblar los modales cuando el usuario hace clic en ✎.
 *
 * Uso en cada modal:
 *   const init = parseSnippetRaw(initialRaw);
 *   const [valor, setValor] = useState(init?.campo ?? "");
 */

export type ParsedSnippet =
  | { kind: "drop";    entidadId: string; label: string }
  | { kind: "img";     url: string; alt: string; float: boolean }
  | { kind: "float";   url: string; alt: string; float: true }
  | { kind: "choice";  texto: string; target: string }
  | { kind: "use";     itemId: string; label: string; capId: string }
  | { kind: "gate";    itemId: string; tieneTexto: string; noTieneTexto: string }
  | { kind: "section"; id: string; label: string }
  | { kind: "sound";   src: string; label: string }
  | { kind: "unknown"; parts: string[] };

/**
 * Parsea un raw snippet del tipo `[[kind|part1|part2|…]]`
 * Devuelve null si el raw no tiene el formato esperado.
 */
export function parseSnippetRaw(raw: string | undefined): ParsedSnippet | null {
  if (!raw) return null;

  // Quita los [[ ]]
  const inner = raw.startsWith("[[") && raw.endsWith("]]")
    ? raw.slice(2, -2)
    : raw;

  const parts = inner.split("|").map(p => p.trim());
  const kind  = parts[0];

  switch (kind) {
    case "drop":
      // [[drop|entidadId|Nombre visible]]
      return { kind: "drop", entidadId: parts[1] ?? "", label: parts[2] ?? "" };

    case "img":
      // [[img|url|alt]]
      return { kind: "img", url: parts[1] ?? "", alt: parts[2] ?? "", float: false };

    case "float":
      // [[float|url|alt]]
      return { kind: "float", url: parts[1] ?? "", alt: parts[2] ?? "", float: true };

    case "choice":
      // [[choice|Texto del botón|capituloId_o_sectionId]]
      return { kind: "choice", texto: parts[1] ?? "", target: parts[2] ?? "" };

    case "use":
      // [[use|itemId|Nombre del ítem|capituloId]]
      return { kind: "use", itemId: parts[1] ?? "", label: parts[2] ?? "", capId: parts[3] ?? "" };

    case "section":
      // [[section|id|Label opcional]]
      return { kind: "section", id: parts[1] ?? "", label: parts[2] ?? "" };

    case "sound":
      // [[sound|src|Label]]
      return { kind: "sound", src: parts[1] ?? "", label: parts[2] ?? "" };

    default:
      return { kind: "unknown", parts };
  }
}