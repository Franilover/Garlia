"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Loader2, ChevronRight, ArrowLeft, House, Save, Edit3 } from "lucide-react";
import QuickPinchZoom, { make3dTransformValue } from "react-quick-pinch-zoom";
import { supabase } from "@/lib/api/client/supabase";
import { useIsAdmin } from '@/hooks/auth/useIsAdmin'; // 👈

const Marker = ({ x, y, info, onClick, tipo }) => (
  <div
    className="absolute z-20 flex flex-col items-center"
    style={{ top: `${y}%`, left: `${x}%`, transform: "translate(-50%, -50%)" }}
  >
    <div className="mb-1 bg-[#6B5E70] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-sm shadow-lg whitespace-nowrap pointer-events-none border border-white/20">
      {info}
    </div>
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="relative flex items-center justify-center cursor-pointer outline-none group"
    >
      <div className="absolute w-5 h-5 bg-[#6B5E70]/20 rounded-full animate-ping" />
      <div className="w-4 h-4 bg-[#6B5E70] rounded-full border-2 border-white shadow-md group-hover:bg-white transition-all flex items-center justify-center">
        {tipo === "reino" ? (
          <MapPin size={8} className="text-white group-hover:text-[#6B5E70]" />
        ) : (
          <House size={8} className="text-white group-hover:text-[#6B5E70]" />
        )}
      </div>
    </button>
  </div>
);

