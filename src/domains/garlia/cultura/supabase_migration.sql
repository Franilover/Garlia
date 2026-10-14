-- ============================================================
-- CULTURAS E IDIOMAS — Migración Supabase
-- Proyecto: Garlia / Franiloverart
-- ============================================================

-- ── Culturas ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS culturas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  descripcion text,
  -- Origen
  region_origen     text,       -- nombre libre de región/bioma
  reino_id          uuid REFERENCES reinos(id) ON DELETE SET NULL,
  -- Rasgo visual
  color_emblema     text,       -- hex, ej: "#a87c4f"
  emblema_icono     text,       -- nombre Lucide o emoji
  -- Metadatos
  es_extinta    boolean NOT NULL DEFAULT false,
  visible       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Idiomas ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idiomas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text NOT NULL,
  nombre_nativo text,           -- cómo lo llaman sus hablantes
  descripcion   text,
  -- Clasificación lingüística
  familia_linguistica   text,   -- ej: "Lenguas del Norte", "Proto-Garlio"
  tipo                  text CHECK (tipo IN (
    'natural','creado','muerto','pidgin','sign','ritual','secreto'
  )) DEFAULT 'natural',
  -- Raíz/ancestro
  idioma_padre_id uuid REFERENCES idiomas(id) ON DELETE SET NULL,
  -- Escritura
  sistema_escritura     text,   -- ej: "Runas Solares", "Silabario Kor"
  direccion_escritura   text CHECK (direccion_escritura IN (
    'ltr','rtl','ttb','btt','boustrophedon'
  )) DEFAULT 'ltr',
  tiene_escritura_propia boolean NOT NULL DEFAULT false,
  -- Fonología (libre)
  notas_fonologia       text,
  -- Vocabulario de ejemplo (array JSON de {palabra, traduccion})
  vocabulario_muestra   jsonb   DEFAULT '[]'::jsonb,
  -- Gramática tags (array de texto)
  rasgos_gramaticales   text[]  DEFAULT '{}',
  -- Cultura principal que lo habla
  cultura_principal_id  uuid REFERENCES culturas(id) ON DELETE SET NULL,
  -- Metadatos
  num_hablantes_aprox   text,   -- "millones", "algunos miles", "extinto"
  es_extinto    boolean NOT NULL DEFAULT false,
  visible       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Culturas ↔ Idiomas (muchos a muchos) ────────────────────

CREATE TABLE IF NOT EXISTS culturas_idiomas (
  cultura_id  uuid NOT NULL REFERENCES culturas(id) ON DELETE CASCADE,
  idioma_id   uuid NOT NULL REFERENCES idiomas(id) ON DELETE CASCADE,
  rol         text CHECK (rol IN ('nativo','comercio','ritual','extinto','aprendido'))
              DEFAULT 'nativo',
  PRIMARY KEY (cultura_id, idioma_id)
);

-- ── Idiomas ↔ Personajes (quién habla qué) ──────────────────

CREATE TABLE IF NOT EXISTS personajes_idiomas (
  personaje_id  uuid NOT NULL REFERENCES personajes(id) ON DELETE CASCADE,
  idioma_id     uuid NOT NULL REFERENCES idiomas(id) ON DELETE CASCADE,
  nivel         text CHECK (nivel IN ('nativo','fluido','basico','rudimentario'))
                DEFAULT 'fluido',
  PRIMARY KEY (personaje_id, idioma_id)
);

-- ── Frases / Corpus del idioma ───────────────────────────────

CREATE TABLE IF NOT EXISTS idiomas_frases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idioma_id   uuid NOT NULL REFERENCES idiomas(id) ON DELETE CASCADE,
  frase_original    text NOT NULL,
  transliteracion   text,
  traduccion        text,
  contexto          text,   -- "saludo formal", "insulto", "ritual de muerte"
  categoria         text CHECK (categoria IN (
    'saludo','despedida','pregunta','numero','color','tiempo',
    'ritual','insulto','piropo','refrán','otro'
  )) DEFAULT 'otro',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Reglas gramaticales ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS idiomas_reglas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idioma_id   uuid NOT NULL REFERENCES idiomas(id) ON DELETE CASCADE,
  titulo      text NOT NULL,
  descripcion text,
  ejemplo     text,
  categoria   text CHECK (categoria IN (
    'fonologia','morfologia','sintaxis','semantica','pragmatica','escritura','otro'
  )) DEFAULT 'otro',
  orden       int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Triggers updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER culturas_updated_at
  BEFORE UPDATE ON culturas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER idiomas_updated_at
  BEFORE UPDATE ON idiomas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Índices ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_idiomas_cultura_principal ON idiomas(cultura_principal_id);
CREATE INDEX IF NOT EXISTS idx_idiomas_padre ON idiomas(idioma_padre_id);
CREATE INDEX IF NOT EXISTS idx_idiomas_frases_idioma ON idiomas_frases(idioma_id);
CREATE INDEX IF NOT EXISTS idx_idiomas_reglas_idioma ON idiomas_reglas(idioma_id);
CREATE INDEX IF NOT EXISTS idx_culturas_reino ON culturas(reino_id);
