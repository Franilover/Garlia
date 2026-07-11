"use client";

/**
 * EditorMundoRoot
 * ───────────────────────────────────────────────────────────────────────────
 * Reemplaza:
 *   - features/editorGarlia/views/editorGarlia.tsx  (823 líneas, orquestador)
 *   - features/editorGarlia/views/EditorMundo.tsx    (2395 líneas, panel único)
 *
 * Por un shell delgado (~90 líneas) que:
 *   1. Lee el store de navegación (useMundoNavigation, Zustand — sin Provider,
 *      se importa y usa directamente donde haga falta).
 *   2. Conecta la paleta de comandos externa vía un solo puente tipado.
 *   3. Renderiza SOLO la sección activa, con code-splitting (React.lazy),
 *      así el usuario no descarga el editor de letras de canciones para
 *      editar un personaje.
 *
 * Navegación tipo "un solo panel que se transforma": cuando section === null
 * se muestra <MundoMenu /> con las 12 secciones agrupadas; al elegir una,
 * el MISMO espacio pasa a mostrar la columna angosta (lista) + editor de esa
 * sección — no se agrega una columna nueva al lado. El botón de volver
 * (X / flecha) vive en la navbar global (components/layout/navbar.tsx),
 * que lee useMundoNavigation directamente — no hay botones de volver
 * dentro de cada sección.
 *
 * Requiere: npm install zustand (verificado zustand@5.0.14 + TS strict).
 *
 * Cada sección (personajes, criaturas, magia, etc.) es un feature
 * independiente que trae sus propios datos vía useSupabaseData("tabla") —
 * sin funciones dexieReadAll/dexieWriteAll duplicadas, sin estado compartido
 * con las demás secciones. Si "Criaturas" tiene un bug, "Personajes" no se
 * entera ni se re-renderiza.
 */

import { Loader2, WifiOff } from "lucide-react";
import React, { lazy, Suspense } from "react";

import { AdminOnly } from "@/components/forms/AdminOnly";
import { WikilinkProvider } from "@/features/editorGarlia/components/shared/WikilinkContext";

import { useMundoNavigation } from "../hooks/mundo/useMundoNavigationStore";
import { useExternalCommandBridge } from "../hooks/mundo/useExternalCommandBridge";
import { MundoHomeDashboard } from "../components/shared/MundoHomeDashboard";
import { useCreateEntity } from "../hooks/mundo/useCreateEntity";
import { useWikilinkNavigate } from "../hooks/mundo/useWikilinkNavigate";

// ─── Code-splitting por página combinada ──────────────────────────────────
// Personajes/Criaturas/Items/Reinos/Ciudades/Hechizos/Dones/Runas/Grupos/Notas
// viven TODOS juntos en EntidadesPage (una sola grilla grande de tarjetas,
// con el bloque de Organización — Grupos + Notas — al fondo).
const EntidadesPage = lazy(() =>
  import("./EntidadesPage").then((m) => ({ default: m.EntidadesPage })),
);
const CapitulosSection = lazy(() =>
  import("./CapitulosSection").then((m) => ({ default: m.CapitulosSection })),
);
const LetrasSection = lazy(() =>
  import("./LetrasSection").then((m) => ({ default: m.LetrasSection })),
);
const MapaSection = lazy(() =>
  import("./MapaSection").then((m) => ({ default: m.MapaSection })),
);
const LineaTiempoSection = lazy(() =>
  import("./LineaTiempoSection").then((m) => ({ default: m.LineaTiempoSection })),
);

function SectionFallback() {
  return (
    <div className="flex-1 flex items-center justify-center text-primary/30">
      <Loader2 className="animate-spin" size={20} />
    </div>
  );
}

function ActiveSection() {
  const section = useMundoNavigation((s) => s.section);
  const selectedId = useMundoNavigation((s) => s.selectedId);

  switch (section) {
    case null:
      return <MundoHomeDashboard />;
    case "personajes":
    case "criaturas":
    case "items":
    case "reinos":
    case "ciudades":
    case "hechizos":
    case "dones":
    case "runas":
    case "grupos":
    case "notas":
      return <EntidadesPage section={section} selectedId={selectedId} />;
    case "capitulos":
      return <CapitulosSection />;
    case "letras":
      return <LetrasSection />;
    case "mapa":
      return <MapaSection />;
    case "linea-tiempo":
      return <LineaTiempoSection />;
    default:
      return null;
  }
}

function EditorMundoInner() {
  const createEntity = useCreateEntity();
  useExternalCommandBridge(createEntity);
  const handleWikilinkNavigate = useWikilinkNavigate();

  // Estado de red se resuelve dentro de cada useSupabaseData por sección;
  // acá solo mostramos el banner si el navegador reporta offline, sin
  // duplicar la lógica de detección.
  const [isOffline, setIsOffline] = React.useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  React.useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <div
      className="flex flex-col w-full overflow-hidden"
      style={{ background: "var(--bg-main)", height: "100dvh" }}
    >
      {isOffline && (
        <div className="shrink-0 flex items-center justify-center gap-2 py-1.5 text-micro font-black uppercase tracking-widest text-orange-400">
          <WifiOff size={10} /> Sin conexión · algunos datos pueden estar desactualizados
        </div>
      )}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <WikilinkProvider onWikilink={handleWikilinkNavigate}>
          <Suspense fallback={<SectionFallback />}>
            <ActiveSection />
          </Suspense>
        </WikilinkProvider>
      </div>
    </div>
  );
}

export default function EditorMundoRoot() {
  return (
    <AdminOnly>
      <EditorMundoInner />
    </AdminOnly>
  );
}
