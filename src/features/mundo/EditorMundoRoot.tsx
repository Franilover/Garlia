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
 * sección — no se agrega una columna nueva al lado. Cada sección trae su
 * propia X (SectionListHeader o FloatingBackButton) para volver al menú
 * vía goToMenu().
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

import { useMundoNavigation } from "./store/useMundoNavigationStore";
import { useExternalCommandBridge } from "./store/useExternalCommandBridge";
import { MundoMenu } from "./shared/MundoMenu";
import { useCreateEntity } from "./shared/useCreateEntity";
import { useWikilinkNavigate } from "./shared/useWikilinkNavigate";

// ─── Code-splitting por sección ───────────────────────────────────────────────
// Cada import() es un chunk separado. Cambiar de sección solo descarga lo que
// hace falta; nada de cargar 88K de una vez para editar un solo personaje.
const PersonajesSection = lazy(() =>
  import("./personajes/PersonajesSection").then((m) => ({ default: m.PersonajesSection })),
);
const CriaturasSection = lazy(() =>
  import("./criaturas/CriaturasSection").then((m) => ({ default: m.CriaturasSection })),
);
const ItemsSection = lazy(() =>
  import("./items/ItemsSection").then((m) => ({ default: m.ItemsSection })),
);
const ReinosSection = lazy(() =>
  import("./reinos/ReinosSection").then((m) => ({ default: m.ReinosSection })),
);
const CiudadesSection = lazy(() =>
  import("./ciudades/CiudadesSection").then((m) => ({ default: m.CiudadesSection })),
);
const GruposSection = lazy(() =>
  import("./grupos/GruposSection").then((m) => ({ default: m.GruposSection })),
);
const MagiaSection = lazy(() =>
  import("./magia/MagiaSection").then((m) => ({ default: m.MagiaSection })),
);
const CapitulosSection = lazy(() =>
  import("./capitulos/CapitulosSection").then((m) => ({ default: m.CapitulosSection })),
);
const LetrasSection = lazy(() =>
  import("./letras/LetrasSection").then((m) => ({ default: m.LetrasSection })),
);
const NotasSection = lazy(() =>
  import("./notas/NotasSection").then((m) => ({ default: m.NotasSection })),
);
const MapaSection = lazy(() =>
  import("./mapa/MapaSection").then((m) => ({ default: m.MapaSection })),
);
const LineaTiempoSection = lazy(() =>
  import("./mapa/LineaTiempoSection").then((m) => ({ default: m.LineaTiempoSection })),
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
  const magiaTipo = useMundoNavigation((s) => s.magiaTipo);
  const navKey = useMundoNavigation((s) => s.navKey);

  switch (section) {
    case null:
      return <MundoMenu />;
    case "personajes":
      return <PersonajesSection selectedId={selectedId} navKey={navKey} />;
    case "criaturas":
      return <CriaturasSection selectedId={selectedId} navKey={navKey} />;
    case "items":
      return <ItemsSection selectedId={selectedId} navKey={navKey} />;
    case "reinos":
      return <ReinosSection selectedId={selectedId} navKey={navKey} />;
    case "ciudades":
      return <CiudadesSection selectedId={selectedId} navKey={navKey} />;
    case "grupos":
      return <GruposSection selectedId={selectedId} navKey={navKey} />;
    case "magia":
      return <MagiaSection tipo={magiaTipo} selectedId={selectedId} navKey={navKey} />;
    case "capitulos":
      return <CapitulosSection />;
    case "letras":
      return <LetrasSection />;
    case "notas":
      return <NotasSection />;
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
    <div className="flex flex-col w-full h-full overflow-hidden" style={{ background: "var(--bg-main)" }}>
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
