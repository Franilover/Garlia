"use client";

import {
  Bug,
  Plus,
  X,
  Trash2,
  Save,
  ChevronDown,
  Brain,
  Wand2,
  Package,
  Wrench,
  Layers,
  Users,
  MapPin,
  Globe,
  ExternalLink,
  Pencil,
  Search,
  UserCircle2,
  Sparkles,
  Star,
  Loader2,
  SlidersHorizontal,
  Camera,
} from "lucide-react";
import Image from "next/image";

import { useConfirm } from "@/components/ui/ConfirmModal";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";

import { useWikilink } from "../components/WikilinkContext";

async function loreReadRelaciones(
  tabla: string,
  personajeId: string,
  foreignKey: string,
): Promise<string[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    // Ajustado para buscar dinámicamente tanto por personaje_id como por criatura_id
    const searchKey = t.schema.indexes.some(
      (i: any) => i.name === "personaje_id",
    )
      ? "personaje_id"
      : "criatura_id";

    const rows = await t.where(searchKey).equals(personajeId).toArray();
    return rows.map((r: any) => r[foreignKey]);
  } catch {
    return [];
  }
}

async function loreSyncRelaciones(
  tabla: string,
  personajeId: string,
  foreignKey: string,
  remoteIds: string[],
): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    const searchKey = t.schema.indexes.some(
      (i: any) => i.name === "personaje_id",
    )
      ? "personaje_id"
      : "criatura_id";

    await t.where(searchKey).equals(personajeId).delete();
    for (const id of remoteIds) {
      await t.put({ [searchKey]: personajeId, [foreignKey]: id });
    }
  } catch (e) {
    console.error(`Error sincronizando relaciones locales en ${tabla}:`, e);
  }
}

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.put(row);
  } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.delete(id);
  } catch {}
}
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch {
    return [];
  }
}
async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local
      .map((r: any) => r.id)
      .filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}

// ─── Botón mobile para cambiar imagen de la criatura ─────────────────────────

