# Integración del Editor de Notas

## Archivos nuevos
- `EditorNota.tsx` — componente editor + lista de notas
- `useNotas.ts` — hook con Supabase + Dexie offline-first

---

## 1. Migración SQL (ejecutar en Supabase)

```sql
create table notas (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null default '',
  contenido   text,
  etiquetas   text,                   -- JSON array: '["idea","personaje"]'
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

---

## 2. Dexie — agregar tabla `notas`

En tu archivo donde declarás `db` (probablemente `lib/api/client/db.ts` o similar), agregá `notas` a la lista de tablas:

```ts
// En la definición de tu Dexie DB:
.stores({
  // ... tablas existentes ...
  notas: "id, titulo, updated_at",
})
```

---

## 3. `types.ts` — agregar el tipo `Nota`

Agregá al final del archivo (o donde están los otros tipos):

```ts
export type Nota = {
  id: string;
  titulo: string;
  contenido?: string;
  etiquetas?: string | null;
  created_at?: string;
  updated_at?: string;
};
```

---

## 4. `EditorMundo.tsx` — integrar notas en PanelListas

### 4a. Imports — agregar al tope

```tsx
import { useNotas } from "./useNotas";
import { EditorNota, ListaNotas } from "./EditorNota";
```

### 4b. En la función `PanelListas` — agregar estado y hook

Después de la línea `const { items: runas, ...` (cerca de línea 2032), agregar:

```tsx
const { notas, loading: loadingNotas, crear: crearNota, actualizar: actualizarNota, eliminar: eliminarNota } = useNotas();
const [searchNotas, setSearchNotas] = useState("");
const [selectedNota, setSelectedNota] = useState<import("./useNotas").Nota | null>(null);
```

### 4c. En `ListaTab` y `VALID_LISTA_TABS` — agregar "notas"

Cambiar:
```ts
type ListaTab = "reinos" | "criaturas" | "objetos" | "personajes" | "hechizos" | "dones" | "runas";
const VALID_LISTA_TABS: ListaTab[] = ["reinos", "criaturas", "objetos", "personajes", "hechizos", "dones", "runas"];
```
Por:
```ts
type ListaTab = "reinos" | "criaturas" | "objetos" | "personajes" | "hechizos" | "dones" | "runas" | "notas";
const VALID_LISTA_TABS: ListaTab[] = ["reinos", "criaturas", "objetos", "personajes", "hechizos", "dones", "runas", "notas"];
```

### 4d. En `searchMap` y `setSearchMap` — agregar notas

En el objeto `searchMap` (cerca de línea 2130):
```ts
const searchMap: Record<string, string> = {
  reinos: searchR, criaturas: searchC, objetos: searchO,
  personajes: searchP, hechizos: searchH, dones: searchD, runas: searchRu,
  notas: searchNotas,  // ← agregar
};
const setSearchMap: Record<string, (v: string) => void> = {
  reinos: setSearchR, criaturas: setSearchC, objetos: setSearchO,
  personajes: setSearchP, hechizos: setSearchH, dones: setSearchD, runas: setSearchRu,
  notas: setSearchNotas,  // ← agregar
};
```

### 4e. En `TAB_GROUPS` — agregar grupo Notas

Al final del array `TAB_GROUPS` (después del grupo "Magia"), agregar:

```tsx
{
  label: "Notas",
  tabs: [
    { key: "notas", label: "Notas", Icon: FileText, count: notas.length },
  ],
},
```

### 4f. En el `overlay` — agregar nota

Cambiar la definición del `overlay` para incluir `"nota"`:

```tsx
const overlay: "reino" | "criatura" | "objeto" | "personaje" | "hechizo" | "don" | "runa" | "nota" | null =
  selectedReino    ? "reino"    :
  selectedCriatura ? "criatura" :
  selectedObjeto   ? "objeto"   :
  selectedPersonaje? "personaje":
  selectedHechizo  ? "hechizo"  :
  selectedDon      ? "don"      :
  selectedRuna     ? "runa"     :
  selectedNota     ? "nota"     : null;
```

### 4g. En el botón "Volver a Listas" — agregar `setSelectedNota(null)`

```tsx
onClick={() => {
  setSelectedReino(null); setSelectedCriatura(null);
  setSelectedObjeto(null); setSelectedPersonaje(null);
  setSelectedHechizo(null); setSelectedDon(null); setSelectedRuna(null);
  setSelectedNota(null);  // ← agregar
}}
```

### 4h. En el overlay header — icono para nota

Dentro del bloque de íconos del overlay header, agregar:
```tsx
{overlay === "nota"     && <FileText  size={12} className="text-primary/40 shrink-0" />}
```
Y en el nombre:
```tsx
{selectedReino?.nombre ?? selectedCriatura?.nombre ?? selectedObjeto?.nombre ?? selectedPersonaje?.nombre ?? selectedHechizo?.nombre ?? selectedDon?.nombre ?? selectedRuna?.nombre ?? selectedNota?.titulo}
```

### 4i. En el contenido del overlay — renderizar EditorNota

Dentro del bloque `<div className="flex-1 flex min-h-0 overflow-hidden">` del overlay (donde están los otros editores), agregar:

```tsx
{overlay === "nota" && selectedNota && (
  <EditorNota
    key={selectedNota.id}
    nota={selectedNota}
    onSaved={async (updated) => {
      await actualizarNota(updated);
      setSelectedNota(updated);
    }}
    onDeleted={id => { eliminarNota(id); setSelectedNota(null); }}
  />
)}
```

### 4j. En el listado del tab notas — usar ListaNotas + split view

En la zona de listado (después del bloque de runas, cerca de línea 2480), agregar:

```tsx
{/* Notas — split view: lista izquierda + editor derecho */}
{mobileTab === "notas" && (
  <div className="absolute inset-0 flex overflow-hidden" style={{ zIndex: 10 }}>
    {/* Lista lateral */}
    <div className="w-56 shrink-0 border-r flex flex-col min-h-0"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
      <ListaNotas
        notas={notas}
        loading={loadingNotas}
        selectedId={selectedNota?.id ?? null}
        search={searchNotas}
        onSearch={setSearchNotas}
        onSelect={setSelectedNota}
        onNew={async () => {
          const nueva = await crearNota("Nueva nota");
          if (nueva) setSelectedNota(nueva);
        }}
      />
    </div>
    {/* Editor */}
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {selectedNota ? (
        <EditorNota
          key={selectedNota.id}
          nota={selectedNota}
          onSaved={async (updated) => { await actualizarNota(updated); setSelectedNota(updated); }}
          onDeleted={id => { eliminarNota(id); setSelectedNota(null); }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 h-full text-center">
          <FileText size={28} strokeWidth={1} className="text-primary/12" />
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/20">
            Seleccioná una nota o creá una nueva
          </p>
        </div>
      )}
    </div>
  </div>
)}
```

**Importante:** para que el `absolute` funcione, el contenedor padre con `className="flex-1 overflow-y-auto..."` (el div de listado) necesita ser `relative`. Cambiá:
```tsx
<div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3 space-y-0.5">
```
Por:
```tsx
<div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3 space-y-0.5 relative">
```

---

## 5. `SidebarComponents.tsx` — buscar notas + conectar botón

### 5a. Agregar `notas` al tipo `AllItems`

```ts
export type AllItems = {
  personajes: any[];
  criaturas:  any[];
  items:      any[];
  reinos:     any[];
  hechizos:   any[];
  dones:      any[];
  runas:      any[];
  notas:      any[];   // ← agregar
};
```

### 5b. En `GlobalSearchBar` — agregar resultado de búsqueda de notas

Dentro de `globalResults` o con un nuevo `useMemo`, agregar tipo `NotaResult`:

```tsx
type NotaResult = { item: any };

const notaResults = useMemo((): NotaResult[] => {
  const q = normalize(query.trim());
  if (!q) return [];
  return (allItems.notas ?? [])
    .filter((n: any) =>
      normalize(n.titulo ?? "").includes(q) ||
      normalize(n.contenido ?? "").includes(q) ||
      normalize(n.etiquetas ?? "").includes(q)
    )
    .map(item => ({ item }));
}, [allItems, query]);
```

### 5c. Agregar prop `onSelectNota` al `GlobalSearchBar`

```tsx
export function GlobalSearchBar({
  // ... props existentes ...
  onSelectNota?: (nota: any) => void;
}: {
  // ... tipos existentes ...
  onSelectNota?: (nota: any) => void;
})
```

### 5d. Handler para seleccionar nota

```tsx
const handleSelectNota = useCallback((nota: any) => {
  onSelectNota?.(nota);
  close();
  inputRef.current?.blur();
}, [onSelectNota, close]);
```

### 5e. Conectar botón "Nota" en `handleAddMagicWithModal`

El botón ya está en el `AddCommandMenu` con `key: "notas"`. Solo hay que conectarlo:

```tsx
const handleAddMagicWithModal = useCallback((key: MagicAddKey) => {
  if (key === "hechizos" || key === "dones" || key === "runas") {
    close();
    setMagicNombreModal(key);
  } else if (key === "notas") {
    close();
    onAddMagic?.("notas");   // el padre maneja la creación
  } else {
    onAddMagic?.(key);
  }
}, [onAddMagic, close]);
```

### 5f. Renderizar resultados de notas en el dropdown de búsqueda

Dentro del bloque de resultados (después de `magicResults`), agregar:

```tsx
{notaResults.length > 0 && (
  <>
    <div className="px-2 pt-3 pb-1">
      <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Notas</p>
    </div>
    <div className="space-y-0.5 mb-1">
      {notaResults.map(({ item }) => (
        <button
          key={item.id}
          onMouseDown={() => handleSelectNota(item)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 border border-transparent hover:bg-primary/6 hover:border-primary/10"
        >
          <div
            className="shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center"
            style={{
              background: "color-mix(in srgb, var(--primary) 7%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            <FileText size={12} className="text-primary/35" />
          </div>
          <span className="flex-1 text-[11px] font-bold text-primary/70 truncate">{item.titulo}</span>
          <span
            className="shrink-0 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
            style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
          >
            Nota
          </span>
        </button>
      ))}
    </div>
  </>
)}
```

---

## 6. Padre del sidebar — conectar `onAddMagic("notas")` y `onSelectNota`

En el componente que renderiza `GlobalSearchBar` (probablemente `page.tsx` o un `WorldbuildingLayout`), el handler `onAddMagic` ya debería manejar `"notas"`. Agregar el caso:

```tsx
const handleAddMagic = useCallback((key: MagicAddKey) => {
  if (key === "notas") {
    // Navegar a Listas → notas y crear una nueva
    setActiveTab("mundo");
    setActiveMundoSection("geografia");
    setInitialMundoTab("notas");
    // La creación real la maneja PanelListas cuando se monta
    setCrearNotaFlag(true);  // o usar un ref/callback según tu arquitectura
  }
  // ... otros casos existentes
}, [...]);
```

> **Alternativa más simple:** en vez de un flag, pasar `onAddMagic` hacia abajo hasta `PanelListas` como prop `onCreateNota?: () => void`, y allí dentro ejecutar `crearNota("Nueva nota").then(setSelectedNota)`.

---

## Resumen de archivos modificados

| Archivo | Cambios |
|---|---|
| `useNotas.ts` | **Nuevo** — hook CRUD notas |
| `EditorNota.tsx` | **Nuevo** — editor + lista |
| `types.ts` | Agregar tipo `Nota` |
| `EditorMundo.tsx` | Importar hooks/componentes, agregar tab "notas" en PanelListas, overlay "nota", split view |
| `SidebarComponents.tsx` | Agregar `notas` a `AllItems`, búsqueda, conectar botón Añadir Nota |
| `db.ts` (Dexie) | Agregar tabla `notas` |
| SQL | Crear tabla `notas` en Supabase |
