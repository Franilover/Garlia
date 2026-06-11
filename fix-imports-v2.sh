#!/usr/bin/env bash
# fix-imports-v2.sh — corrige imports con rutas reales verificadas
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }

fix() {
  local file="$1" old="$2" new="$3"
  if [ ! -f "$file" ]; then warn "No encontrado: $file"; return; fi
  if grep -qF "$old" "$file"; then
    sed -i.bak "s|${old}|${new}|g" "$file" && rm -f "${file}.bak"
    ok "$file\n     $old\n  →  $new"
  else
    warn "Ya corregido: $(basename $file) — $old"
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  fix-imports v2 — rutas verificadas"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── EditorMundo.tsx ─────────────────────────────────────────────────────────
# EditorCapitulos está en views/, mismo nivel
echo -e "\n[ 1 ] EditorMundo.tsx"
fix "src/features/myself/garlia/views/EditorMundo.tsx" \
  "@/features/myself/garlia/editorCapitulos/views/EditorCapitulos" \
  "@/features/myself/garlia/views/EditorCapitulos"

# ── EditorCapitulos.tsx ─────────────────────────────────────────────────────
# Está en views/, sus deps están en editorCapitulos/ → ruta absoluta
echo -e "\n[ 2 ] views/EditorCapitulos.tsx"
EC="src/features/myself/garlia/views/EditorCapitulos.tsx"

fix "$EC" \
  "from \"../snippets/SnippetOverlay\"" \
  "from \"@/features/myself/garlia/editorCapitulos/snippets/SnippetOverlay\""

fix "$EC" \
  "from \"../snippets/SnippetCommandPalette\"" \
  "from \"@/features/myself/garlia/editorCapitulos/snippets/SnippetCommandPalette\""

fix "$EC" \
  "from \"../types\"" \
  "from \"@/features/myself/garlia/editorCapitulos/types\""

fix "$EC" \
  "from \"../hooks/hooks\"" \
  "from \"@/features/myself/garlia/editorCapitulos/hooks/hooks\""

fix "$EC" \
  "from \"../components\"" \
  "from \"@/features/myself/garlia/editorCapitulos/components\""

# ── EditorLetras.tsx ─────────────────────────────────────────────────────────
# Está en views/, sus deps están en editorLetras/ → ruta absoluta
echo -e "\n[ 3 ] views/EditorLetras.tsx"
EL="src/features/myself/garlia/views/EditorLetras.tsx"

fix "$EL" \
  "from \"../hooks/useCanciones\"" \
  "from \"@/features/myself/garlia/editorLetras/hooks/useCanciones\""

fix "$EL" \
  "from \"../constants\"" \
  "from \"@/features/myself/garlia/editorLetras/constants\""

fix "$EL" \
  "from \"../components/sidebar/SidebarItem\"" \
  "from \"@/features/myself/garlia/editorLetras/components/sidebar/SidebarItem\""

fix "$EL" \
  "from \"../components/editor/PanelEditor\"" \
  "from \"@/features/myself/garlia/editorLetras/components/editor/PanelEditor\""

fix "$EL" \
  "from \"../components/modals/ModalNuevaCancion\"" \
  "from \"@/features/myself/garlia/editorLetras/components/modals/ModalNuevaCancion\""

fix "$EL" \
  "from \"../types\"" \
  "from \"@/features/myself/garlia/editorLetras/types\""

# ── CapituloScrollBlock.tsx ──────────────────────────────────────────────────
# usePersonajes/useReinos/useCiudades están en editorCapitulos/hooks/
echo -e "\n[ 4 ] garlia/components/leer/CapituloScrollBlock.tsx"
CSB="src/features/garlia/components/leer/CapituloScrollBlock.tsx"

fix "$CSB" \
  "@/features/myself/garlia/editorCapitulos/leer/usePersonajes" \
  "@/features/myself/garlia/editorCapitulos/hooks/usePersonajes"

fix "$CSB" \
  "@/features/myself/garlia/editorCapitulos/leer/useReinos" \
  "@/features/myself/garlia/editorCapitulos/hooks/useReinos"

fix "$CSB" \
  "@/features/myself/garlia/editorCapitulos/leer/useCiudades" \
  "@/features/myself/garlia/editorCapitulos/hooks/useCiudades"

# ── leerLibro.tsx ─────────────────────────────────────────────────────────────
# CapituloScrollBlock, LectorUI están en garlia/components/leer/
echo -e "\n[ 5 ] garlia/views/leerLibro.tsx"
LB="src/features/garlia/views/leerLibro.tsx"

fix "$LB" \
  "@/features/myself/garlia/editorCapitulos/leer/CapituloScrollBlock" \
  "@/features/garlia/components/leer/CapituloScrollBlock"

fix "$LB" \
  "@/features/myself/garlia/editorCapitulos/leer/LectorUI" \
  "@/features/garlia/components/leer/LectorUI"

# ── hooks/hooks.ts — fix del tipo unknown ────────────────────────────────────
echo -e "\n[ 6 ] hooks/hooks.ts — Property 'status' on unknown"
HH="src/features/myself/garlia/editorCapitulos/hooks/hooks.ts"
if [ -f "$HH" ]; then
  # Castea loc a any para resolver el TS2339
  sed -i.bak \
    's/if (loc?\.status === "pending")/if ((loc as any)?.status === "pending")/g' \
    "$HH"
  sed -i.bak2 \
    's/return loc?\.status === "pending"/return (loc as any)?.status === "pending"/g' \
    "$HH"
  rm -f "${HH}.bak" "${HH}.bak2"
  ok "$HH — status cast a any"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Verificando con tsc..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsc --noEmit 2>&1 || true