export default function MapaInteractivo() {
  const isAdmin = useIsAdmin(); // 👈 una línea
  const [reinos, setReinos] = useState([]);
  const [detallesReino, setDetallesReino] = useState([]);
  const [vistaActual, setVistaActual] = useState("global");
  const [reinoSeleccionado, setReinoSeleccionado] = useState(null);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cargandoImagen, setCargandoImagen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mapRef = useRef(null);

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
  }, []);

  const handleReinoClick = async (reino) => {
    if (editMode) { setReinoSeleccionado(reino); return; }
    setCargandoImagen(true);
    setReinoSeleccionado(reino);
    const { data, error } = await supabase.from("reino_detalles").select("*").eq("reino_id", reino.id);
    if (error) console.error(error);
    else setDetallesReino(data);
    setVistaActual("reino");
  };

  const handleMapClick = (e) => {
    if (!editMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (puntoSeleccionado) {
      setPuntoSeleccionado({ ...puntoSeleccionado, coord_x: parseFloat(x.toFixed(2)), coord_y: parseFloat(y.toFixed(2)) });
    } else if (reinoSeleccionado && vistaActual === "global") {
      setReinoSeleccionado({ ...reinoSeleccionado, coord_x: parseFloat(x.toFixed(2)), coord_y: parseFloat(y.toFixed(2)) });
      setReinos(prev => prev.map(r => r.id === reinoSeleccionado.id ? { ...r, coord_x: x.toFixed(2), coord_y: y.toFixed(2) } : r));
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      if (puntoSeleccionado) {
        const { error } = await supabase.from("reino_detalles").update({
          nombre: puntoSeleccionado.nombre,
          descripcion: puntoSeleccionado.descripcion,
          coord_x: puntoSeleccionado.coord_x,
          coord_y: puntoSeleccionado.coord_y
        }).eq("id", puntoSeleccionado.id);
        if (error) throw error;
        setDetallesReino(prev => prev.map(p => p.id === puntoSeleccionado.id ? puntoSeleccionado : p));
      } else if (reinoSeleccionado) {
        const { error } = await supabase.from("reinos").update({
          nombre: reinoSeleccionado.nombre,
          descripcion: reinoSeleccionado.descripcion,
          coord_x: reinoSeleccionado.coord_x,
          coord_y: reinoSeleccionado.coord_y
        }).eq("id", reinoSeleccionado.id);
        if (error) throw error;
        setReinos(prev => prev.map(r => r.id === reinoSeleccionado.id ? reinoSeleccionado : r));
      }
      setEditMode(false);
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("No se pudieron guardar los cambios.");
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
    setEditMode(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#6B5E70]">
      <Loader2 className="animate-spin mb-2" />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Desplegando Mapa...</span>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row w-full min-h-[600px] bg-[#F8F5F2] overflow-hidden">
      <div className={`relative transition-all duration-500 ease-in-out ${vistaActual === "reino" ? "w-full md:w-2/3" : "w-full"}`}>

        {/* Controles solo para admins */}
        {isAdmin && (
          <div className="absolute top-6 right-6 z-[70] flex gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all shadow-xl border ${editMode ? "bg-red-500 text-white border-red-600" : "bg-white text-[#6B5E70] border-[#6B5E70]/20"}`}
            >
              {editMode ? <X size={14} /> : <Edit3 size={14} />}
              {editMode ? "Cancelar" : "Editar Mapa"}
            </button>
            {editMode && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-full text-[10px] font-black uppercase shadow-xl hover:bg-green-700 disabled:opacity-50 transition-all"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {cargandoImagen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-[#F8F5F2] flex flex-col items-center justify-center"
            >
              <Loader2 className="animate-spin text-[#6B5E70] mb-2" />
              <span className="text-[8px] font-black uppercase tracking-widest text-[#6B5E70]/40">Cargando Cartografía...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {vistaActual === "reino" && (
            <motion.button
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onClick={volverAlGlobal}
              className="absolute top-6 left-6 z-50 bg-white/90 backdrop-blur-md p-3 rounded-full shadow-xl border border-[#6B5E70]/20 text-[#6B5E70] hover:scale-110 transition-transform"
            >
              <ArrowLeft size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        <QuickPinchZoom onUpdate={onUpdate} maxZoom={5} minZoom={0.5} enabled={!editMode}>
          <div ref={mapRef} className="w-full h-full origin-top-left">
            <div
              className={`relative inline-block w-full ${editMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
              onClick={handleMapClick}
            >
              <img
                key={vistaActual === "reino" ? reinoSeleccionado?.id : "global"}
                src={vistaActual === "reino" ? reinoSeleccionado?.mapa_url : "/dibujos/reinos/mapa.png"}
                alt="Mapa"
                className="w-full h-auto block pointer-events-none select-none"
                onLoad={() => { window.dispatchEvent(new Event("resize")); setCargandoImagen(false); }}
              />
              {!cargandoImagen && (
                vistaActual === "global" ? (
                  reinos.map(reino => (
                    <Marker key={reino.id} x={reino.coord_x} y={reino.coord_y} info={reino.nombre} tipo="reino" onClick={() => handleReinoClick(reino)} />
                  ))
                ) : (
                  detallesReino.map(punto => (
                    <Marker key={punto.id} x={punto.coord_x} y={punto.coord_y} info={punto.nombre} tipo="detalle" onClick={() => setPuntoSeleccionado(punto)} />
                  ))
                )
              )}
            </div>
          </div>
        </QuickPinchZoom>
      </div>

      <AnimatePresence>
        {vistaActual === "reino" && reinoSeleccionado && (
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full md:w-1/3 bg-white border-l border-[#6B5E70]/10 p-10 flex flex-col z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.05)]"
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="h-1px w-8 bg-[#6B5E70]/30" />
              <span className="text-[10px] font-black text-[#6B5E70]/40 uppercase tracking-[0.2em]">
                {editMode ? "Editando Información" : (puntoSeleccionado ? "Lugar Hallado" : "Explorando Territorio")}
              </span>
            </div>

            {editMode ? (
              <div className="flex flex-col gap-4 flex-grow">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase text-[#6B5E70]/50 ml-2">Nombre del Lugar</label>
                  <input
                    type="text"
                    value={puntoSeleccionado ? puntoSeleccionado.nombre : reinoSeleccionado.nombre}
                    onChange={(e) => {
                      if (puntoSeleccionado) setPuntoSeleccionado({ ...puntoSeleccionado, nombre: e.target.value });
                      else setReinoSeleccionado({ ...reinoSeleccionado, nombre: e.target.value });
                    }}
                    className="w-full bg-[#6B5E70]/5 border border-[#6B5E70]/10 rounded-xl p-4 text-[#6B5E70] font-black uppercase text-xl outline-none focus:bg-white transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-grow">
                  <label className="text-[9px] font-bold uppercase text-[#6B5E70]/50 ml-2">Descripción / Lore</label>
                  <textarea
                    value={puntoSeleccionado ? puntoSeleccionado.descripcion : reinoSeleccionado.descripcion}
                    onChange={(e) => {
                      if (puntoSeleccionado) setPuntoSeleccionado({ ...puntoSeleccionado, descripcion: e.target.value });
                      else setReinoSeleccionado({ ...reinoSeleccionado, descripcion: e.target.value });
                    }}
                    className="w-full bg-[#6B5E70]/5 border border-[#6B5E70]/10 rounded-xl p-4 text-[#6B5E70] text-sm italic leading-relaxed outline-none focus:bg-white transition-all h-40 resize-none"
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-[#6B5E70] font-black text-4xl uppercase tracking-tighter mb-6 leading-none">
                  {puntoSeleccionado ? puntoSeleccionado.nombre : reinoSeleccionado.nombre}
                </h2>
                <div className="space-y-6 flex-grow overflow-y-auto pr-2">
                  <div className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/5">
                    <p className="text-[#6B5E70] text-sm italic leading-relaxed">
                      "{puntoSeleccionado ? puntoSeleccionado.descripcion : reinoSeleccionado.descripcion}"
                    </p>
                  </div>
                  {!puntoSeleccionado && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border border-[#6B5E70]/10 rounded-2xl">
                        <span className="block text-[8px] font-bold uppercase opacity-40">Ubicación</span>
                        <span className="text-[10px] font-black text-[#6B5E70]">{reinoSeleccionado.coord_x} / {reinoSeleccionado.coord_y}</span>
                      </div>
                      <div className="text-center p-4 border border-[#6B5E70]/10 rounded-2xl">
                        <span className="block text-[8px] font-bold uppercase opacity-40">Orden</span>
                        <span className="text-[10px] font-black text-[#6B5E70]">Nivel {reinoSeleccionado.orden}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="mt-8 flex flex-col gap-3">
              {puntoSeleccionado && !editMode && (
                <button
                  onClick={() => setPuntoSeleccionado(null)}
                  className="w-full bg-[#F8F5F2] text-[#6B5E70] text-[10px] font-black uppercase py-3 rounded-xl border border-[#6B5E70]/10 hover:bg-white transition-all"
                >
                  Volver al Reino
                </button>
              )}
              {!editMode && (
                <button className="w-full bg-[#6B5E70] text-white text-[11px] font-black uppercase py-5 px-8 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#5a4e5f] transition-all shadow-lg shadow-[#6B5E70]/20">
                  {puntoSeleccionado ? "Ver Lore del Punto" : "Ver personajes de este Reino"} <ChevronRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}