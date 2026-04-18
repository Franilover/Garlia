"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Loader2, ChevronRight, ArrowLeft, House, Save, Edit3, ImagePlus, Move, CheckCircle2, AlertCircle, Users, UserX } from "lucide-react";
import QuickPinchZoom, { make3dTransformValue } from "react-quick-pinch-zoom";
import { supabase } from "@/lib/api/client/supabase";
import { useIsAdmin } from '@/hooks/auth/useIsAdmin';
import { ModalDetalle } from "@/components/paginas/wiki/personal/PersonalComponents";

type EntidadModal =
  | { tipo: "personaje"; data: any }
  | { tipo: "criatura";  data: any }
  | { tipo: "item";      data: any }
  | { tipo: "item_inv";  data: any };

type ToastType = "success" | "error";

function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 shadow-xl text-btn-text text-[11px] font-black uppercase tracking-wide ${type === "success" ? "bg-green-600" : "bg-red-500"}`} style={{borderRadius:"var(--radius-btn)"}}
    >
      {type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
    </MotionDiv>
  );
}

const Marker = ({ x, y, info, onClick, tipo, editMode, oculto }: any) => (
  <div
    className="absolute z-20 flex flex-col items-center"
    style={{ top: `${y}%`, left: `${x}%`, transform: "translate(-50%, -50%)", opacity: oculto ? 0.45 : 1 }}
  >
    <div className="mb-1 bg-primary text-btn-text text-[9px] font-black uppercase px-2 py-0.5 shadow-lg whitespace-nowrap pointer-events-none" style={{borderRadius:"var(--radius-btn)",border:"1px solid color-mix(in srgb, var(--btn-text) 20%, transparent)"}}>
      {info}
    </div>
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="relative flex items-center justify-center cursor-pointer outline-none group"
    >
      {editMode && (
        <div className="absolute -top-1 -right-1 z-10 w-3 h-3 bg-yellow-400 rounded-full" style={{border:"1px solid color-mix(in srgb, var(--btn-text) 80%, transparent)"}} />
      )}
      {editMode && oculto && (
        <div className="absolute -bottom-1 -left-1 z-10 w-3 h-3 bg-orange-400 rounded-full flex items-center justify-center" style={{border:"1px solid color-mix(in srgb, var(--btn-text) 80%, transparent)"}}>
          <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </div>
      )}
      <div className="absolute w-5 h-5 bg-primary/20 rounded-full animate-ping" />
      <div className="w-4 h-4 bg-primary rounded-full border-2 shadow-md transition-all flex items-center justify-center" style={{borderColor:"color-mix(in srgb, var(--btn-text) 80%, transparent)","--hover-bg":"var(--white-custom)"} as any}>
        {tipo === "reino" ? (
          <MapPin size={8} className="text-btn-text group-hover:text-primary" />
        ) : (
          <House size={8} className="text-btn-text group-hover:text-primary" />
        )}
      </div>
    </button>
  </div>
);

export default function MapaInteractivo() {
  const isAdmin = useIsAdmin();
  const [reinos, setReinos] = useState([]);
  const [detallesReino, setDetallesReino] = useState([]);
  const [vistaActual, setVistaActual] = useState("global");
  const [reinoSeleccionado, setReinoSeleccionado] = useState(null);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cargandoImagen, setCargandoImagen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modifiedDetalles, setModifiedDetalles] = useState<Set<string>>(new Set());
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mapRef = useRef(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  // ── Personajes del reino seleccionado y desbloqueados por el usuario ──────
  const [personajesReino,       setPersonajesReino]       = useState<any[]>([]);
  const [personajesDesbloqueados, setPersonajesDesbloqueados] = useState<Set<string>>(new Set());
  // ── Modal de detalle de personaje (igual que en Personal) ─────────────────
  const [modalEntidad, setModalEntidad] = useState<EntidadModal | null>(null);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const onUpdate = useCallback(({ x, y, scale }) => {
    if (mapRef.current) {
      const value = make3dTransformValue({ x, y, scale });
      mapRef.current.style.setProperty("transform", value);
    }
  }, []);

  useEffect(() => {
    async function fetchReinos() {
      const { data, error } = await supabase.from("reinos").select("*");
      if (error) console.error(error);
      else setReinos(data);
      setLoading(false);
    }
    fetchReinos();

    // Cargar personajes desbloqueados del usuario actual
    async function fetchDesbloqueados() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("descubrimientos_personajes")
        .select("personaje_id")
        .eq("perfil_id", user.id);
      if (data) setPersonajesDesbloqueados(new Set(data.map((r: any) => r.personaje_id)));
    }
    fetchDesbloqueados();
  }, []);

  const handleReinoClick = async (reino) => {
    if (editMode) { setReinoSeleccionado(reino); return; }
    setCargandoImagen(true);
    setReinoSeleccionado(reino);
    setPersonajesReino([]); // limpiar mientras carga

    const [detallesRes, personajesRes] = await Promise.all([
      supabase.from("reino_detalles").select("*").eq("reino_id", reino.id),
      // Traer también el campo "sobre" para poder mostrarlo en el modal
      supabase.from("personajes").select("id, nombre, img_url, especie, reino, sobre").eq("reino", reino.nombre),
    ]);

    if (detallesRes.error) console.error(detallesRes.error);
    else setDetallesReino(detallesRes.data);

    if (!personajesRes.error) setPersonajesReino(personajesRes.data ?? []);

    setVistaActual("reino");
  };

  // ── Abrir modal con la info del personaje desbloqueado ────────────────────
  const handlePersonajeClick = (p: any) => {
    setModalEntidad({
      tipo: "personaje",
      data: {
        tipo: "personaje",
        entidad_id: p.id,
        nombre: p.nombre,
        imagen_url: p.img_url,
        descripcion: p.sobre,
        reino: p.reino,
        especie: p.especie,
        // fecha_descubrimiento no es necesario para el modal, pero la interfaz lo pide opcional
        fecha_descubrimiento: "",
      },
    });
  };

  const handleMapClick = (e) => {
    if (!editMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(2));
    const y = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(2));
    if (puntoSeleccionado) {
      const updated = { ...puntoSeleccionado, coord_x: x, coord_y: y };
      setPuntoSeleccionado(updated);
      setDetallesReino(prev => prev.map(p => p.id === puntoSeleccionado.id ? { ...p, coord_x: x, coord_y: y } : p));
      setModifiedDetalles(prev => new Set(prev).add(puntoSeleccionado.id));
    } else if (reinoSeleccionado && vistaActual === "global") {
      setReinoSeleccionado({ ...reinoSeleccionado, coord_x: x, coord_y: y });
      setReinos(prev => prev.map(r => r.id === reinoSeleccionado.id ? { ...r, coord_x: x, coord_y: y } : r));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reinoSeleccionado) return;
    setIsUploadingImg(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `mapas/reino_${reinoSeleccionado.id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("wiki").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("wiki").getPublicUrl(path);
      const mapa_url = urlData.publicUrl;
      const { error: updateError } = await supabase.from("reinos").update({ mapa_url }).eq("id", reinoSeleccionado.id);
      if (updateError) throw updateError;
      setReinoSeleccionado({ ...reinoSeleccionado, mapa_url });
      setReinos(prev => prev.map(r => r.id === reinoSeleccionado.id ? { ...r, mapa_url } : r));
      showToast("Imagen actualizada", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al subir la imagen", "error");
    } finally {
      setIsUploadingImg(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      if (vistaActual === "reino" && modifiedDetalles.size > 0) {
        // Guardar todos los puntos modificados en paralelo
        const toSave = detallesReino.filter(p => modifiedDetalles.has(p.id));
        await Promise.all(
          toSave.map(p =>
            supabase.from("reino_detalles").update({
              nombre: p.nombre,
              descripcion: p.descripcion,
              coord_x: p.coord_x,
              coord_y: p.coord_y,
              oculto: p.oculto ?? false,
            }).eq("id", p.id)
          )
        );
        setModifiedDetalles(new Set());
      } else if (reinoSeleccionado && vistaActual === "global") {
        const { error } = await supabase.from("reinos").update({
          nombre: reinoSeleccionado.nombre,
          descripcion: reinoSeleccionado.descripcion,
          coord_x: reinoSeleccionado.coord_x,
          coord_y: reinoSeleccionado.coord_y,
          oculto: reinoSeleccionado.oculto ?? false,
        }).eq("id", reinoSeleccionado.id);
        if (error) throw error;
        setReinos(prev => prev.map(r => r.id === reinoSeleccionado.id ? reinoSeleccionado : r));
      }
      showToast("Cambios guardados", "success");
      setEditMode(false);
    } catch (error) {
      console.error("Error al guardar:", error);
      showToast("No se pudieron guardar los cambios", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const volverAlGlobal = () => {
    setCargandoImagen(true);
    setVistaActual("global");
    setReinoSeleccionado(null);
    setPuntoSeleccionado(null);
    setDetallesReino([]);
    setPersonajesReino([]);
    setModifiedDetalles(new Set());
    setEditMode(false);
    setMobilePanelOpen(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-primary">
      <Loader2 className="animate-spin mb-2" />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Desplegando Mapa...</span>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row w-full bg-bg-main overflow-hidden">

      {/* ── Modal de detalle de personaje ── */}
      {modalEntidad && (
        <ModalDetalle entidad={modalEntidad} onClose={() => setModalEntidad(null)} />
      )}

      {}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          MAPA (full-screen en móvil, izquierda en desktop)
      ══════════════════════════════════════════ */}
      <div
        className={`relative transition-all duration-500 ease-in-out
          ${isMobile
            ? "fixed inset-0 z-10 h-full"                                    // móvil: pantalla completa, overflow libre para que la imagen se pase
            : vistaActual === "reino" ? "w-full md:w-2/3" : "w-full"         // desktop: normal
          }
        `}
      >

        {}
        {isAdmin && (
          <div className="absolute top-6 right-6 z-[70] flex gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase transition-all shadow-xl border ${
                editMode ? "bg-red-500 text-btn-text border-red-600" : "bg-white-custom text-primary border-primary/20"
              }`} style={{borderRadius:"var(--radius-btn)"}}
            >
              {editMode ? <X size={14} /> : <Edit3 size={14} />}
              {editMode ? "Cancelar" : "Editar Mapa"}
            </button>
            {editMode && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-btn-text text-[10px] font-black uppercase shadow-xl hover:bg-green-700 disabled:opacity-50 transition-all" style={{borderRadius:"var(--radius-btn)"}}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar
              </button>
            )}
          </div>
        )}

        {}
        <AnimatePresence>
          {editMode && (reinoSeleccionado || puntoSeleccionado) && (
            <MotionDiv
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase px-4 py-2 shadow-lg flex items-center gap-2" style={{borderRadius:"var(--radius-btn)"}}
            >
              <Move size={12} /> Clickeá el mapa para mover el marcador
              {modifiedDetalles.size > 1 && (
                <span className="bg-yellow-900/20 px-1.5 py-0.5 rounded-full text-[9px]">{modifiedDetalles.size} pendientes</span>
              )}
            </MotionDiv>
          )}
        </AnimatePresence>

        {}
        <AnimatePresence>
          {cargandoImagen && (
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-bg-main flex flex-col items-center justify-center"
            >
              <Loader2 className="animate-spin text-primary mb-2" />
              <span className="text-[8px] font-black uppercase tracking-widest text-primary/40">Cargando Cartografía...</span>
            </MotionDiv>
          )}
        </AnimatePresence>

        {}
        <AnimatePresence>
          {vistaActual === "reino" && (
            <MotionButton
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onClick={volverAlGlobal}
              className="absolute top-6 left-6 z-50 bg-white-custom/90 backdrop-blur-md p-3 shadow-xl border border-primary/20 text-primary hover:scale-110 transition-transform" style={{borderRadius:"var(--radius-btn)"}}
            >
              <ArrowLeft size={20} />
            </MotionButton>
          )}
        </AnimatePresence>

        {/* ── En móvil + vista reino: tab para abrir panel info, anclado arriba del bottom sheet ── */}
        <AnimatePresence>
          {isMobile && vistaActual === "reino" && reinoSeleccionado && (
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed left-0 right-0 z-[55] flex justify-center pointer-events-none"
              style={{
                bottom: mobilePanelOpen ? "calc(80vh - 1px)" : "0",
                transition: "bottom 0.4s cubic-bezier(0.32,0.72,0,1)",
              }}
            >
              <button
                onClick={() => setMobilePanelOpen(v => !v)}
                className="pointer-events-auto flex items-center gap-2 px-6 py-2.5 bg-primary text-btn-text text-[10px] font-black uppercase shadow-2xl rounded-t-xl"
              >
                {mobilePanelOpen
                  ? <><X size={14} /> Cerrar</>
                  : <><ChevronRight size={14} style={{ transform: "rotate(-90deg)" }} /> {reinoSeleccionado.nombre}</>
                }
              </button>
            </MotionDiv>
          )}
        </AnimatePresence>

        {}
        <div className={isMobile ? "w-full h-full" : "w-full"}>
        <QuickPinchZoom onUpdate={onUpdate} maxZoom={isMobile ? 10 : 5} minZoom={0.3} enabled={!editMode}>
          <div ref={mapRef} className="origin-top-left w-full h-full">
            <div
              className={`relative ${editMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
              onClick={handleMapClick}
            >
              <img
                key={vistaActual === "reino" ? reinoSeleccionado?.id : "global"}
                src={vistaActual === "reino" ? reinoSeleccionado?.mapa_url : "/dibujos/reinos/mapa.png"}
                alt="Mapa"
                className="block pointer-events-none select-none"
                style={{ width: "100%", height: "auto" }}
                onLoad={() => { window.dispatchEvent(new Event("resize")); setCargandoImagen(false); }}
              />
              {!cargandoImagen && (
                vistaActual === "global" ? (
                  reinos.filter(reino => editMode || !reino.oculto).map(reino => (
                    <Marker key={reino.id} x={reino.coord_x} y={reino.coord_y} info={reino.nombre} tipo="reino" editMode={editMode} oculto={reino.oculto} onClick={() => handleReinoClick(reino)} />
                  ))
                ) : (
                  detallesReino.filter(punto => editMode || !punto.oculto).map(punto => (
                    <Marker key={punto.id} x={punto.coord_x} y={punto.coord_y} info={punto.nombre} tipo="detalle" editMode={editMode} oculto={punto.oculto} onClick={() => { setPuntoSeleccionado(punto); if (isMobile) setMobilePanelOpen(true); }} />
                  ))
                )
              )}
            </div>
          </div>
        </QuickPinchZoom>
        </div>
      </div>

      {}
      <AnimatePresence>
        {vistaActual === "reino" && reinoSeleccionado && (
          <MotionDiv
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? (mobilePanelOpen ? { y: 0 } : { y: "100%" }) : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={
              isMobile
                ? "fixed bottom-0 left-0 right-0 z-[60] bg-white-custom rounded-t-2xl shadow-[0_-10px_50px_rgba(0,0,0,0.15)] flex flex-col gap-0 overflow-hidden"
                : "relative z-40 md:w-1/3 bg-white-custom border-l border-primary/10 p-10 flex flex-col gap-0 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] overflow-y-auto"
            }
            style={isMobile ? { height: "80vh", maxHeight: "80vh" } : undefined}
          >
            {/* Drag handle en móvil + padding top */}
            {isMobile && (
              <div
                className="flex-shrink-0 flex justify-center pt-4 pb-3 cursor-pointer"
                onClick={() => setMobilePanelOpen(false)}
              >
                <div className="w-10 h-1 rounded-full bg-primary/20" />
              </div>
            )}
            {/* Contenido scrolleable en móvil */}
            <div className={isMobile ? "flex-1 overflow-y-auto px-6 pb-8" : "flex flex-col gap-0 flex-grow"}>
            {editMode ? (
              <div className="flex flex-col gap-4 flex-grow">

                {}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase text-primary/50 ml-1">Nombre</label>
                  <input
                    type="text"
                    value={puntoSeleccionado ? puntoSeleccionado.nombre : reinoSeleccionado.nombre}
                    onChange={(e) => {
                      if (puntoSeleccionado) {
                        setPuntoSeleccionado({ ...puntoSeleccionado, nombre: e.target.value });
                        setDetallesReino(prev => prev.map(p => p.id === puntoSeleccionado.id ? { ...p, nombre: e.target.value } : p));
                        setModifiedDetalles(prev => new Set(prev).add(puntoSeleccionado.id));
                      } else setReinoSeleccionado({ ...reinoSeleccionado, nombre: e.target.value });
                    }}
                    className="input-brand p-4! text-primary font-black uppercase text-xl! outline-none"
                  />
                </div>

                {}
                <div className="flex flex-col gap-1 flex-grow">
                  <label className="text-[9px] font-bold uppercase text-primary/50 ml-1">Descripción / Lore</label>
                  <textarea
                    value={puntoSeleccionado ? puntoSeleccionado.descripcion : reinoSeleccionado.descripcion}
                    onChange={(e) => {
                      if (puntoSeleccionado) {
                        setPuntoSeleccionado({ ...puntoSeleccionado, descripcion: e.target.value });
                        setDetallesReino(prev => prev.map(p => p.id === puntoSeleccionado.id ? { ...p, descripcion: e.target.value } : p));
                        setModifiedDetalles(prev => new Set(prev).add(puntoSeleccionado.id));
                      } else setReinoSeleccionado({ ...reinoSeleccionado, descripcion: e.target.value });
                    }}
                    className="input-brand p-4! text-sm! italic leading-relaxed! h-36 resize-none outline-none"
                  />
                </div>

                {}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase text-primary/50 ml-1 flex items-center gap-1">
                    <Move size={9} /> Coordenadas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[["X", puntoSeleccionado ? puntoSeleccionado.coord_x : reinoSeleccionado.coord_x],
                      ["Y", puntoSeleccionado ? puntoSeleccionado.coord_y : reinoSeleccionado.coord_y]].map(([label, val]) => (
                      <div key={label} className="bg-primary/5 border border-primary/10 p-3 text-center" style={{borderRadius:"var(--radius-btn)"}}>
                        <span className="block text-[8px] text-primary/40 font-bold uppercase">{label}</span>
                        <span className="text-sm font-black text-primary">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggle visibilidad reino */}
                {!puntoSeleccionado && (
                  <div className="flex items-center justify-between px-3 py-2.5 border border-primary/10 bg-primary/3" style={{borderRadius:"var(--radius-btn)"}}>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Visibilidad en el mapa</p>
                      <p className="text-[9px] text-primary/35 mt-0.5">
                        {reinoSeleccionado.oculto ? "Este reino no aparece para usuarios" : "Este reino es visible en el mapa"}
                      </p>
                    </div>
                    <button
                      onClick={() => setReinoSeleccionado(r => ({ ...r, oculto: !r.oculto }))}
                      className={`relative w-10 h-5 rounded-full transition-all border ${
                        reinoSeleccionado.oculto
                          ? "bg-orange-400/20 border-orange-400/40"
                          : "bg-primary/15 border-primary/20"
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm ${
                        reinoSeleccionado.oculto ? "left-5 bg-orange-400" : "left-0.5 bg-primary/50"
                      }`} />
                    </button>
                  </div>
                )}

                {/* Toggle visibilidad punto */}
                {puntoSeleccionado && (
                  <div className="flex items-center justify-between px-3 py-2.5 border border-primary/10 bg-primary/3" style={{borderRadius:"var(--radius-btn)"}}>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Visibilidad en el mapa</p>
                      <p className="text-[9px] text-primary/35 mt-0.5">
                        {puntoSeleccionado.oculto ? "Este punto no aparece para usuarios" : "Este punto es visible en el mapa"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const nuevoOculto = !puntoSeleccionado.oculto;
                        setPuntoSeleccionado(p => ({ ...p, oculto: nuevoOculto }));
                        setDetallesReino(prev => prev.map(p => p.id === puntoSeleccionado.id ? { ...p, oculto: nuevoOculto } : p));
                        setModifiedDetalles(prev => new Set(prev).add(puntoSeleccionado.id));
                      }}
                      className={`relative w-10 h-5 rounded-full transition-all border ${
                        puntoSeleccionado.oculto
                          ? "bg-orange-400/20 border-orange-400/40"
                          : "bg-primary/15 border-primary/20"
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm ${
                        puntoSeleccionado.oculto ? "left-5 bg-orange-400" : "left-0.5 bg-primary/50"
                      }`} />
                    </button>
                  </div>
                )}

                {}
                {!puntoSeleccionado && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-primary/50 ml-1 flex items-center gap-1">
                      <ImagePlus size={9} /> Imagen del Mapa
                    </label>
                    {reinoSeleccionado.mapa_url && (
                      <div className="relative w-full h-20 overflow-hidden border border-primary/10 mb-1" style={{borderRadius:"var(--radius-btn)"}}>
                        <img src={reinoSeleccionado.mapa_url} alt="Mapa actual" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="text-[8px] font-black uppercase tracking-widest" style={{color:"var(--btn-text)"}}>Imagen actual</span>
                        </div>
                      </div>
                    )}
                    <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button
                      onClick={() => imgInputRef.current?.click()}
                      disabled={isUploadingImg}
                      className="w-full flex items-center justify-center gap-2 bg-primary/5 border border-dashed border-primary/30 text-primary text-[10px] font-black uppercase py-3 hover:bg-primary/10 transition-all disabled:opacity-50" style={{borderRadius:"var(--radius-btn)"}}
                    >
                      {isUploadingImg
                        ? <><Loader2 size={12} className="animate-spin" /> Subiendo...</>
                        : <><ImagePlus size={12} /> {reinoSeleccionado.mapa_url ? "Cambiar imagen" : "Subir imagen"}</>
                      }
                    </button>
                  </div>
                )}

                {}
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-btn-text text-[11px] font-black uppercase py-4 hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg shadow-green-600/20 mt-auto" style={{borderRadius:"var(--radius-btn)"}}
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar cambios
                </button>
              </div>

            ) : (
              
              <>
                <h2 className="text-primary font-black text-4xl uppercase tracking-tighter mb-6 leading-none">
                  {puntoSeleccionado ? puntoSeleccionado.nombre : reinoSeleccionado.nombre}
                </h2>
                <div className="space-y-6 flex-grow overflow-y-auto pr-2">
                  <div className="p-6 bg-primary/5 border border-primary/5" style={{borderRadius:"var(--radius-card)"}}>
                    <p className="text-foreground text-sm italic leading-relaxed">
                      "{puntoSeleccionado ? puntoSeleccionado.descripcion : reinoSeleccionado.descripcion}"
                    </p>
                  </div>


                  {/* ── Habitantes del reino ── */}
                  {!puntoSeleccionado && personajesReino.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-primary/10" />
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 flex items-center gap-1.5">
                          Habitantes
                        </span>
                        <div className="h-px flex-1 bg-primary/10" />
                      </div>

                      <div className="flex flex-col gap-2">
                        {personajesReino.map(p => {
                          const desbloqueado = personajesDesbloqueados.has(p.id);
                          return (
                            <button
                              key={p.id}
                              // Solo los desbloqueados abren el modal; los bloqueados no tienen acción
                              onClick={desbloqueado ? () => handlePersonajeClick(p) : undefined}
                              className="flex items-center gap-3 p-2.5 w-full text-left transition-all"
                              style={{
                                borderRadius: "var(--radius-btn)",
                                background: desbloqueado
                                  ? "color-mix(in srgb, var(--primary) 5%, transparent)"
                                  : "color-mix(in srgb, var(--primary) 2%, transparent)",
                                border: `1px solid color-mix(in srgb, var(--primary) ${desbloqueado ? "12%" : "6%"}, transparent)`,
                                opacity: desbloqueado ? 1 : 0.55,
                                cursor: desbloqueado ? "pointer" : "default",
                              }}
                            >
                              {/* Avatar */}
                              <div
                                className="shrink-0 w-9 h-9 overflow-hidden flex items-center justify-center"
                                style={{
                                  borderRadius: "var(--radius-btn)",
                                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                                  border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                                  filter: desbloqueado ? "none" : "grayscale(100%) blur(2px)",
                                }}
                              >
                                {desbloqueado && p.img_url ? (
                                  <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <UserX size={14} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                                )}
                              </div>

                              {/* Nombre y especie */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-[11px] font-black uppercase leading-tight"
                                  style={{
                                    color: desbloqueado ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                                    textDecoration: desbloqueado ? "none" : "line-through",
                                    textDecorationColor: "color-mix(in srgb, var(--primary) 40%, transparent)",
                                  }}
                                >
                                  {desbloqueado ? p.nombre : "???"}
                                </p>
                                {p.especie && (
                                  <p className="text-[9px] font-medium mt-0.5"
                                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                                    {desbloqueado ? p.especie : "Desconocido"}
                                  </p>
                                )}
                              </div>

                              {/* Badge estado */}
                              {desbloqueado ? (
                                <span className="shrink-0 text-[7px] font-black uppercase px-1.5 py-0.5 tracking-wide flex items-center gap-1"
                                  style={{
                                    borderRadius: "var(--radius-btn)",
                                    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                                    color: "var(--primary)",
                                    border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                                  }}>
                                  Conocido
                                  <ChevronRight size={8} />
                                </span>
                              ) : (
                                <span className="shrink-0 text-[7px] font-black uppercase px-1.5 py-0.5 tracking-wide"
                                  style={{
                                    borderRadius: "var(--radius-btn)",
                                    background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                                    color: "color-mix(in srgb, var(--primary) 30%, transparent)",
                                    border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                                  }}>
                                  ???
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            </div>{/* fin contenedor scrolleable */}
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Spacer para móvil: el mapa es fixed, necesitamos darle altura al contenedor */}
      {isMobile && <div className="h-screen w-full" />}
    </div>
  );
}