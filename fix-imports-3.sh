#!/bin/bash

# =============================================================
# fix-imports-3.sh
# Corrige imports de components/display y components/templates
# luego de moverlos a components/ui y components/layout
# Ejecutar desde la raíz del proyecto: bash fix-imports-3.sh
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
echo -e "${BOLD}🔧 Fix imports — display/ → ui/ y templates/ → layout/${RESET}"
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
# display/ → ui/
# =============================================================
echo -e "${BOLD}[ components/display → components/ui ]${RESET}"
fix "@/components/display/DetalleMaestro" "@/components/ui/DetalleMaestro" "DetalleMaestro"
fix "@/components/display/detalles"       "@/components/ui/detalles"       "detalles"
fix "@/components/display/SmartImage"     "@/components/ui/SmartImage"     "SmartImage"
echo ""

# =============================================================
# templates/ → layout/
# =============================================================
echo -e "${BOLD}[ components/templates → components/layout ]${RESET}"
fix "@/components/templates/EstudioTemplates" "@/components/layout/EstudioTemplates" "EstudioTemplates"
fix "@/components/templates/GaleriaBase"      "@/components/layout/GaleriaBase"      "GaleriaBase"
fix "@/components/templates/MenuBase"         "@/components/layout/MenuBase"         "MenuBase"
fix "@/components/templates/MenuCard"         "@/components/layout/MenuCard"         "MenuCard"
echo ""

# =============================================================
# VERIFICACIÓN FINAL
# =============================================================
echo -e "${BOLD}🔍 Verificación final${RESET}"

REMAINING=$(grep -r "@/components/display/\|@/components/templates/" "$PROJECT" --include="*.ts" --include="*.tsx" -l 2>/dev/null)
if [ -z "$REMAINING" ]; then
  echo -e "  ${GREEN}✅ Ningún import de display/ ni templates/ — todo limpio${RESET}"
else
  echo -e "  ${RED}✗ Quedan imports sin corregir:${RESET}"
  grep -r "@/components/display/\|@/components/templates/" "$PROJECT" --include="*.ts" --include="*.tsx" -n | \
    sed "s|$PROJECT/||"
fi

echo ""
echo -e "${BOLD}Corré: ${CYAN}npx tsc --noEmit${RESET}"
echo ""
