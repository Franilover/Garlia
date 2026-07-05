import type { IdiomaKey, Filtros, Seccion, EscenaMV, ColState } from "./types";

export const IDIOMAS: { id: IdiomaKey; label: string; nombre: string; campo: keyof Seccion }[] = [
  { id: "es",     label: "ES", nombre: "Español",  campo: "letra_es" },
  { id: "en",     label: "EN", nombre: "Inglés",   campo: "letra_en" },
  { id: "jp",     label: "JP", nombre: "Japonés",  campo: "letra_jp" },
  { id: "romaji", label: "RO", nombre: "Romaji",   campo: "letra_romaji" },
];

export const ESTADOS = ["TERMINADA", "EN PROCESO", "BORRADOR"] as const;

export const ESTADO_COLOR: Record<string, string> = {
  TERMINADA:    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "EN PROCESO": "bg-amber-500/20  text-amber-400  border-amber-500/30",
  BORRADOR:     "bg-primary/10    text-primary/50  border-primary/20",
};

export const FILTROS_VACIOS: Filtros = {
  estado: "", visible: "", idioma: "", cantante: "", compositor: "", personaje: "",
};

export const TABLA_SEC = "secciones_cancion";

export const TIPO_ESCENA_LABEL: Record<EscenaMV["tipo"], string> = {
  escena:     "Escena",
  camara:     "Cámara",
  efecto:     "Efecto",
  transicion: "Transición",
  personaje:  "Personaje",
};

export const TIPO_ESCENA_COLOR: Record<EscenaMV["tipo"], string> = {
  escena:     "bg-violet-500/15 text-violet-400 border-violet-500/30",
  camara:     "bg-sky-500/15    text-sky-400    border-sky-500/30",
  efecto:     "bg-pink-500/15   text-pink-400   border-pink-500/30",
  transicion: "bg-amber-500/15  text-amber-400  border-amber-500/30",
  personaje:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export const IDLE_STATE: ColState = {
  dirty: false, saving: false, saved: false, mode: "idle", msg: null,
};