function PickerImagenCriaturaBtn({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
                <Camera size={11} /> Imagen de la criatura
              </h3>
              <button
                className="text-primary/30 hover:text-primary transition-colors"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <SimpleImagePicker
              onClose={() => setOpen(false)}
              onSelect={(url) => {
                onChange(url);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
      <button
        className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-main/80 backdrop-blur-sm border border-primary/20 text-primary/50 hover:text-primary hover:bg-bg-main transition-all shadow-md"
        title="Cambiar imagen"
        onClick={() => setOpen(true)}
      >
        <Camera size={13} />
      </button>
    </>
  );
}

// ─── Singleton: catálogo de ítems ─────────────────────────────────────────────
// Compartido entre BloqueItemsNaturales y BloqueItemsCraftedos — un solo fetch
// aunque haya múltiples bloques montados (criatura base + variantes).
type ItemMin = { id: string; nombre: string; imagen_url?: string | null };
let _itemsData: ItemMin[] | null = null;
let _itemsPromise: Promise<ItemMin[]> | null = null;

async function fetchAllItems(): Promise<ItemMin[]> {
  if (_itemsData) return _itemsData;
  if (_itemsPromise) return _itemsPromise;

  _itemsPromise = (async () => {
    // 1. Dexie primero
    try {
      if (db) {
        const local = await db.items.orderBy("nombre").toArray();
        if (local.length > 0) {
          _itemsData = local as ItemMin[];
          // Refrescar en background
          if (navigator.onLine) {
            supabase
              .from("items")
              .select("id, nombre, imagen_url")
              .order("nombre")
              .then(({ data }) => {
                if (data && data.length > 0) _itemsData = data as ItemMin[];
              });
          }
          return _itemsData;
        }
      }
    } catch {}

    // 2. Supabase
    if (!navigator.onLine) return [];
    const { data } = await supabase
      .from("items")
      .select("id, nombre, imagen_url")
      .order("nombre");
    _itemsData = (data ?? []) as ItemMin[];
    return _itemsData;
  })().finally(() => {
    _itemsPromise = null;
  });

  return _itemsPromise;
}

// ─── Hook: items que crea una criatura ────────────────────────────────────────

type CraftedItem = {
  crafterId: string;
  itemId: string;
  itemName: string;
  itemImg?: string | null;
};

function useCraftedItems(criaturaId: string) {
  const [items, setItems] = useState<CraftedItem[]>([]);
  const [allItems, setAllItems] = useState<ItemMin[]>(_itemsData ?? []);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // Leer Dexie local + catálogo en paralelo
    const [localDrops, catalogResult] = await Promise.all([
      db
        ? db.item_crafteres
            .where("criatura_id")
            .equals(criaturaId)
            .toArray()
            .catch(() => [])
        : Promise.resolve([]),
      fetchAllItems(),
    ]);

    setAllItems(catalogResult);

    if (localDrops.length > 0) {
      const itemMap = Object.fromEntries(catalogResult.map((i) => [i.id, i]));
      setItems(
        localDrops.map((r: any) => ({
          crafterId: r.id,
          itemId: r.item_id,
          itemName: itemMap[r.item_id]?.nombre ?? "—",
          itemImg: itemMap[r.item_id]?.imagen_url ?? null,
        })),
      );
      setLoading(false);
    }

    // Fetch remoto
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("item_crafteres")
      .select(`id, item_id, items!item_id(nombre, imagen_url)`)
      .eq("criatura_id", criaturaId);

    const remoteItems: CraftedItem[] = (data ?? []).map((r: any) => ({
      crafterId: r.id,
      itemId: r.item_id,
      itemName:
        (Array.isArray(r.items) ? r.items[0]?.nombre : r.items?.nombre) ?? "—",
      itemImg:
        (Array.isArray(r.items)
          ? r.items[0]?.imagen_url
          : r.items?.imagen_url) ?? null,
    }));
    setItems(remoteItems);
    setLoading(false);

    // Sincronizar Dexie
    try {
      if (db) {
        await db.item_crafteres
          .where("criatura_id")
          .equals(criaturaId)
          .delete();
        if (remoteItems.length > 0) {
          await db.item_crafteres.bulkPut(
            remoteItems.map((i) => ({
              id: i.crafterId,
              criatura_id: criaturaId,
              item_id: i.itemId,
            })),
          );
        }
      }
    } catch {}
  }, [criaturaId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (item: ItemMin) => {
    if (items.some((i) => i.itemId === item.id)) return;
    // Optimista
    const tempId = `temp_${item.id}`;
    setItems((prev) => [
      ...prev,
      {
        crafterId: tempId,
        itemId: item.id,
        itemName: item.nombre,
        itemImg: item.imagen_url ?? null,
      },
    ]);

    const { data, error } = await supabase
      .from("item_crafteres")
      .insert([{ item_id: item.id, criatura_id: criaturaId }])
      .select()
      .single();

    if (!error && data) {
      setItems((prev) =>
        prev.map((i) =>
          i.crafterId === tempId ? { ...i, crafterId: data.id } : i,
        ),
      );
      try {
        if (db)
          await db.item_crafteres.put({
            id: data.id,
            criatura_id: criaturaId,
            item_id: item.id,
          });
      } catch {}
      await supabase
        .from("items")
        .update({ origen: "Artificial", sub_origen: null })
        .eq("id", item.id);
      {
        const _ch = new BroadcastChannel("item_origen_sync");
        _ch.postMessage({
          itemId: item.id,
          origen: "Artificial",
          sub_origen: null,
        });
        _ch.close();
      }
    } else {
      // Revertir optimista si falló
      setItems((prev) => prev.filter((i) => i.crafterId !== tempId));
    }
  };

  const remove = async (crafterId: string) => {
    // Optimista
    setItems((prev) => prev.filter((i) => i.crafterId !== crafterId));
    try {
      if (db) await db.item_crafteres.delete(crafterId);
    } catch {}
    await supabase.from("item_crafteres").delete().eq("id", crafterId);
  };

  return { items, allItems, loading, add, remove };
}

// ─── Hook: ítems naturales que dropea una criatura ────────────────────────────

type NaturalItem = {
  dropId: string;
  itemId: string;
  itemName: string;
  itemImg?: string | null;
};

function useNaturalItems(criaturaId: string, varianteId?: string | null) {
  const [items, setItems] = useState<NaturalItem[]>([]);
  const [allItems, setAllItems] = useState<ItemMin[]>(_itemsData ?? []);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // Leer Dexie local + catálogo en paralelo
    const localDropsPromise = db
      ? db.criatura_drops
          .where("criatura_id")
          .equals(criaturaId)
          .toArray()
          .then((rows) =>
            rows.filter((r: any) =>
              varianteId ? r.variante_id === varianteId : !r.variante_id,
            ),
          )
          .catch(() => [] as any[])
      : Promise.resolve([] as any[]);

    const [localDrops, catalogResult] = await Promise.all([
      localDropsPromise,
      fetchAllItems(),
    ]);

    setAllItems(catalogResult);

    if (localDrops.length > 0) {
      const itemMap = Object.fromEntries(catalogResult.map((i) => [i.id, i]));
      setItems(
        localDrops.map((r: any) => ({
          dropId: r.id,
          itemId: r.item_id,
          itemName: itemMap[r.item_id]?.nombre ?? "—",
          itemImg: itemMap[r.item_id]?.imagen_url ?? null,
        })),
      );
      setLoading(false);
    }

    // Fetch remoto
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("criatura_drops")
      .select(`id, item_id, items!item_id(nombre, imagen_url)`)
      .eq("criatura_id", criaturaId);
    query = varianteId
      ? query.eq("variante_id", varianteId)
      : query.is("variante_id", null);

    const { data } = await query;

    const remoteItems: NaturalItem[] = (data ?? []).map((r: any) => ({
      dropId: r.id,
      itemId: r.item_id,
      itemName:
        (Array.isArray(r.items) ? r.items[0]?.nombre : r.items?.nombre) ?? "—",
      itemImg:
        (Array.isArray(r.items)
          ? r.items[0]?.imagen_url
          : r.items?.imagen_url) ?? null,
    }));
    setItems(remoteItems);
    setLoading(false);

    // Sincronizar Dexie
    try {
      if (db) {
        const existing = await db.criatura_drops
          .where("criatura_id")
          .equals(criaturaId)
          .filter((r: any) =>
            varianteId ? r.variante_id === varianteId : !r.variante_id,
          )
          .primaryKeys();
        if (existing.length > 0)
          await db.criatura_drops.bulkDelete(existing as string[]);
        if (remoteItems.length > 0) {
          await db.criatura_drops.bulkPut(
            remoteItems.map((i) => ({
              id: i.dropId,
              criatura_id: criaturaId,
              item_id: i.itemId,
              variante_id: varianteId ?? null,
            })),
          );
        }
      }
    } catch {}
  }, [criaturaId, varianteId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (item: ItemMin) => {
    if (items.some((i) => i.itemId === item.id)) return;
    // Optimista
    const tempId = `temp_${item.id}`;
    setItems((prev) => [
      ...prev,
      {
        dropId: tempId,
        itemId: item.id,
        itemName: item.nombre,
        itemImg: item.imagen_url ?? null,
      },
    ]);

    const { data, error } = await supabase
      .from("criatura_drops")
      .insert([
        {
          item_id: item.id,
          criatura_id: criaturaId,
          variante_id: varianteId ?? null,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setItems((prev) =>
        prev.map((i) => (i.dropId === tempId ? { ...i, dropId: data.id } : i)),
      );
      try {
        if (db)
          await db.criatura_drops.put({
            id: data.id,
            criatura_id: criaturaId,
            item_id: item.id,
            variante_id: varianteId ?? null,
          });
      } catch {}
      await supabase
        .from("items")
        .update({ origen: "Natural", sub_origen: "Criatura" })
        .eq("id", item.id);
      {
        const _ch = new BroadcastChannel("item_origen_sync");
        _ch.postMessage({
          itemId: item.id,
          origen: "Natural",
          sub_origen: "Criatura",
        });
        _ch.close();
      }
    } else {
      setItems((prev) => prev.filter((i) => i.dropId !== tempId));
    }
  };

  const remove = async (dropId: string) => {
    // Optimista
    setItems((prev) => prev.filter((i) => i.dropId !== dropId));
    try {
      if (db) await db.criatura_drops.delete(dropId);
    } catch {}
    await supabase.from("criatura_drops").delete().eq("id", dropId);
  };

  return { items, allItems, loading, add, remove };
}

// ─── Bloque de ítems naturales (drops base de la criatura) ────────────────────

function BloqueItemsNaturales({
  criaturaId,
  varianteId,
  onSelectItem,
}: {
  criaturaId: string;
  varianteId?: string | null;
  onSelectItem?: (itemId: string) => void;
}) {
  const { items, allItems, loading, add, remove } = useNaturalItems(
    criaturaId,
    varianteId,
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = allItems.filter(
    (it) =>
      it.nombre.toLowerCase().includes(search.toLowerCase()) &&
      !items.some((ni) => ni.itemId === it.id),
  );

  if (loading)
    return (
      <div className="flex items-center gap-1.5 py-1">
        <span className="text-[9px] text-primary/20 italic">Cargando…</span>
      </div>
    );

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-[9px] text-primary/20 italic py-2">
          Sin ítems naturales
        </p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {items.map((it) => (
            <div key={it.dropId} className="relative group">
              <button
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 4%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
                onClick={() => onSelectItem?.(it.itemId)}
              >
                <div className="shrink-0 w-7 h-7 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {it.itemImg ? (
                    <Image
                      alt={it.itemName}
                      className="w-full h-full object-cover"
                      src={it.itemImg}
                    />
                  ) : (
                    <Package className="text-primary/20" size={11} />
                  )}
                </div>
                <span className="flex-1 text-[10px] font-bold text-primary/65 truncate leading-tight">
                  {it.itemName}
                </span>
              </button>
              <button
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 border border-red-500/20 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(it.dropId);
                }}
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <button
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-primary/15 text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary/60 hover:border-primary/30 transition-all cursor-pointer"
          onClick={() => setOpen((o) => !o)}
        >
          <Plus size={9} /> Añadir ítem
        </button>
        {open && (
          <div
            className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl shadow-xl overflow-hidden"
            style={{
              background: "var(--bg-main)",
              border:
                "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
          >
            <div
              className="p-1.5 border-b"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 8%, transparent)",
              }}
            >
              <input
                autoFocus
                className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5"
                placeholder="Buscar ítem…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-[9px] text-primary/25 italic text-center py-3">
                  Sin resultados
                </p>
              )}
              {filtered.map((it) => (
                <button
                  key={it.id}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/5 transition-colors text-left cursor-pointer"
                  onClick={() => {
                    add(it);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="shrink-0 w-5 h-5 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                    {it.imagen_url ? (
                      <Image
                        alt={it.nombre}
                        className="w-full h-full object-cover"
                        src={it.imagen_url}
                      />
                    ) : (
                      <Package className="text-primary/20" size={8} />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-primary/65 truncate">
                    {it.nombre}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bloque de ítems que crea una criatura ────────────────────────────────────

function BloqueItemsCraftedos({
  criaturaId,
  onSelectItem,
}: {
  criaturaId: string;
  onSelectItem?: (itemId: string) => void;
}) {
  const { items, allItems, loading, add, remove } = useCraftedItems(criaturaId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = allItems.filter(
    (it) =>
      it.nombre.toLowerCase().includes(search.toLowerCase()) &&
      !items.some((ci) => ci.itemId === it.id),
  );

  if (loading)
    return (
      <div className="flex items-center gap-1.5 py-1">
        <span className="text-[9px] text-primary/20 italic">Cargando…</span>
      </div>
    );

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-[9px] text-primary/20 italic py-2">
          Sin ítems creados
        </p>
      )}

      {/* Grid de 2 columnas */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {items.map((it) => (
            <div key={it.crafterId} className="relative group">
              {/* Tarjeta clickeable */}
              <button
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 4%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
                onClick={() => onSelectItem?.(it.itemId)}
              >
                <div className="shrink-0 w-7 h-7 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {it.itemImg ? (
                    <Image
                      alt={it.itemName}
                      className="w-full h-full object-cover"
                      src={it.itemImg}
                    />
                  ) : (
                    <Package className="text-primary/20" size={11} />
                  )}
                </div>
                <span className="flex-1 text-[10px] font-bold text-primary/65 truncate leading-tight">
                  {it.itemName}
                </span>
              </button>

              {/* Botón quitar flotante */}
              <button
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 border border-red-500/20 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(it.crafterId);
                }}
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown para añadir */}
      <div className="relative">
        <button
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-primary/15 text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary/60 hover:border-primary/30 transition-all cursor-pointer"
          onClick={() => setOpen((o) => !o)}
        >
          <Plus size={9} /> Añadir ítem
        </button>
        {open && (
          <div
            className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl shadow-xl overflow-hidden"
            style={{
              background: "var(--bg-main)",
              border:
                "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
          >
            <div
              className="p-1.5 border-b"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 8%, transparent)",
              }}
            >
              <input
                autoFocus
                className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5"
                placeholder="Buscar ítem…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-[9px] text-primary/25 italic text-center py-3">
                  Sin resultados
                </p>
              )}
              {filtered.map((it) => (
                <button
                  key={it.id}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/5 transition-colors text-left cursor-pointer"
                  onClick={() => {
                    add(it);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="shrink-0 w-5 h-5 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                    {it.imagen_url ? (
                      <Image
                        alt={it.nombre}
                        className="w-full h-full object-cover"
                        src={it.imagen_url}
                      />
                    ) : (
                      <Package className="text-primary/20" size={8} />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-primary/65 truncate">
                    {it.nombre}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campo colapsable ─────────────────────────────────────────────────────────

function CampoLore({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
  icon: Icon,
  entities = [],
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  icon?: React.ElementType;
  entities?: WikiEntity[];
}) {
  const [open, setOpen] = useState(!!value);
  const { onSnippetAction } = useWikilink();
  const preview = value
    .replace(/[#*`_~\[\]]/g, "")
    .trim()
    .slice(0, 80);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/3 cursor-pointer"
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        {Icon && <Icon className="shrink-0 text-primary/35" size={12} />}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/40">
            {label}
          </p>
          {!open && preview && (
            <p className="text-[11px] text-primary/35 truncate mt-0.5 font-medium italic">
              {preview}…
            </p>
          )}
          {!open && !preview && (
            <p className="text-[10px] text-primary/20 mt-0.5 italic">
              {placeholder?.slice(0, 55)}…
            </p>
          )}
        </div>
        <ChevronDown
          className="shrink-0 text-primary/25 transition-transform duration-200"
          size={13}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1">
          <MarkdownEditor
            toolbar
            defaultMode="edit"
            entities={entities}
            placeholder={placeholder}
            rows={rows}
            value={value}
            onChange={onChange}
            onSnippetAction={onSnippetAction}
          />
        </div>
      )}
    </div>
  );
}

// ─── Tipo extendido localmente (GrupoMin + subtipo) ──────────────────────────
type GrupoMinExt = GrupoMin & { subtipo?: string | null };

function BloqueGrupoCategoria({
  label,
  subtipo,
  icon: Icon,
  gruposActuales,
  todosGrupos,
  onAdd,
  onRemove,
  onSelectGrupo,
}: {
  label: string;
  subtipo: string;
  icon: React.ElementType;
  gruposActuales: GrupoMinExt[];
  todosGrupos: GrupoMinExt[];
  onAdd: (grupoId: string) => void;
  onRemove: (grupoId: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const gruposDeCat = todosGrupos.filter((g) => g.subtipo === subtipo);
  const actual = gruposActuales.filter((g) =>
    gruposDeCat.some((c) => c.id === g.id),
  );
  const disponibles = gruposDeCat.filter(
    (g) =>
      !gruposActuales.some((a) => a.id === g.id) &&
      g.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  const border =
    "1px solid color-mix(in srgb, var(--primary) 15%, transparent)";
  const borderFocus =
    "1px solid color-mix(in srgb, var(--primary) 35%, transparent)";

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={containerRef} className="space-y-1.5">
      {/* Filas de valores asignados */}
      {actual.length > 0 && (
        <div className="flex flex-col gap-1">
          {actual.map((g) => (
            <div
              key={g.id}
              className="w-full flex items-center rounded-[var(--radius-btn)] overflow-hidden transition-all"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 5%, transparent)",
                border,
              }}
            >
              {/* Click principal → navegar al grupo */}
              <button
                className="flex-1 flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase truncate transition-all hover:bg-primary/5 min-w-0"
                style={{ color: "var(--primary)" }}
                title="Ir al grupo"
                type="button"
                onClick={() => onSelectGrupo?.(g.id)}
              >
                <span className="truncate">{g.nombre}</span>
              </button>
              {/* Lápiz → abre el dropdown para cambiar */}
              <button
                className="shrink-0 flex items-center justify-center px-2.5 py-2 transition-all hover:bg-primary/10"
                style={{
                  borderLeft:
                    "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
                title="Cambiar"
                type="button"
                onClick={() => {
                  setOpen((o) => !o);
                  setSearch("");
                }}
              >
                <Pencil size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Trigger vacío */}
      {actual.length === 0 && (
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-btn)] text-[11px] font-bold transition-all"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border: open ? borderFocus : border,
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
          type="button"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="font-black uppercase text-[10px] tracking-wide">
            Sin asignar
          </span>
          <ChevronDown
            className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            size={12}
            style={{ opacity: 0.5 }}
          />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="rounded-[var(--radius-btn)] overflow-hidden"
          style={{
            border,
            background: "var(--bg-main)",
            boxShadow:
              "0 8px 24px color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {/* Buscador */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{
              borderBottom:
                "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            <Search
              size={11}
              style={{
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
                flexShrink: 0,
              }}
            />
            <input
              autoFocus
              className="flex-1 bg-transparent outline-none text-[11px] font-bold uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:tracking-normal"
              placeholder="Buscar…"
              style={{ color: "var(--primary)", caretColor: "var(--primary)" }}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Escape" && (setOpen(false), setSearch(""))
              }
            />
            {search && (
              <button
                className="opacity-30 hover:opacity-70 transition-opacity"
                type="button"
                onClick={() => setSearch("")}
              >
                <X size={10} style={{ color: "var(--primary)" }} />
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-48 overflow-y-auto">
            {/* Opción "quitar" si hay algo asignado */}
            {actual.length > 0 && (
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/5"
                style={{
                  color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
                type="button"
                onMouseDown={() => {
                  actual.forEach((g) => onRemove(g.id));
                  setOpen(false);
                  setSearch("");
                }}
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <X className="opacity-50" size={9} />
                </span>
                Sin asignar
              </button>
            )}

            {gruposDeCat.length === 0 ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">
                No hay grupos de «{label}» creados
              </p>
            ) : disponibles.length === 0 && actual.length === 0 ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">
                {search ? `Sin resultados para "${search}"` : "Todos asignados"}
              </p>
            ) : (
              disponibles.map((g) => (
                <button
                  key={g.id}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/6"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 50%, transparent)",
                  }}
                  type="button"
                  onMouseDown={() => {
                    onAdd(g.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="truncate">{g.nombre}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BloqueGruposCriatura ─────────────────────────────────────────────────────
// Muestra a qué grupos pertenece la criatura y permite añadir/quitar.
// Es la mitad del enlace bidireccional: el grupo almacena miembro_ids,
// y desde aquí actualizamos esos arrays directamente en Supabase.

function BloqueGruposCriatura({
  gruposActuales,
  todosGrupos,
  onAdd,
  onRemove,
  onSelectGrupo,
}: {
  gruposActuales: GrupoMin[];
  todosGrupos: GrupoMin[];
  onAdd: (grupoId: string) => void;
  onRemove: (grupoId: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const disponibles = useMemo(
    () =>
      todosGrupos.filter(
        (g) =>
          !gruposActuales.some((a) => a.id === g.id) &&
          g.nombre.toLowerCase().includes(search.toLowerCase()),
      ),
    [todosGrupos, gruposActuales, search],
  );

  if (todosGrupos.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 flex items-center gap-1">
        <Layers size={9} /> Grupos
      </label>

      {/* Chips de grupos actuales */}
      {gruposActuales.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {gruposActuales.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg border text-[10px] font-bold"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 6%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--primary) 15%, transparent)",
                color: "var(--primary)",
              }}
            >
              <button
                className="hover:underline cursor-pointer text-left leading-none"
                title="Ir al grupo"
                type="button"
                onClick={() => onSelectGrupo?.(g.id)}
              >
                {g.nombre}
              </button>
              <button
                className="w-3.5 h-3.5 rounded flex items-center justify-center text-primary/30 hover:text-red-400 transition-colors cursor-pointer"
                type="button"
                onClick={() => onRemove(g.id)}
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown añadir */}
      <div className="relative">
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
            color: "color-mix(in srgb, var(--primary) 35%, transparent)",
          }}
          type="button"
          onClick={() => setOpen((o) => !o)}
        >
          <Plus size={8} /> Añadir a grupo
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setOpen(false);
                setSearch("");
              }}
            />
            <div
              className="absolute z-50 top-full left-0 mt-1 w-52 rounded-xl border shadow-xl overflow-hidden"
              style={{
                background: "var(--bg-main)",
                borderColor:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
              }}
            >
              <div
                className="p-1.5 border-b"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <input
                  autoFocus
                  className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5"
                  placeholder="Buscar grupo…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="max-h-44 overflow-y-auto p-1">
                {disponibles.length === 0 ? (
                  <p className="text-[9px] text-primary/25 italic text-center py-3">
                    {search ? "Sin resultados" : "Ya está en todos los grupos"}
                  </p>
                ) : (
                  disponibles.map((g) => (
                    <button
                      key={g.id}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-primary/75 hover:bg-primary/6 hover:text-primary transition-colors truncate cursor-pointer"
                      type="button"
                      onMouseDown={() => {
                        onAdd(g.id);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      {g.nombre}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tipos mínimos ────────────────────────────────────────────────────────────
type ReinoMin = { id: string; nombre: string };
type CiudadMin2 = { id: string; nombre: string; reino_id: string | null };

// ─── Hook: reinos de la criatura (criatura_reinos) ────────────────────────────

function useCriaturaReinos(criaturaId: string) {
  type Row = { rowId: string; reinoId: string; reinoNombre: string };
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("criatura_reinos")
      .select("id, reino_id, reinos!reino_id(nombre)")
      .eq("criatura_id", criaturaId);
    setRows(
      (data ?? []).map((r: any) => ({
        rowId: r.id,
        reinoId: r.reino_id,
        reinoNombre:
          (Array.isArray(r.reinos) ? r.reinos[0]?.nombre : r.reinos?.nombre) ??
          "—",
      })),
    );
    setLoading(false);
  }, [criaturaId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (reino: ReinoMin) => {
    if (rows.some((r) => r.reinoId === reino.id)) return;
    const { data, error } = await supabase
      .from("criatura_reinos")
      .insert([{ criatura_id: criaturaId, reino_id: reino.id }])
      .select()
      .single();
    if (!error && data)
      setRows((prev) => [
        ...prev,
        { rowId: data.id, reinoId: reino.id, reinoNombre: reino.nombre },
      ]);
  };

  const remove = async (rowId: string) => {
    await supabase.from("criatura_reinos").delete().eq("id", rowId);
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  return { rows, loading, add, remove };
}

// ─── Hook: ciudades de la criatura (criatura_ciudades) ─────────────────────────

function useCriaturaCiudades(criaturaId: string) {
  type Row = {
    rowId: string;
    ciudadId: string;
    ciudadNombre: string;
    reinoId: string | null;
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("criatura_ciudades")
      .select("id, ciudad_id, ciudades!ciudad_id(nombre, reino_id)")
      .eq("criatura_id", criaturaId);
    setRows(
      (data ?? []).map((r: any) => {
        const l = Array.isArray(r.ciudades) ? r.ciudades[0] : r.ciudades;
        return {
          rowId: r.id,
          ciudadId: r.ciudad_id,
          ciudadNombre: l?.nombre ?? "—",
          reinoId: l?.reino_id ?? null,
        };
      }),
    );
    setLoading(false);
  }, [criaturaId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (ciudad: CiudadMin2) => {
    if (rows.some((r) => r.ciudadId === ciudad.id)) return;
    const { data, error } = await supabase
      .from("criatura_ciudades")
      .insert([{ criatura_id: criaturaId, ciudad_id: ciudad.id }])
      .select()
      .single();
    if (!error && data)
      setRows((prev) => [
        ...prev,
        {
          rowId: data.id,
          ciudadId: ciudad.id,
          ciudadNombre: ciudad.nombre,
          reinoId: ciudad.reino_id,
        },
      ]);
  };

  const remove = async (rowId: string) => {
    await supabase.from("criatura_ciudades").delete().eq("id", rowId);
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  return { rows, loading, add, remove };
}

// ─── BloqueHabitat ────────────────────────────────────────────────────────────

function BloqueHabitat({
  criaturaId,
  onNavigateCiudad,
  onNavigateReino,
}: {
  criaturaId: string;
  onNavigateCiudad?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
}) {
  const {
    rows: reinoRows,
    loading: loadingR,
    add: addReino,
    remove: removeReino,
  } = useCriaturaReinos(criaturaId);
  const {
    rows: ciudadRows,
    loading: loadingC,
    add: addCiudad,
    remove: removeCiudad,
  } = useCriaturaCiudades(criaturaId);

  const [allReinos, setAllReinos] = useState<ReinoMin[]>([]);
  const [allCiudades, setAllCiudades] = useState<CiudadMin2[]>([]);
  const [reinoFiltro, setReinoFiltro] = useState<string | null>(null); // reino_id activo
  const [openR, setOpenR] = useState(false);
  const [openL, setOpenL] = useState(false);
  const [searchR, setSearchR] = useState("");
  const [searchL, setSearchL] = useState("");

  useEffect(() => {
    supabase
      .from("reinos")
      .select("id, nombre")
      .order("nombre")
      .then(({ data }) => setAllReinos(data ?? []));
    supabase
      .from("ciudades")
      .select("id, nombre, reino_id")
      .order("nombre")
      .then(({ data }) =>
        setAllCiudades(
          (data ?? []).map((l: any) => ({
            ...l,
            reino_id: l.reino_id ?? null,
          })),
        ),
      );
  }, []);

  // Ciudades filtradas por reino activo (o sin reino si no hay activo)
  const ciudadesFiltradas = allCiudades.filter((l) =>
    reinoFiltro ? l.reino_id === reinoFiltro : true,
  );

  // Ciudades ya asignadas visibles según filtro actual
  const ciudadesAsignadas = ciudadRows.filter((r) =>
    reinoFiltro ? r.reinoId === reinoFiltro : true,
  );

  const reinosDisponibles = allReinos.filter(
    (r) =>
      r.nombre.toLowerCase().includes(searchR.toLowerCase()) &&
      !reinoRows.some((rr) => rr.reinoId === r.id),
  );

  const ciudadesDisponibles = ciudadesFiltradas.filter(
    (l) =>
      l.nombre.toLowerCase().includes(searchL.toLowerCase()) &&
      !ciudadRows.some((lr) => lr.ciudadId === l.id),
  );

  return (
    <div className="space-y-3">
      {/* ── Reinos ── */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25 flex items-center gap-1">
          <Globe size={9} /> Reinos
        </label>

        {loadingR ? (
          <p className="text-[9px] text-primary/20 italic">Cargando…</p>
        ) : (
          <>
            {reinoRows.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {reinoRows.map((r) => (
                  <div
                    key={r.rowId}
                    className="flex items-center gap-0.5 pl-2 pr-1 py-0.5 rounded-lg border text-[10px] font-bold transition-all"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 6%, transparent)",
                      borderColor:
                        "color-mix(in srgb, var(--primary) 15%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
                    <button
                      className="leading-none flex items-center gap-1 hover:underline transition-opacity"
                      style={{
                        cursor: "pointer",
                        opacity: reinoFiltro === r.reinoId ? 1 : 0.75,
                      }}
                      title={
                        reinoFiltro === r.reinoId
                          ? "Quitar filtro de ciudades"
                          : "Filtrar ciudades por este reino"
                      }
                      type="button"
                      onClick={() =>
                        setReinoFiltro((f) =>
                          f === r.reinoId ? null : r.reinoId,
                        )
                      }
                    >
                      {r.reinoNombre}
                      {reinoFiltro === r.reinoId && (
                        <X className="opacity-60" size={7} />
                      )}
                    </button>
                    {onNavigateReino && (
                      <button
                        className="w-3.5 h-3.5 rounded flex items-center justify-center text-primary/30 hover:text-primary/70 transition-colors"
                        title="Abrir reino"
                        type="button"
                        onClick={() => onNavigateReino(r.reinoId)}
                      >
                        <ExternalLink size={7} />
                      </button>
                    )}
                    <button
                      className="w-3.5 h-3.5 rounded flex items-center justify-center text-primary/30 hover:text-red-400 transition-colors"
                      type="button"
                      onClick={() => removeReino(r.rowId)}
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 18%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
                type="button"
                onClick={() => setOpenR((o) => !o)}
              >
                <Plus size={8} /> Añadir reino
              </button>
              {openR && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setOpenR(false);
                      setSearchR("");
                    }}
                  />
                  <div
                    className="absolute z-50 top-full left-0 mt-1 w-48 rounded-xl border shadow-xl overflow-hidden"
                    style={{
                      background: "var(--bg-main)",
                      borderColor:
                        "color-mix(in srgb, var(--primary) 12%, transparent)",
                    }}
                  >
                    <div
                      className="p-1.5 border-b"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--primary) 8%, transparent)",
                      }}
                    >
                      <input
                        autoFocus
                        className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5"
                        placeholder="Buscar reino…"
                        value={searchR}
                        onChange={(e) => setSearchR(e.target.value)}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto p-1">
                      {reinosDisponibles.length === 0 ? (
                        <p className="text-[9px] text-primary/25 italic text-center py-3">
                          Sin resultados
                        </p>
                      ) : (
                        reinosDisponibles.map((r) => (
                          <button
                            key={r.id}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-primary/75 hover:bg-primary/6 hover:text-primary transition-colors truncate cursor-pointer"
                            type="button"
                            onMouseDown={() => {
                              addReino(r);
                              setOpenR(false);
                              setSearchR("");
                            }}
                          >
                            {r.nombre}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Ciudades ── */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25 flex items-center gap-1.5">
          <MapPin size={9} />
          Ciudades
          {reinoFiltro && (
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "color-mix(in srgb, var(--primary) 60%, transparent)",
              }}
            >
              {reinoRows.find((r) => r.reinoId === reinoFiltro)?.reinoNombre}
            </span>
          )}
        </label>

        {loadingC ? (
          <p className="text-[9px] text-primary/20 italic">Cargando…</p>
        ) : (
          <>
            {ciudadesAsignadas.length === 0 && (
              <p className="text-[9px] text-primary/20 italic py-1">
                {reinoFiltro
                  ? "Sin ciudades en este reino"
                  : "Sin ciudades asignadas"}
              </p>
            )}
            {ciudadesAsignadas.length > 0 && (
              <div className="space-y-1">
                {ciudadesAsignadas.map((r) => (
                  <div
                    key={r.rowId}
                    className="relative group flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 4%, transparent)",
                      border:
                        "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                    }}
                  >
                    <button
                      className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer hover:text-primary transition-colors group/ciudad"
                      onClick={() => onNavigateCiudad?.(r.ciudadId)}
                    >
                      <MapPin
                        className="shrink-0 text-primary/30 group-hover/ciudad:text-primary/60 transition-colors"
                        size={9}
                      />
                      <span className="text-[10px] font-bold text-primary/65 truncate group-hover/ciudad:text-primary transition-colors underline-offset-2 group-hover/ciudad:underline">
                        {r.ciudadNombre}
                      </span>
                    </button>
                    <button
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded text-red-400/50 hover:text-red-400 cursor-pointer"
                      onClick={() => removeCiudad(r.rowId)}
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 18%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
                type="button"
                onClick={() => setOpenL((o) => !o)}
              >
                <Plus size={8} /> Añadir ciudad
              </button>
              {openL && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setOpenL(false);
                      setSearchL("");
                    }}
                  />
                  <div
                    className="absolute z-50 top-full left-0 mt-1 w-52 rounded-xl border shadow-xl overflow-hidden"
                    style={{
                      background: "var(--bg-main)",
                      borderColor:
                        "color-mix(in srgb, var(--primary) 12%, transparent)",
                    }}
                  >
                    <div
                      className="p-1.5 border-b"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--primary) 8%, transparent)",
                      }}
                    >
                      <input
                        autoFocus
                        className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5"
                        placeholder="Buscar ciudad…"
                        value={searchL}
                        onChange={(e) => setSearchL(e.target.value)}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto p-1">
                      {ciudadesDisponibles.length === 0 ? (
                        <p className="text-[9px] text-primary/25 italic text-center py-3">
                          Sin resultados
                        </p>
                      ) : (
                        ciudadesDisponibles.map((l) => (
                          <button
                            key={l.id}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-primary/75 hover:bg-primary/6 hover:text-primary transition-colors truncate cursor-pointer"
                            type="button"
                            onMouseDown={() => {
                              addCiudad(l);
                              setOpenL(false);
                              setSearchL("");
                            }}
                          >
                            {l.nombre}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tipos catálogo ───────────────────────────────────────────────────────────
type HechizoCat = { id: string; nombre: string; grupo_ids?: string[] };
type DonCat = { id: string; nombre: string; grupo_ids?: string[] };

// ─── Cache de catálogos ───────────────────────────────────────────────────────
let _hechizosData: HechizoCat[] | null = null;
let _hechizosPromise: Promise<HechizoCat[]> | null = null;
let _donesData: DonCat[] | null = null;
let _donesPromise: Promise<DonCat[]> | null = null;

async function fetchHechizos(): Promise<HechizoCat[]> {
  if (_hechizosData) return _hechizosData;
  if (_hechizosPromise) return _hechizosPromise;
  _hechizosPromise = (async () => {
    try {
      if (db) {
        const local =
          (await (db as any).hechizos?.orderBy("nombre").toArray()) ?? [];
        if (local.length > 0) {
          _hechizosData = local as HechizoCat[];
          if (navigator.onLine)
            supabase
              .from("hechizos")
              .select("id, nombre, grupo_ids")
              .order("nombre")
              .then(({ data }) => {
                if (data?.length) _hechizosData = data as HechizoCat[];
              });
          return _hechizosData;
        }
      }
    } catch {}
    if (!navigator.onLine) return [];
    const { data } = await supabase
      .from("hechizos")
      .select("id, nombre, grupo_ids")
      .order("nombre");
    _hechizosData = (data ?? []) as HechizoCat[];
    return _hechizosData;
  })().finally(() => {
    _hechizosPromise = null;
  });
  return _hechizosPromise;
}

async function fetchDones(): Promise<DonCat[]> {
  if (_donesData) return _donesData;
  if (_donesPromise) return _donesPromise;
  _donesPromise = (async () => {
    try {
      if (db) {
        const local =
          (await (db as any).dones?.orderBy("nombre").toArray()) ?? [];
        if (local.length > 0) {
          _donesData = local as DonCat[];
          if (navigator.onLine)
            supabase
              .from("dones")
              .select("id, nombre, grupo_ids")
              .order("nombre")
              .then(({ data }) => {
                if (data?.length) _donesData = data as DonCat[];
              });
          return _donesData;
        }
      }
    } catch {}
    if (!navigator.onLine) return [];
    const { data } = await supabase
      .from("dones")
      .select("id, nombre, grupo_ids")
      .order("nombre");
    _donesData = (data ?? []) as DonCat[];
    return _donesData;
  })().finally(() => {
    _donesPromise = null;
  });
  return _donesPromise;
}

function esCompatibleGrupo(
  grupoIds: string[] | undefined,
  gruposActuales: string[],
): boolean {
  if (!grupoIds || grupoIds.length === 0) return true;
  if (gruposActuales.length === 0) return false;
  return grupoIds.some((g) => gruposActuales.includes(g));
}

// ─── Hook hechizos de criatura ────────────────────────────────────────────────

function useHechizoCriatura(criaturaId: string) {
  const [catalogo, setCatalogo] = useState<HechizoCat[]>(_hechizosData ?? []);
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [cat, localIds] = await Promise.all([
      fetchHechizos(),
      loreReadRelaciones("personaje_hechizos", criaturaId, "hechizo_id").catch(
        () => [] as string[],
      ),
    ]);
    setCatalogo(cat);
    if (localIds.length > 0) setIds(localIds);
    if (navigator.onLine) {
      const { data } = await supabase
        .from("personaje_hechizos")
        .select("hechizo_id")
        .eq("personaje_id", criaturaId);
      const remote = (data ?? []).map((r: any) => r.hechizo_id as string);
      setIds(remote);
      await loreSyncRelaciones(
        "personaje_hechizos",
        criaturaId,
        "hechizo_id",
        remote,
      );
    }
    setLoading(false);
  }, [criaturaId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (id: string) => {
    setIds((prev) => {
      const next = [...prev, id];
      loreSyncRelaciones("personaje_hechizos", criaturaId, "hechizo_id", next);
      return next;
    });
    await supabase
      .from("personaje_hechizos")
      .insert({ personaje_id: criaturaId, hechizo_id: id });
  };
  const remove = async (id: string) => {
    setIds((prev) => {
      const next = prev.filter((x) => x !== id);
      loreSyncRelaciones("personaje_hechizos", criaturaId, "hechizo_id", next);
      return next;
    });
    await supabase
      .from("personaje_hechizos")
      .delete()
      .eq("personaje_id", criaturaId)
      .eq("hechizo_id", id);
  };

  return { catalogo, ids, loading, add, remove };
}

// ─── Hook dones de criatura (multi, igual que hechizos) ───────────────────────

function useDonCriatura(criaturaId: string) {
  const [catalogo, setCatalogo] = useState<DonCat[]>(_donesData ?? []);
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [cat, localIds] = await Promise.all([
      fetchDones(),
      loreReadRelaciones("personaje_dones", criaturaId, "don_id").catch(
        () => [] as string[],
      ),
    ]);
    setCatalogo(cat);
    if (localIds.length > 0) setIds(localIds);
    if (navigator.onLine) {
      const { data } = await supabase
        .from("personaje_dones")
        .select("don_id")
        .eq("personaje_id", criaturaId);
      const remote = (data ?? []).map((r: any) => r.don_id as string);
      setIds(remote);
      await loreSyncRelaciones("personaje_dones", criaturaId, "don_id", remote);
    }
    setLoading(false);
  }, [criaturaId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (id: string) => {
    setIds((prev) => {
      const next = [...prev, id];
      loreSyncRelaciones("personaje_dones", criaturaId, "don_id", next);
      return next;
    });
    await supabase
      .from("personaje_dones")
      .insert({ personaje_id: criaturaId, don_id: id });
  };
  const remove = async (id: string) => {
    setIds((prev) => {
      const next = prev.filter((x) => x !== id);
      loreSyncRelaciones("personaje_dones", criaturaId, "don_id", next);
      return next;
    });
    await supabase
      .from("personaje_dones")
      .delete()
      .eq("personaje_id", criaturaId)
      .eq("don_id", id);
  };

  return { catalogo, ids, loading, add, remove };
}

// ─── Helper: detecta si algún grupo del array es "mágico" ────────────────────
function normStr(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
function grupoEsMagico(grupos: { nombre: string }[]): boolean {
  return grupos.some((g) => normStr(g.nombre) === "magico");
}

// ─── Componente lista mágica (hechizos o dones) ───────────────────────────────
// Dos wrappers finos para evitar instanciar ambos hooks en cada montaje.

function BloqueMagico({
  label,
  icon: Icon,
  criaturaId,
  gruposActuales,
  usarHook,
}: {
  label: string;
  icon: React.ElementType;
  criaturaId: string;
  gruposActuales: string[];
  usarHook: "hechizos" | "dones";
}) {
  if (usarHook === "hechizos") {
    return (
      <BloqueMagicoHechizos
        criaturaId={criaturaId}
        gruposActuales={gruposActuales}
        icon={Icon}
        label={label}
      />
    );
  }
  return (
    <BloqueMagicoDones
      criaturaId={criaturaId}
      gruposActuales={gruposActuales}
      icon={Icon}
      label={label}
    />
  );
}

function BloqueMagicoHechizos({
  label,
  icon: Icon,
  criaturaId,
  gruposActuales,
}: {
  label: string;
  icon: React.ElementType;
  criaturaId: string;
  gruposActuales: string[];
}) {
  const { catalogo, ids, loading, add, remove } =
    useHechizoCriatura(criaturaId);
  return (
    <BloqueMagicoUI
      add={add}
      catalogo={catalogo}
      gruposActuales={gruposActuales}
      icon={Icon}
      ids={ids}
      label={label}
      loading={loading}
      remove={remove}
    />
  );
}

function BloqueMagicoDones({
  label,
  icon: Icon,
  criaturaId,
  gruposActuales,
}: {
  label: string;
  icon: React.ElementType;
  criaturaId: string;
  gruposActuales: string[];
}) {
  const { catalogo, ids, loading, add, remove } = useDonCriatura(criaturaId);
  return (
    <BloqueMagicoUI
      add={add}
      catalogo={catalogo}
      gruposActuales={gruposActuales}
      icon={Icon}
      ids={ids}
      label={label}
      loading={loading}
      remove={remove}
    />
  );
}

function BloqueMagicoUI({
  label,
  icon: Icon,
  catalogo,
  ids,
  loading,
  add,
  remove,
  gruposActuales,
}: {
  label: string;
  icon: React.ElementType;
  catalogo: (HechizoCat | DonCat)[];
  ids: string[];
  loading: boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  gruposActuales: string[];
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const compatibles = useMemo(
    () =>
      catalogo.filter((e) => esCompatibleGrupo(e.grupo_ids, gruposActuales)),
    [catalogo, gruposActuales],
  );
  const asignados = compatibles.filter((e) => ids.includes(e.id));
  const disponibles = compatibles
    .filter((e) => !ids.includes(e.id))
    .filter((e) => e.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col">
      {/* Cabecera */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{
          borderBottom:
            "1px solid color-mix(in srgb, var(--primary) 6%, transparent)",
        }}
      >
        <span
          className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest"
          style={{
            color: "color-mix(in srgb, var(--primary) 38%, transparent)",
          }}
        >
          <Icon size={9} /> {label}
        </span>
        <button
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md transition-all"
          style={{
            border: open
              ? "1px solid color-mix(in srgb, var(--primary) 28%, transparent)"
              : "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            background: open
              ? "color-mix(in srgb, var(--primary) 6%, transparent)"
              : "transparent",
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
          type="button"
          onClick={() => setOpen((o) => !o)}
        >
          {ids.length > 0 && (
            <span
              className="text-[7px] font-black tabular-nums"
              style={{ color: "var(--primary)" }}
            >
              {ids.length}
            </span>
          )}
          <ChevronDown
            className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            size={9}
          />
        </button>
      </div>

      {/* Dropdown búsqueda */}
      {open && (
        <div
          className="mx-2 mb-1.5 mt-1 rounded-lg overflow-hidden"
          style={{
            border:
              "1px solid color-mix(in srgb, var(--primary) 28%, transparent)",
            background: "var(--bg-main)",
            boxShadow:
              "0 6px 20px color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-1.5 px-2 py-1.5"
            style={{
              borderBottom:
                "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <Search
              size={9}
              style={{
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
                flexShrink: 0,
              }}
            />
            <input
              autoFocus
              className="flex-1 bg-transparent outline-none text-[9px] font-bold uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:tracking-normal placeholder:opacity-50"
              placeholder="Buscar…"
              style={{ color: "var(--primary)", caretColor: "var(--primary)" }}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="opacity-30 hover:opacity-70 transition-opacity"
                type="button"
                onClick={() => setSearch("")}
              >
                <X size={8} style={{ color: "var(--primary)" }} />
              </button>
            )}
          </div>
          <div className="max-h-36 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-3 text-primary/20">
                <Loader2 className="animate-spin" size={11} />
              </div>
            ) : disponibles.length === 0 ? (
              <p className="text-[8px] font-black uppercase text-primary/25 px-3 py-2.5 text-center tracking-widest">
                {search
                  ? "Sin resultados"
                  : gruposActuales.length === 0
                    ? "Sin grupos asignados"
                    : "Todos asignados"}
              </p>
            ) : (
              disponibles.map((e) => (
                <button
                  key={e.id}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-all hover:bg-primary/5"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 50%, transparent)",
                  }}
                  type="button"
                  onClick={() => {
                    add(e.id);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <span className="flex-1 min-w-0 text-[9px] font-black uppercase tracking-wide truncate">
                    {e.nombre}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Lista asignados */}
      {asignados.length === 0 && !open ? (
        <div className="flex items-center gap-2 px-3 py-2 opacity-35">
          <Icon
            size={14}
            strokeWidth={1}
            style={{
              color: "color-mix(in srgb, var(--primary) 40%, transparent)",
            }}
          />
          <p
            className="text-[8px] font-black uppercase tracking-widest"
            style={{
              color: "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
          >
            Sin {label.toLowerCase()}
          </p>
        </div>
      ) : (
        asignados.map((e) => (
          <div
            key={e.id}
            className="group flex items-center gap-2 px-3 py-1.5 transition-all hover:bg-primary/5"
          >
            <span
              className="flex-1 min-w-0 text-[10px] font-black uppercase tracking-wide truncate"
              style={{
                color: "color-mix(in srgb, var(--primary) 65%, transparent)",
              }}
            >
              {e.nombre}
            </span>
            <button
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-red-500/10"
              style={{
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
              type="button"
              onClick={() => remove(e.id)}
            >
              <X size={9} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// ─── EditorCriatura ───────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useMemo } from "react";

import {
  MarkdownEditor,
  WikiEntity,
} from "@/components/forms/Markdown/MarkdownEditor";
import SimpleImagePicker from "@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

import { useGruposDeCriatura, type GrupoMin } from "../components/hooks";
import { type Criatura, type SaveStatus } from "../components/types";
import { SelectorImagen, SaveIndicator } from "../components/UIComponents";

export function EditorCriatura({
  item,
  onSaved,
  onDeleted,
  entities = [],
  onSelectItem,
  onSelectPersonaje,
  onSelectGrupo,
  onNavigateCiudad,
  onNavigateReino,
}: {
  item: Criatura;
  onSaved: (c: Criatura) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onSelectItem?: (itemId: string) => void;
  onSelectPersonaje?: (personajeId: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
  onNavigateCiudad?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
}) {
  const [form, setForm] = useState<Criatura>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();

  // Grupos de criaturas a los que pertenece esta criatura (sincronización bidireccional)
  const {
    grupos: gruposActuales,
    todosGrupos,
    addToGrupo,
    removeFromGrupo,
  } = useGruposDeCriatura(form.id);
  // ── Personajes: hook local con toggle ─────────────────────────────────────
  const [personajesDeEspecie, setPersonajesDeEspecie] = useState<
    { id: string; nombre: string; img_url?: string | null }[]
  >([]);
  const [loadingPersonajes, setLoadingPersonajes] = useState(true);
  const [savingPersonajes, setSavingPersonajes] = useState(false);

  useEffect(() => {
    setLoadingPersonajes(true);
    supabase
      .from("personajes")
      .select("id, nombre, img_url")
      .eq("especie", item.nombre)
      .order("nombre")
      .then(({ data }) => {
        setPersonajesDeEspecie(data ?? []);
        setLoadingPersonajes(false);
      });
  }, [item.nombre]);

  const handleTogglePersonaje = async (id: string, add: boolean) => {
    setSavingPersonajes(true);
    if (add) {
      await supabase
        .from("personajes")
        .update({ especie: form.nombre })
        .eq("id", id);
      const p = allPersonajes.find((p) => p.id === id);
      if (p) setPersonajesDeEspecie((prev) => [...prev, p]);
    } else {
      await supabase.from("personajes").update({ especie: null }).eq("id", id);
      setPersonajesDeEspecie((prev) => prev.filter((p) => p.id !== id));
    }
    setSavingPersonajes(false);
  };

  // ── Datos para la barra lateral ────────────────────────────────────────────
  const [allPersonajes, setAllPersonajes] = useState<
    { id: string; nombre: string; img_url?: string | null }[]
  >([]);
  const [allReinos, setAllReinos] = useState<{ id: string; nombre: string }[]>(
    [],
  );

  const {
    rows: reinoRows,
    loading: loadingReinos,
    add: addReinoSidebar,
    remove: removeReinoSidebar,
  } = useCriaturaReinos(form.id);

  const {
    rows: ciudadRows,
    loading: loadingCiudades,
    add: addCiudadSidebar,
    remove: removeCiudadSidebar,
  } = useCriaturaCiudades(form.id);

  const {
    items: craftedItems,
    allItems: allCraftedItems,
    loading: loadingCrafted,
    add: addCraftedSidebar,
    remove: removeCraftedSidebar,
  } = useCraftedItems(form.id);

  const [savingReinos, setSavingReinos] = useState(false);
  const [savingCiudades, setSavingCiudades] = useState(false);
  const [savingCrafted, setSavingCrafted] = useState(false);
  const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

  const [allCiudades, setAllCiudades] = useState<CiudadMin2[]>([]);

  useEffect(() => {
    supabase
      .from("personajes")
      .select("id, nombre, img_url")
      .order("nombre")
      .then(({ data }) => setAllPersonajes(data ?? []));
    supabase
      .from("reinos")
      .select("id, nombre")
      .order("nombre")
      .then(({ data }) => setAllReinos(data ?? []));
    supabase
      .from("ciudades")
      .select("id, nombre, reino_id")
      .order("nombre")
      .then(({ data }) =>
        setAllCiudades(
          (data ?? []).map((l: any) => ({
            ...l,
            reino_id: l.reino_id ?? null,
          })),
        ),
      );
  }, []);

  // ── Ciudades con reino → filtradas a los reinos seleccionados ────────────────
  // Las ciudades sin reino no se muestran en ningún lado.
  const reinosSeleccionadosIds = reinoRows.map((r) => r.reinoId);
  const ciudadesConReino = allCiudades.filter(
    (l) =>
      l.reino_id !== null &&
      (reinosSeleccionadosIds.length === 0 ||
        reinosSeleccionadosIds.includes(l.reino_id)),
  );

  const handleToggleReino = async (id: string, add: boolean) => {
    setSavingReinos(true);
    const reino = allReinos.find((r) => r.id === id);
    if (add && reino) await addReinoSidebar(reino);
    else {
      const row = reinoRows.find((r) => r.reinoId === id);
      if (row) await removeReinoSidebar(row.rowId);
    }
    setSavingReinos(false);
  };

  const handleToggleCiudad = async (id: string, add: boolean) => {
    setSavingCiudades(true);
    if (add) {
      const ciudad = allCiudades.find((l) => l.id === id);
      if (ciudad) await addCiudadSidebar(ciudad);
    } else {
      const row = ciudadRows.find((r) => r.ciudadId === id);
      if (row) await removeCiudadSidebar(row.rowId);
    }
    setSavingCiudades(false);
  };

  const handleToggleCrafted = async (id: string, add: boolean) => {
    setSavingCrafted(true);
    if (add) {
      const item = allCraftedItems.find((i) => i.id === id);
      if (item) await addCraftedSidebar(item);
    } else {
      const crafted = craftedItems.find((i) => i.itemId === id);
      if (crafted) await removeCraftedSidebar(crafted.crafterId);
    }
    setSavingCrafted(false);
  };

  useEffect(() => {
    setForm(item);
    setStatus("idle");
  }, [item.id]);

  const field =
    (k: keyof Criatura) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase
        .from("criaturas")
        .update({
          nombre: form.nombre,
          imagen_url: form.imagen_url || null,
          descripcion: form.descripcion,
          habitat: form.habitat,
          pensamiento: form.pensamiento,
          alma: form.alma,
          biologia: form.biologia,
          relacion: form.relacion,
          comportamiento: form.comportamiento,
          magia: form.magia,
        })
        .eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("criaturas", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const del = async () => {
    const ok = await confirm({
      message: `¿Eliminar a "${form.nombre}"?`,
      danger: true,
    });
    if (!ok) return;
    await supabase.from("criaturas").delete().eq("id", form.id);
    void dexieDel("criaturas", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      <ConfirmModal />

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ── Header compacto ──────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 2%, transparent)",
          }}
        >
          {/* Avatar */}
          <div className="shrink-0 w-7 h-7 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
            {form.imagen_url ? (
              <Image
                alt={form.nombre}
                className="w-full h-full object-cover"
                src={form.imagen_url}
              />
            ) : (
              <Bug className="text-primary/25" size={13} />
            )}
          </div>

          <input
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
            placeholder="Nombre de la criatura"
            value={form.nombre ?? ""}
            onChange={field("nombre")}
          />

          <div className="shrink-0 flex items-center gap-1.5">
            <SaveIndicator status={status} />
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
              onClick={del}
            >
              <Trash2 size={9} />
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              disabled={status === "saving"}
              onClick={save}
            >
              <Save size={10} /> Guardar
            </button>
            <button
              className="sm:hidden flex items-center justify-center p-1.5 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all border border-primary/10"
              title="Entidades"
              onClick={() => setMobileAsideOpen(true)}
            >
              <SlidersHorizontal size={12} />
            </button>
          </div>
        </div>

        {/* ── Contenido superior ───────────────────────────────────────────── */}
        <div
          className="flex-1 min-h-0 p-3 flex flex-col gap-3 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Imagen + Descripción */}
          <div className="flex gap-3">
            <div className="hidden sm:block shrink-0 w-36">
              <SelectorImagen
                aspect="square"
                label=""
                placeholder={<Bug className="opacity-20" size={20} />}
                value={form.imagen_url ?? ""}
                onChange={(url) => setForm((f) => ({ ...f, imagen_url: url }))}
              />
            </div>
            <div className="sm:hidden shrink-0 relative w-24 h-24 rounded-xl overflow-hidden border border-primary/10 bg-primary/3">
              {form.imagen_url ? (
                <Image
                  alt={form.nombre}
                  className="w-full h-full object-cover"
                  src={form.imagen_url}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Bug className="text-primary/15" size={32} />
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 z-10">
                <PickerImagenCriaturaBtn
                  value={form.imagen_url ?? ""}
                  onChange={(url) =>
                    setForm((f) => ({ ...f, imagen_url: url }))
                  }
                />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <label className="text-[8px] font-black uppercase tracking-[0.25em] text-primary/30">
                Descripción
              </label>
              <MarkdownEditor
                toolbar
                defaultMode="edit"
                entities={entities}
                placeholder="Aspecto físico general…"
                rows={6}
                value={form.descripcion ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}
                onSnippetAction={onSnippetAction}
              />
            </div>
          </div>

          {/* Clasificación */}
          <div
            className="rounded-xl p-2.5"
            style={{
              background: "color-mix(in srgb, var(--primary) 2%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <p className="text-[7.5px] font-black uppercase tracking-[0.28em] text-primary/25 mb-2 px-0.5">
              Clasificación
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  { label: "Hábitat", subtipo: "Hábitat", icon: Globe },
                  {
                    label: "Inteligencia",
                    subtipo: "Inteligencia",
                    icon: Brain,
                  },
                  { label: "Alma", subtipo: "Alma", icon: Wand2 },
                  { label: "Usar Mana", subtipo: "Usar Mana", icon: Sparkles },
                  {
                    label: "Produce Mana",
                    subtipo: "Produce Mana",
                    icon: Star,
                  },
                ] as const
              ).map(({ label, subtipo, icon }) => (
                <div key={subtipo} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-primary/30 mb-0.5">
                    {React.createElement(icon, { size: 7 })} {label}
                  </span>
                  <BloqueGrupoCategoria
                    gruposActuales={gruposActuales as GrupoMinExt[]}
                    icon={icon}
                    label={label}
                    subtipo={subtipo}
                    todosGrupos={todosGrupos as GrupoMinExt[]}
                    onAdd={addToGrupo}
                    onRemove={removeFromGrupo}
                    onSelectGrupo={onSelectGrupo}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BARRA DE ENTIDADES — fila horizontal inferior ────────────────── */}
        <div
          className="shrink-0 hidden sm:flex border-t overflow-y-auto"
          style={{
            maxHeight: "60vh",
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 1.5%, transparent)",
          }}
        >
          {/* Personajes - se expande, mas columnas */}
          <div
            className="flex-1 flex flex-col min-w-0 border-r"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <SeccionEntidad
              allEntities={allPersonajes.map((p) => ({
                id: p.id,
                nombre: p.nombre,
                imagen_url: p.img_url,
              }))}
              columns={8}
              emptyLabel="Sin personajes"
              fallbackIcon={<UserCircle2 size={14} strokeWidth={1} />}
              fill={false}
              icon={<Users size={9} />}
              label="Personajes"
              loading={loadingPersonajes}
              saving={savingPersonajes}
              selectedIds={personajesDeEspecie.map((p) => p.id)}
              onEntityClick={(id) => onSelectPersonaje?.(id)}
              onToggle={handleTogglePersonaje}
            />
          </div>

          {/* Territorio - se ensancha según el contenido */}
          <div
            className="shrink-0 flex flex-col border-r"
            style={{
              width: "max-content",
              minWidth: "110px",
              maxWidth: "220px",
              borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <SeccionEntidad
              allEntities={allReinos.map((r) => ({
                id: r.id,
                nombre: r.nombre,
              }))}
              emptyLabel="Sin territorio"
              fallbackIcon={<Globe size={14} strokeWidth={1} />}
              fill={false}
              icon={<Globe size={9} />}
              label="Territorio"
              loading={loadingReinos}
              saving={savingReinos}
              selectedIds={reinoRows.map((r) => r.reinoId)}
              onEntityClick={(id) => onNavigateReino?.(id)}
              onToggle={(id, add) => handleToggleReino(id, add)}
            />
          </div>

          {/* Ciudades - se ensancha según el contenido */}
          <div
            className="shrink-0 flex flex-col border-r"
            style={{
              width: "max-content",
              minWidth: "110px",
              maxWidth: "220px",
              borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <SeccionEntidad
              allEntities={ciudadesConReino.map((l) => ({
                id: l.id,
                nombre: l.nombre,
              }))}
              emptyLabel={
                reinosSeleccionadosIds.length > 0
                  ? "Sin ciudades en estos reinos"
                  : "Sin ciudades"
              }
              fallbackIcon={<MapPin size={14} strokeWidth={1} />}
              fill={false}
              icon={<MapPin size={9} />}
              label={
                reinosSeleccionadosIds.length > 0
                  ? `Ciudades (${reinosSeleccionadosIds.length})`
                  : "Ciudades"
              }
              loading={loadingCiudades}
              saving={savingCiudades}
              selectedIds={ciudadRows.map((r) => r.ciudadId)}
              onEntityClick={(id) => onNavigateCiudad?.(id)}
              onToggle={(id, add) => handleToggleCiudad(id, add)}
            />
          </div>

          {/* Creaciones - se ensancha según el contenido */}
          <div
            className="shrink-0 flex flex-col border-r"
            style={{
              width: "max-content",
              minWidth: "110px",
              maxWidth: "220px",
              borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
            }}
          >
            <SeccionEntidad
              allEntities={allCraftedItems.map((i) => ({
                id: i.id,
                nombre: i.nombre,
                imagen_url: i.imagen_url,
              }))}
              emptyLabel="Sin creaciones"
              fallbackIcon={<Package size={14} strokeWidth={1} />}
              fill={false}
              icon={<Wrench size={9} />}
              label="Creaciones"
              loading={loadingCrafted}
              saving={savingCrafted}
              selectedIds={craftedItems.map((i) => i.itemId)}
              onEntityClick={(id) => onSelectItem?.(id)}
              onToggle={handleToggleCrafted}
            />
          </div>

          {/* Hechizos + Dones - ancho fijo */}
          <div
            className="shrink-0 flex flex-col overflow-hidden"
            style={{ width: "110px" }}
          >
            {grupoEsMagico(gruposActuales) ? (
              <>
                <div
                  className="flex-1 min-h-0 overflow-hidden flex flex-col border-b"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--primary) 7%, transparent)",
                  }}
                >
                  <BloqueMagico
                    criaturaId={form.id}
                    gruposActuales={gruposActuales.map((g) => g.id)}
                    icon={Sparkles}
                    label="Hechizos"
                    usarHook="hechizos"
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <BloqueMagico
                    criaturaId={form.id}
                    gruposActuales={gruposActuales.map((g) => g.id)}
                    icon={Star}
                    label="Dones"
                    usarHook="dones"
                  />
                </div>
              </>
            ) : (
              <BloqueMagico
                criaturaId={form.id}
                gruposActuales={gruposActuales.map((g) => g.id)}
                icon={Star}
                label="Dones"
                usarHook="dones"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── BARRA DE ENTIDADES — mobile drawer ───────────────────────────────── */}
      {mobileAsideOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0"
            style={{
              background: "color-mix(in srgb, var(--primary) 20%, transparent)",
            }}
            onClick={() => setMobileAsideOpen(false)}
          />
          <div
            className="relative flex flex-col h-full overflow-y-auto shadow-2xl"
            style={{
              width: "200px",
              background: "var(--white-custom, var(--bg-main))",
              borderLeft:
                "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              scrollbarWidth: "none",
            }}
          >
            <div
              className="shrink-0 flex items-center justify-between px-3 py-2 border-b"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              <span className="text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 text-primary/40">
                <SlidersHorizontal size={9} /> Entidades
              </span>
              <button
                className="p-1 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all"
                onClick={() => setMobileAsideOpen(false)}
              >
                <X size={13} />
              </button>
            </div>
            <SeccionEntidad
              allEntities={allPersonajes.map((p) => ({
                id: p.id,
                nombre: p.nombre,
                imagen_url: p.img_url,
              }))}
              columns={2}
              emptyLabel="Sin personajes"
              fallbackIcon={<UserCircle2 size={14} strokeWidth={1} />}
              fill={false}
              icon={<Users size={9} />}
              label="Personajes"
              loading={loadingPersonajes}
              saving={savingPersonajes}
              selectedIds={personajesDeEspecie.map((p) => p.id)}
              onEntityClick={(id) => onSelectPersonaje?.(id)}
              onToggle={handleTogglePersonaje}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <SeccionEntidad
              allEntities={allReinos.map((r) => ({
                id: r.id,
                nombre: r.nombre,
              }))}
              emptyLabel="Sin territorio"
              fallbackIcon={<Globe size={14} strokeWidth={1} />}
              fill={false}
              icon={<Globe size={9} />}
              label="Territorio"
              loading={loadingReinos}
              saving={savingReinos}
              selectedIds={reinoRows.map((r) => r.reinoId)}
              onEntityClick={(id) => onNavigateReino?.(id)}
              onToggle={(id, add) => handleToggleReino(id, add)}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <SeccionEntidad
              allEntities={ciudadesConReino.map((l) => ({
                id: l.id,
                nombre: l.nombre,
              }))}
              emptyLabel={
                reinosSeleccionadosIds.length > 0
                  ? "Sin ciudades en estos reinos"
                  : "Sin ciudades"
              }
              fallbackIcon={<MapPin size={14} strokeWidth={1} />}
              fill={false}
              icon={<MapPin size={9} />}
              label={
                reinosSeleccionadosIds.length > 0
                  ? `Ciudades (${reinosSeleccionadosIds.length})`
                  : "Ciudades"
              }
              loading={loadingCiudades}
              saving={savingCiudades}
              selectedIds={ciudadRows.map((r) => r.ciudadId)}
              onEntityClick={(id) => onNavigateCiudad?.(id)}
              onToggle={(id, add) => handleToggleCiudad(id, add)}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <SeccionEntidad
              allEntities={allCraftedItems.map((i) => ({
                id: i.id,
                nombre: i.nombre,
                imagen_url: i.imagen_url,
              }))}
              emptyLabel="Sin creaciones"
              fallbackIcon={<Package size={14} strokeWidth={1} />}
              fill={false}
              icon={<Wrench size={9} />}
              label="Creaciones"
              loading={loadingCrafted}
              saving={savingCrafted}
              selectedIds={craftedItems.map((i) => i.itemId)}
              onEntityClick={(id) => onSelectItem?.(id)}
              onToggle={handleToggleCrafted}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            {grupoEsMagico(gruposActuales) && (
              <>
                <BloqueMagico
                  criaturaId={form.id}
                  gruposActuales={gruposActuales.map((g) => g.id)}
                  icon={Sparkles}
                  label="Hechizos"
                  usarHook="hechizos"
                />
                <div
                  style={{
                    borderTop:
                      "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
                  }}
                />
              </>
            )}
            <BloqueMagico
              criaturaId={form.id}
              gruposActuales={gruposActuales.map((g) => g.id)}
              icon={Star}
              label="Dones"
              usarHook="dones"
            />
          </div>
        </div>
      )}
    </div>
  );
}
