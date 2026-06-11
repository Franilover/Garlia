#!/bin/bash

# =============================================================
# fix-imports-2.sh
# Corrige los imports relativos rotos después de la migración
# Ejecutar desde la raíz del proyecto: bash fix-imports-2.sh
# =============================================================

set -e
PROJECT="$HOME/Code/agenda-next/src"
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}🔧 Fix round 2 — imports relativos y rutas sin /views/${RESET}"
echo ""

fix() {
  local FROM="$1"
  local TO="$2"
  local LABEL="$3"
  local COUNT
  COUNT=$(grep -rl "$FROM" "$PROJECT" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$COUNT" -gt 0 ]; then
    grep -rl "$FROM" "$PROJECT" --include="*.ts" --include="*.tsx" | \
      xargs sed -i "s|$FROM|$TO|g"
    echo -e "  ${GREEN}✓${RESET} ${LABEL} ${CYAN}(${COUNT} archivo/s)${RESET}"
  else
    echo -e "  ${YELLOW}–${RESET} ${LABEL} (sin coincidencias)"
  fi
}

# =============================================================
# BLOQUE 1: personal y auth — los archivos están en features/personal/
# directamente, no en features/personal/views/
# Verificamos dónde están realmente y ajustamos los imports
# =============================================================
echo -e "${BOLD}[ ¿views/ existe o los archivos están directamente en personal/ y auth/? ]${RESET}"
echo ""

# Detectar si los archivos están en views/ o directo
if [ -f "$PROJECT/features/personal/views/galeria.tsx" ]; then
  echo -e "  ${GREEN}✓${RESET} features/personal/views/ existe — los imports ya apuntan bien"
elif [ -f "$PROJECT/features/personal/galeria.tsx" ]; then
  echo -e "  ${YELLOW}!${RESET} Los archivos están en features/personal/ directamente (sin /views/)"
  echo -e "    → Corrigiendo imports para que apunten sin /views/"
  fix "@/features/personal/views/galeria"      "@/features/personal/galeria"      "personal/galeria (sin views)"
  fix "@/features/personal/views/sobre-mi"     "@/features/personal/sobre-mi"     "personal/sobre-mi (sin views)"
  fix "@/features/personal/views/menuPersonal" "@/features/personal/menuPersonal" "personal/menuPersonal (sin views)"
fi

echo ""
if [ -f "$PROJECT/features/auth/views/login.tsx" ]; then
  echo -e "  ${GREEN}✓${RESET} features/auth/views/ existe — ok"
elif [ -f "$PROJECT/features/auth/login.tsx" ]; then
  echo -e "  ${YELLOW}!${RESET} features/auth/login.tsx está sin /views/"
  fix "@/features/auth/views/login" "@/features/auth/login" "auth/login (sin views)"
fi

echo ""

# =============================================================
# BLOQUE 2: imports relativos rotos en Editor*.tsx
#
# El problema: los Editores están en features/myself/garlia/views/
# y usan imports como "./components/types" buscando una carpeta
# components/ al lado de views/ — que no existe.
# La carpeta real es features/myself/garlia/components/
# Entonces "./components/X" → "../components/X"
# =============================================================
echo -e "${BOLD}[ Editor*.tsx — imports relativos ./components → ../components ]${RESET}"

EDITORS=(
  "EditorCiudad.tsx"
  "EditorCriatura.tsx"
  "EditorGrupo.tsx"
  "EditorHechizos.tsx"
  "EditorItem.tsx"
  "EditorMundo.tsx"
  "EditorNota.tsx"
  "EditorPersonaje.tsx"
  "EditorReino.tsx"
  "editorGarlia.tsx"
)

for EDITOR in "${EDITORS[@]}"; do
  FILE="$PROJECT/features/myself/garlia/views/$EDITOR"
  if [ -f "$FILE" ]; then
    # Reemplazar "./components/" → "../components/" solo en ese archivo
    if grep -q '"\./components/' "$FILE"; then
      sed -i 's|"\./components/|"../components/|g' "$FILE"
      echo -e "  ${GREEN}✓${RESET} $EDITOR — ./components → ../components"
    else
      echo -e "  ${YELLOW}–${RESET} $EDITOR — sin ./components (ok)"
    fi
  else
    echo -e "  ${YELLOW}–${RESET} $EDITOR — archivo no encontrado"
  fi
done

echo ""

# =============================================================
# BLOQUE 3: MarkdownEditor — imports relativos rotos
#
# Los archivos en features/myself/garlia/views/ usan:
#   "../../../forms/Markdown/MarkdownEditor"
# pero MarkdownEditor está en src/components/forms/Markdown/
# Desde views/ (src/features/myself/garlia/views/) el path correcto es:
#   "@/components/forms/Markdown/MarkdownEditor"  (absoluto, más seguro)
# =============================================================
echo -e "${BOLD}[ MarkdownEditor — relativo roto → path absoluto ]${RESET}"

# En views/
fix '"../../../forms/Markdown/MarkdownEditor"'  '"@/components/forms/Markdown/MarkdownEditor"'  "MarkdownEditor (desde views/ — 3 niveles)"
# En components/ (dentro de features/myself/garlia/components/)
fix '"../../../../forms/Markdown/MarkdownEditor"' '"@/components/forms/Markdown/MarkdownEditor"' "MarkdownEditor (desde components/ — 4 niveles)"

echo ""

# =============================================================
# BLOQUE 4: PanelPersonajes importa ../EditorPersonaje
# Está en features/myself/garlia/components/ y busca EditorPersonaje
# que está en features/myself/garlia/views/EditorPersonaje
# =============================================================
echo -e "${BOLD}[ PanelPersonajes → EditorPersonaje ]${RESET}"
fix '"../EditorPersonaje"' '"../views/EditorPersonaje"' "PanelPersonajes: ../EditorPersonaje → ../views/EditorPersonaje"

echo ""

# =============================================================
# BLOQUE 5: leerLibro.tsx usa imports relativos que cruzan features
# Está en features/garlia/views/ e importa desde features/myself/garlia/
# Mejor usar paths absolutos
# =============================================================
echo -e "${BOLD}[ leerLibro.tsx — imports relativos cross-feature → absolutos ]${RESET}"

FILE="$PROJECT/features/garlia/views/leerLibro.tsx"
if [ -f "$FILE" ]; then
  sed -i 's|"../myself/garlia/editorCapitulos/snippets/type"|"@/features/myself/garlia/editorCapitulos/snippets/type"|g' "$FILE"
  sed -i 's|"../myself/garlia/editorCapitulos/leer/LectorUI"|"@/features/myself/garlia/editorCapitulos/leer/LectorUI"|g' "$FILE"
  echo -e "  ${GREEN}✓${RESET} leerLibro.tsx — 2 imports relativos cross-feature convertidos a absolutos"
else
  echo -e "  ${YELLOW}–${RESET} leerLibro.tsx no encontrado"
fi

echo ""

# =============================================================
# BLOQUE 6: enciclopedia.tsx — los 2 imports que quedaron del round 1
# =============================================================
echo -e "${BOLD}[ enciclopedia.tsx — imports que quedaron del round 1 ]${RESET}"
fix '@/components/paginas/garlia/info/personajes' '@/features/garlia/info/personajes' "enciclopedia: info/personajes"
fix '@/components/paginas/garlia/info/criaturas'  '@/features/garlia/info/criaturas'  "enciclopedia: info/criaturas"

echo ""

# =============================================================
# VERIFICACIÓN FINAL
# =============================================================
echo -e "${BOLD}🔍 Verificación final${RESET}"
echo ""

# Imports de paginas/ que quedaron
PAGINAS=$(grep -r "@/components/paginas/" "$PROJECT" --include="*.ts" --include="*.tsx" -l 2>/dev/null)
if [ -z "$PAGINAS" ]; then
  echo -e "  ${GREEN}✅ Sin imports de @/components/paginas/ — perfecto${RESET}"
else
  echo -e "  ${RED}✗ Quedan imports de paginas/:${RESET}"
  grep -r "@/components/paginas/" "$PROJECT" --include="*.ts" --include="*.tsx" -n | sed "s|$PROJECT/||"
fi

echo ""

# Imports relativos ./components en views/
RELATIVE=$(grep -r '"\./components/' "$PROJECT/features/myself/garlia/views/" --include="*.tsx" -l 2>/dev/null)
if [ -z "$RELATIVE" ]; then
  echo -e "  ${GREEN}✅ Sin imports relativos ./components en views/ — perfecto${RESET}"
else
  echo -e "  ${RED}✗ Quedan imports ./components en views/:${RESET}"
  grep -r '"\./components/' "$PROJECT/features/myself/garlia/views/" --include="*.tsx" -n | sed "s|$PROJECT/||"
fi

echo ""
echo -e "${BOLD}Corré de nuevo: ${CYAN}npx tsc --noEmit${RESET}"
echo ""
