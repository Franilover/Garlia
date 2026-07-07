# Rediseño de EditorMundo — estado: COMPLETO

Todas las secciones referenciadas por `EditorMundoRoot.tsx` ya están escritas
y son compilables. Esto ya no es una guía de "falta hacer" sino el mapa de
lo que se entregó.

## Instalación previa

Este rediseño usa [Zustand](https://github.com/pmndrs/zustand) para el store
de navegación (`store/useMundoNavigationStore.ts`). Instalar antes de copiar
los archivos:

```bash
npm install zustand
```

Verificado en sandbox: `zustand@5.0.14`, compila sin errores con
`tsc --strict`. No trae dependencias transitivas propias — no debería chocar
con versiones existentes de React/Next en el proyecto.

Confirmar instalación:
```bash
npm ls zustand
# └── zustand@5.x.x
```

## Qué se resolvió ya

- `store/useMundoNavigationStore.ts` — única fuente de verdad de navegación,
  con Zustand + middleware `persist` (antes: `tab` + `selectedId` +
  `mundoSection` + `openItem` + `requestedGrupoId` + `onItemCreated`,
  repartidos entre `editorGarlia.tsx` y `EditorMundo.tsx`, sincronizados con
  `setTimeout(0)`). `section` ahora admite `null` = "mostrando el menú".
- `store/useExternalCommandBridge.ts` — único puente con la paleta de comandos
  externa (antes: 5-6 `useEffect` con `window.addEventListener` sueltos).
- `shared/MundoMenu.tsx` — **ya no es un sidebar fijo**. Es la vista que
  ocupa el panel angosto (w-64) cuando no hay sección elegida, agrupada en
  5 categorías. Al elegir una sección, ese MISMO panel se convierte en la
  lista de esa sección — no se agrega una columna nueva al lado.
- `shared/SectionListHeader.tsx` — header con X (volver al menú) + buscador +
  botón crear, usado por las secciones con lista propia (personajes,
  criaturas, items, reinos, ciudades, notas).
- `shared/FloatingBackButton.tsx` — botón flotante con X, usado por las
  secciones "hoja" autocontenidas (capítulos, letras, mapa) que ya traen su
  propio layout interno y no admiten envolver con un header de columna.
- `shared/useCreateEntity.ts` / `shared/useWikilinkNavigate.ts` — lógica
  transversal, un solo lugar cada una.
- `EditorMundoRoot.tsx` — shell que reemplaza `editorGarlia.tsx` (823 líneas)
  + `EditorMundo.tsx` (2395 líneas) por ~170 líneas totales, con
  code-splitting por sección (`React.lazy`).
- `personajes/PersonajesSection.tsx` + `personajes/PersonajeEditor.tsx` —
  **patrón de referencia completo**, ya funcionando.

## Navegación: "un panel que se transforma"

Comportamiento pedido explícitamente: no hay sidebar fijo + columna de
contenido al lado. Hay un solo panel angosto (w-64) que cambia de contenido:

1. Al entrar, `section === null` → se muestra `<MundoMenu />` con las 12
   secciones agrupadas en 5 categorías.
2. Al tocar una categoría, `selectSection()` cambia `section` → ese MISMO
   panel se convierte en la lista de esa sección (con buscador + botón
   crear), y a la derecha aparece el editor de la entidad seleccionada.
3. Una X en la esquina de esa lista (o un botón flotante para las secciones
   autocontenidas) llama `goToMenu()` → vuelve a mostrar `<MundoMenu />` en
   el mismo espacio.

Agrupación de las 13 secciones (según lo pedido):
```
Entidades:     Personajes · Criaturas · Items
Geografía:     Mapa · Reinos · Ciudades
Historia:      Capítulos · Letras · Línea de Tiempo
Organización:  Grupos · Notas
Magia:         Hechizos · Runas · Dones
```

## Árbol completo entregado

```
features/mundo/
  EditorMundoRoot.tsx              — shell raíz, reemplaza editorGarlia.tsx + EditorMundo.tsx
  store/
    useMundoNavigationStore.ts     — estado de navegación (Zustand + persist), section: SectionKey | null
    useExternalCommandBridge.ts    — puente con paleta de comandos externa
  shared/
    MundoMenu.tsx                  — menú agrupado (5 categorías), reemplaza al sidebar fijo
    SectionListHeader.tsx          — header con X + buscador + crear, para secciones con lista propia
    FloatingBackButton.tsx         — X flotante para secciones autocontenidas
    useCreateEntity.ts             — crear entidad nueva y navegar a ella
    useWikilinkNavigate.ts         — resolver [[wikilinks]] del editor markdown
  personajes/
    PersonajesSection.tsx          — lista + búsqueda + creación
    PersonajeEditor.tsx            — envuelve EditorPersonaje.tsx existente
  criaturas/        (mismo patrón: Section + Editor envolviendo EditorCriatura.tsx)
  items/            (mismo patrón, envolviendo EditorItem.tsx)
  reinos/           (mismo patrón, envolviendo EditorReino.tsx)
  ciudades/         (mismo patrón, envolviendo EditorCiudad.tsx)
  grupos/
    GruposSection.tsx              — envuelve EditorGrupoStandalone + barra con X
  magia/
    MagiaSection.tsx               — tabs hechizos/dones/runas + X + EditorHechizos.tsx
  capitulos/
    CapitulosSection.tsx           — envuelve EstudioCapitulos + FloatingBackButton
  letras/
    LetrasSection.tsx              — envuelve EstudioLetras + FloatingBackButton
  notas/
    NotasSection.tsx               — UI nueva; antes vivía inline en EditorMundo.tsx
  mapa/
    MapaSection.tsx                — envuelve EditorMapa.tsx + FloatingBackButton
    LineaTiempoSection.tsx         — envuelve PanelHistoriaMundo + useMundoSecciones + FloatingBackButton (grupo Historia)
```

## Qué NO se tocó (se reutiliza tal cual, sin modificar)

- Todos los editores de entidad individual en `features/editorGarlia/views/`
  (`EditorPersonaje.tsx`, `EditorCriatura.tsx`, `EditorItem.tsx`,
  `EditorReino.tsx`, `EditorCiudad.tsx`, `EditorGrupo.tsx`, `EditorHechizos.tsx`,
  `EditorCapitulos.tsx`, `EditorLetras.tsx`, `EditorMapa.tsx`,
  `EditorLineaTiempo.tsx`) — ya estaban razonablemente bien factorizados por
  dentro; el rediseño cambia cómo se navega entre ellos, no su lógica interna.
- Todos los hooks de datos (`useSupabaseData`, `usePersonajeForm`, `useNotas`,
  `useMundoSecciones`, `useGrupos`, etc.)
- `features/garlia/` (la wiki pública de lectura) — es un feature separado,
  no relacionado al editor admin.

## Archivos viejos que quedan obsoletos (borrar cuando estés conforme)

- `features/editorGarlia/views/editorGarlia.tsx` (823 líneas, orquestador viejo)
- `features/editorGarlia/views/EditorMundo.tsx` (2395 líneas, panel único viejo)

No los borré automáticamente por si querés comparar comportamiento lado a
lado antes de eliminarlos. `app/myself/garlia/page.tsx` ya apunta al nuevo
`EditorMundoRoot`, así que dejar los archivos viejos sin importar en ningún
lado no rompe nada — son código muerto seguro de borrar cuando quieras.

## Instalación

```bash
npm install zustand
```

Después de copiar este `src/`, tu proyecto ya debería compilar apuntando al
nuevo editor.
