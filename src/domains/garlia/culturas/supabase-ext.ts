/**
 * culturas/supabase-ext.ts
 * ────────────────────────────────────────────────────────────
 * Wrappers tipados para las tablas nuevas (idiomas_fonemas,
 * idiomas_lexemas, idiomas_lexemas_significados) que aún no
 * están en el archivo generado lib/types/supabase.ts.
 *
 * Una vez que apliques la migración v2 y ejecutes
 * `supabase gen types typescript` para regenerar supabase.ts,
 * podés reemplazar estos helpers por llamadas directas al cliente.
 *
 * USO:
 *   import { fonemas, lexemas, significados } from "./supabase-ext";
 *   const { data } = await fonemas.select("*").eq("idioma_id", id);
 */
import { supabase } from "@/infra/supabase/supabase";
import type {
  IdiomaFonema,
  IdiomaLexema,
  IdiomaLexemaSignificado,
} from "./types";

// ── helpers internos ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ── fonemas ───────────────────────────────────────────────────────────────

type FonemaInsert = Omit<IdiomaFonema, "id" | "created_at">;
type FonemaUpdate = Partial<FonemaInsert>;

export const fonemas = {
  select: (columns = "*") =>
    db.from("idiomas_fonemas").select(columns) as ReturnType<
      typeof supabase.from<"idiomas_fonemas", IdiomaFonema>
    >["select"],

  insert: (row: FonemaInsert) =>
    db.from("idiomas_fonemas").insert(row).select().single() as Promise<{
      data: IdiomaFonema | null;
      error: { message: string } | null;
    }>,

  update: (id: string, campos: FonemaUpdate) =>
    db.from("idiomas_fonemas").update(campos).eq("id", id).select().single() as Promise<{
      data: IdiomaFonema | null;
      error: { message: string } | null;
    }>,

  delete: (id: string) =>
    db.from("idiomas_fonemas").delete().eq("id", id) as Promise<{
      error: { message: string } | null;
    }>,

  byIdioma: (idiomaId: string) =>
    db
      .from("idiomas_fonemas")
      .select("*")
      .eq("idioma_id", idiomaId)
      .order("tipo")
      .order("punto_articulacion") as Promise<{
        data: IdiomaFonema[] | null;
        error: { message: string } | null;
      }>,
};

// ── lexemas ───────────────────────────────────────────────────────────────

type LexemaInsert = Omit<IdiomaLexema, "id" | "created_at" | "updated_at" | "significados" | "idioma_origen">;
type LexemaUpdate = Partial<LexemaInsert>;

export const lexemas = {
  byIdioma: (idiomaId: string) =>
    db
      .from("idiomas_lexemas")
      .select("*, significados:idiomas_lexemas_significados(*)")
      .eq("idioma_id", idiomaId)
      .order("lema") as Promise<{
        data: IdiomaLexema[] | null;
        error: { message: string } | null;
      }>,

  insert: (row: LexemaInsert) =>
    db.from("idiomas_lexemas").insert(row).select().single() as Promise<{
      data: IdiomaLexema | null;
      error: { message: string } | null;
    }>,

  update: (id: string, campos: LexemaUpdate) =>
    db.from("idiomas_lexemas").update(campos).eq("id", id).select().single() as Promise<{
      data: IdiomaLexema | null;
      error: { message: string } | null;
    }>,

  delete: (id: string) =>
    db.from("idiomas_lexemas").delete().eq("id", id) as Promise<{
      error: { message: string } | null;
    }>,
};

// ── significados ──────────────────────────────────────────────────────────

type SigInsert = Omit<IdiomaLexemaSignificado, "id" | "created_at">;
type SigUpdate = Partial<SigInsert>;

export const significados = {
  insert: (row: SigInsert) =>
    db.from("idiomas_lexemas_significados").insert(row).select().single() as Promise<{
      data: IdiomaLexemaSignificado | null;
      error: { message: string } | null;
    }>,

  update: (id: string, campos: SigUpdate) =>
    db
      .from("idiomas_lexemas_significados")
      .update(campos)
      .eq("id", id)
      .select()
      .single() as Promise<{
        data: IdiomaLexemaSignificado | null;
        error: { message: string } | null;
      }>,

  delete: (id: string) =>
    db.from("idiomas_lexemas_significados").delete().eq("id", id) as Promise<{
      error: { message: string } | null;
    }>,
};
