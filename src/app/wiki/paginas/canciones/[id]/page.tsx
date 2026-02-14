"use client";
import React, { useEffect, useState, useCallback, useReducer } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/supabase";
import { 
  ChevronLeft, Plus, Trash2, X, Edit3, Save, User, List, Music, 
  EyeOff, AlertCircle, Loader2, ChevronDown, Link2, ExternalLink,
  FileText, Copy, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SmartImage } from "@/components/shared/display/SmartImage";

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

const IDIOMAS = [
  { id: "es", label: "ES", nombre: "Español" },
  { id: "en", label: "EN", nombre: "Inglés" },
  { id: "jp", label: "JP", nombre: "Japonés" },
  { id: "romaji", label: "RO", nombre: "Reading" }
];

const ESTADOS = ["BORRADOR", "EN PROCESO", "TERMINADA"];

const getEstadoColor = (estado) => {
  const colores = {
    "TERMINADA": "bg-[#6B5E70]/10 text-[#6B5E70] border-[#6B5E70]/20",
    "EN PROCESO": "bg-[#FDFCFD] text-[#6B5E70]/80 border-[#6B5E70]/10",
    "BORRADOR": "bg-[#F4F4F5] text-[#6B5E70]/60 border-[#E4E4E7]"
  };
  return colores[estado] || colores["BORRADOR"];
};

// ============================================================================
// REDUCER PARA MODALES Y FORMULARIOS
// ============================================================================

const initialModalState = {
  showAddModal: false,
  showEditSecModal: false,
  showLinksModal: false,
  showFullLyricsModal: false,
  showMassEditModal: false,
  selectedSec: null,
  linkEditandoIndex: null,
  procesando: false
};

const modalReducer = (state, action) => {
  switch(action.type) {
    case "OPEN_ADD": return { ...state, showAddModal: true };
    case "CLOSE_ADD": return { ...state, showAddModal: false };
    case "OPEN_EDIT_SEC": return { ...state, showEditSecModal: true, selectedSec: action.payload };
    case "CLOSE_EDIT_SEC": return { ...state, showEditSecModal: false, selectedSec: null };
    case "OPEN_LINKS": return { ...state, showLinksModal: true };
    case "CLOSE_LINKS": return { ...state, showLinksModal: false, linkEditandoIndex: null };
    case "OPEN_FULL_LYRICS": return { ...state, showFullLyricsModal: true };
    case "CLOSE_FULL_LYRICS": return { ...state, showFullLyricsModal: false };
    case "OPEN_MASS_EDIT": return { ...state, showMassEditModal: true };
    case "CLOSE_MASS_EDIT": return { ...state, showMassEditModal: false };
    case "SET_EDITING_LINK": return { ...state, linkEditandoIndex: action.payload };
    case "SET_PROCESANDO": return { ...state, procesando: action.payload };
    default: return state;
  }
};

const initialFormState = {
  nuevoNombre: "",
  nuevaLetraEs: "",
  nuevaLetraEn: "",
  nuevaLetraJp: "",
  nuevaLetraRomaji: "",
  editSecNombre: "",
  editSecEs: "",
  editSecEn: "",
  editSecJp: "",
  editSecRomaji: "",
  nuevoLinkTitulo: "",
  nuevoLinkUrl: ""
};

const formReducer = (state, action) => {
  switch(action.type) {
    case "SET_NUEVA_SECCION": return { ...state, ...action.payload };
    case "SET_EDIT_SECCION": return { ...state, ...action.payload };
    case "SET_LINK": return { ...state, ...action.payload };
    case "RESET_NUEVA": return { ...state, nuevoNombre: "", nuevaLetraEs: "", nuevaLetraEn: "", nuevaLetraJp: "", nuevaLetraRomaji: "" };
    case "RESET_EDIT": return { ...state, editSecNombre: "", editSecEs: "", editSecEn: "", editSecJp: "", editSecRomaji: "" };
    case "RESET_LINK": return { ...state, nuevoLinkTitulo: "", nuevoLinkUrl: "" };
    default: return state;
  }
};

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const LanguageToggler = ({ idiomasActivos, toggleIdioma }) => (
  <div className="p-6 bg-[#6B5E70] rounded-[2.5rem] shadow-xl shadow-[#6B5E70]/20">
    <h4 className="text-white/40 font-black uppercase text-[8px] tracking-[0.2em] mb-4 text-center italic">
      Vista Comparativa
    </h4>
    <div className="grid grid-cols-2 gap-2">
      {IDIOMAS.map((l) => (
        <motion.button
          key={l.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => toggleIdioma(l.id)}
          title={l.nombre}
          className={`py-2 rounded-xl font-black text-[9px] transition-all uppercase border-2 ${
            idiomasActivos.includes(l.id)
              ? "bg-white text-[#6B5E70] border-white scale-105"
              : "bg-transparent text-white/40 border-white/10 hover:border-white/30"
          }`}
        >
          {l.label}
        </motion.button>
      ))}
    </div>
    <p className="text-white/20 text-[7px] text-center mt-3 font-bold uppercase tracking-widest">
      Máx. 2 idiomas
    </p>
  </div>
);

const EstadoSelector = ({ estado, isAdmin, onchange }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative p-4 rounded-[2rem] border text-center ${getEstadoColor(estado)} shadow-sm transition-all`}
  >
    {isAdmin ? (
      <div className="flex items-center justify-center gap-2 relative">
        <select
          value={estado}
          onChange={(e) => onchange(e.target.value)}
          className="bg-transparent font-black uppercase text-[9px] tracking-[0.2em] outline-none cursor-pointer appearance-none text-center w-full pr-8"
        >
          {ESTADOS.map((est) => (
            <option key={est} value={est}>
              {est}
            </option>
          ))}
        </select>
        <ChevronDown size={10} className="absolute right-6 opacity-40 pointer-events-none" />
      </div>
    ) : (
      <h4 className="font-black uppercase text-[9px] tracking-[0.2em]">{estado}</h4>
    )}
  </motion.div>
);

const LinkSection = ({ links, isAdmin, onOpenModal, onEdit, onDelete }) => (
  <div className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 italic">
        <Link2 size={12} /> Enlaces
      </h4>
      {isAdmin && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenModal}
          className="text-[#6B5E70]/40 hover:text-[#6B5E70] transition-colors"
        >
          <Plus size={14} />
        </motion.button>
      )}
    </div>
    <div className="space-y-2">
      {links && links.length > 0 ? (
        links.map((link, idx) => (
          <motion.a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ x: 4 }}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#6B5E70]/10 hover:border-[#6B5E70] transition-all group"
          >
            <span className="text-[10px] font-bold text-[#6B5E70] uppercase italic truncate mr-2">
              {link.titulo}
            </span>
            <ExternalLink size={10} className="text-[#6B5E70]/30 group-hover:text-[#6B5E70]" />
          </motion.a>
        ))
      ) : (
        <p className="text-[#6B5E70]/30 text-[9px] font-bold uppercase italic text-center py-2">
          Sin referencias
        </p>
      )}
    </div>
  </div>
);

// ============================================================================
// MODAL DE EDICIÓN MASIVA (CON REORDENAR, AÑADIR Y BORRAR)
// ============================================================================

const MassEditModal = ({ isOpen, onClose, secciones, onSave, isProcessing }) => {
  const [localSecciones, setLocalSecciones] = useState([]);
  const [activeTab, setActiveTab] = useState("es");

  useEffect(() => {
    if (isOpen) {
      setLocalSecciones(JSON.parse(JSON.stringify(secciones)));
    }
  }, [isOpen, secciones]);

  const handleChange = (id, field, value) => {
    setLocalSecciones(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const moverSeccion = (index, direccion) => {
    const nuevas = [...localSecciones];
    const [item] = nuevas.splice(index, 1);
    nuevas.splice(index + direccion, 0, item);
    setLocalSecciones(nuevas);
  };

  const eliminarSeccion = (index) => {
    if (confirm("¿Eliminar esta sección de la canción?")) {
      setLocalSecciones(prev => prev.filter((_, i) => i !== index));
    }
  };

  const añadirSeccion = () => {
    const nueva = {
      id: `temp-${Date.now()}`,
      nombre_seccion: "NUEVA SECCIÓN",
      letra_es: "",
      letra_en: "",
      letra_jp: "",
      letra_romaji: ""
    };
    setLocalSecciones(prev => [...prev, nueva]);
  };

  const handleGuardar = () => {
    const seccionesConOrden = localSecciones.map((s, idx) => ({
      ...s,
      orden: idx + 1
    }));
    onSave(seccionesConOrden);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#6B5E70]/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[#FDFCFD] w-full max-w-6xl h-full md:h-[90vh] md:rounded-[3rem] shadow-2xl relative z-10 border border-[#6B5E70]/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-10 py-6 border-b border-[#6B5E70]/10 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="bg-[#6B5E70] p-2 rounded-xl text-white">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-[#6B5E70] font-black uppercase text-[12px] tracking-[0.3em] italic">
                    Editor Maestro
                  </h3>
                  <p className="text-[8px] font-bold text-[#6B5E70]/40 uppercase tracking-widest mt-1">
                    Gestionando {localSecciones.length} secciones
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex gap-1 bg-[#6B5E70]/5 p-1 rounded-xl border border-[#6B5E70]/10">
                  {IDIOMAS.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setActiveTab(lang.id)}
                      className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase transition-all ${
                        activeTab === lang.id
                          ? "bg-[#6B5E70] text-white shadow-md"
                          : "text-[#6B5E70]/40 hover:text-[#6B5E70]"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  onClick={onClose}
                  className="text-[#6B5E70]/20 hover:text-red-500 transition-all p-2"
                >
                  <X size={24} />
                </motion.button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              {localSecciones.map((sec, idx) => (
                <div key={sec.id} className="group relative bg-white border border-[#6B5E70]/5 p-6 rounded-[2rem] hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <button 
                          disabled={idx === 0}
                          onClick={() => moverSeccion(idx, -1)}
                          className="text-[#6B5E70]/20 hover:text-[#6B5E70] disabled:opacity-0"
                        >
                          <ChevronDown size={14} className="rotate-180" />
                        </button>
                        <button 
                          disabled={idx === localSecciones.length - 1}
                          onClick={() => moverSeccion(idx, 1)}
                          className="text-[#6B5E70]/20 hover:text-[#6B5E70] disabled:opacity-0"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                      <span className="text-[10px] font-black text-[#6B5E70]/20 uppercase italic">
                        #{(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <input 
                        type="text"
                        value={sec.nombre_seccion}
                        onChange={(e) => handleChange(sec.id, "nombre_seccion", e.target.value.toUpperCase())}
                        className="bg-transparent border-b border-[#6B5E70]/10 text-[#6B5E70] font-black uppercase text-[10px] tracking-widest outline-none focus:border-[#6B5E70] transition-colors pb-1"
                        placeholder="NOMBRE DE SECCIÓN"
                      />
                    </div>
                    
                    <button 
                      onClick={() => eliminarSeccion(idx)}
                      className="text-[#6B5E70]/10 hover:text-red-400 transition-colors p-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <textarea
                    value={sec[`letra_${activeTab}`] || ""}
                    onChange={(e) => handleChange(sec.id, `letra_${activeTab}`, e.target.value)}
                    rows={Math.max(3, (sec[`letra_${activeTab}`]?.split('\n').length || 0))}
                    className="w-full bg-[#FDFCFD] border border-[#6B5E70]/5 rounded-[1.5rem] p-6 text-[#6B5E70] text-sm italic font-serif leading-relaxed outline-none focus:bg-white focus:border-[#6B5E70]/30 transition-all resize-none"
                    placeholder={`Escribe la letra en ${IDIOMAS.find(i => i.id === activeTab)?.nombre.toLowerCase()}...`}
                  />
                </div>
              ))}

              <button 
                onClick={añadirSeccion}
                className="w-full py-8 border-2 border-dashed border-[#6B5E70]/10 rounded-[2rem] text-[#6B5E70]/30 hover:border-[#6B5E70]/30 hover:text-[#6B5E70] hover:bg-[#6B5E70]/5 transition-all flex flex-col items-center justify-center gap-2"
              >
                <Plus size={20} />
                <span className="font-black uppercase text-[10px] tracking-widest">Añadir nueva sección</span>
              </button>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-[#6B5E70]/10 bg-white flex justify-end gap-4">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-8 py-3 rounded-xl text-[#6B5E70] font-black uppercase text-[10px] hover:bg-[#6B5E70]/5 transition-all"
              >
                Descartar cambios
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGuardar}
                disabled={isProcessing}
                className="bg-[#6B5E70] text-white px-12 py-3 rounded-xl font-black uppercase text-[10px] shadow-xl hover:bg-[#5A4D5F] transition-all flex items-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Guardar todo
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// MODAL DE LECTURA COMPLETA
// ============================================================================
const FullLyricsModal = ({ isOpen, onClose, secciones, idiomaActivo }) => {
  // Cambiamos el zoom inicial a 0.8 para que se vea más lejos por defecto
  const [zoom, setZoom] = React.useState(0.8);

  const handleCopy = () => {
    const langCode = Array.isArray(idiomaActivo) ? idiomaActivo[0] : idiomaActivo;
    const key = `letra_${langCode}`;
    const textoCompleto = secciones.map(s => s[key] || "").filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(textoCompleto);
    alert("¡Letra copiada al portapapeles!");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#6B5E70]/90 backdrop-blur-2xl"
          />
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="bg-[#FDFCFD] w-full max-w-[98vw] md:rounded-[2rem] shadow-2xl relative z-[10000] border border-[#6B5E70]/20 h-full md:h-[95vh] flex flex-col overflow-hidden"
          >
            {/* Header del Modal */}
            <div className="px-8 py-4 border-b border-[#6B5E70]/10 flex items-center justify-between bg-white z-30">
              <div className="flex items-center gap-4">
                <Music size={18} className="text-[#6B5E70]" />
                <h3 className="text-[#6B5E70] font-black uppercase text-[11px] tracking-[0.4em] italic">
                  Lectura Completa
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-[#6B5E70]/5 rounded-xl px-3 py-1.5">
                  <button onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))} className="text-[#6B5E70] hover:scale-110 px-2 font-bold text-lg">−</button>
                  <span className="text-[10px] font-black text-[#6B5E70]/60 min-w-[35px] text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(prev => Math.min(1.2, prev + 0.1))} className="text-[#6B5E70] hover:scale-110 px-2 font-bold text-lg">+</button>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-[#6B5E70] bg-[#6B5E70]/5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-[#6B5E70]/10"
                  >
                    <Copy size={14} /> Copiar
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} onClick={onClose} className="text-[#6B5E70]/40 p-2 hover:text-red-500 transition-all">
                    <X size={24} />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Área de la letra con scroll mejorado */}
            <div className="flex-1 overflow-auto bg-[#FDFCFD] selection:bg-[#6B5E70]/10 custom-scrollbar">
              <div 
                className="w-full h-fit p-8 md:p-20 transition-all duration-300 ease-out origin-top"
                style={{ 
                  transform: `scale(${zoom})`,
                  width: `${100 / zoom}%`, // Ajusta el ancho para compensar la escala
                  marginLeft: `${(100 - (100 / zoom)) / 2}%` // Centra el contenido escalado
                }}
              >
                {secciones.map((seccion) => {
                  const lang = Array.isArray(idiomaActivo) ? idiomaActivo[0] : "es";
                  const texto = seccion[`letra_${lang}`];
                  return texto ? (
                    <div key={seccion.id} className="mb-20 last:mb-0 max-w-5xl mx-auto text-center">
                      <div className="mb-10 flex items-center justify-center gap-8 opacity-20">
                        <div className="h-[1px] flex-1 max-w-[100px] bg-[#6B5E70]" />
                        <span className="text-[14px] font-black uppercase tracking-[0.5em] italic text-[#6B5E70]">{seccion.nombre_seccion}</span>
                        <div className="h-[1px] flex-1 max-w-[100px] bg-[#6B5E70]" />
                      </div>
                      <p className="text-[#3A323D] text-3xl md:text-5xl lg:text-6xl font-medium italic font-serif leading-[1.5] whitespace-pre-wrap break-words">
                        {texto}
                      </p>
                    </div>
                  ) : null;
                })}
                <div className="h-40" />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
// ============================================================================
// MODAL DE ENLACES
// ============================================================================

const LinksModal = ({ isOpen, onClose, isProcessing, titulo, onTituloChange, url, onUrlChange, onSave, links, onEdit, onDelete, isEditing }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
          <motion.button whileHover={{ rotate: 90 }} onClick={onClose} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70] transition-colors">
            <X size={20} />
          </motion.button>
          <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">{isEditing ? "Editar Enlace" : "Gestionar Enlaces"}</h3>
          <form onSubmit={onSave} className="space-y-4 mb-8">
            <input type="text" placeholder="TÍTULO" value={titulo} onChange={(e) => onTituloChange(e.target.value)} className="w-full bg-[#FDFCFD] border-b border-[#6B5E70]/10 py-3 text-sm font-bold text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-0 uppercase" />
            <input type="url" placeholder="URL" value={url} onChange={(e) => onUrlChange(e.target.value)} className="w-full bg-[#FDFCFD] border-b border-[#6B5E70]/10 py-3 text-sm font-medium text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-0" />
            <div className="flex gap-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isProcessing || !titulo.trim() || !url.trim()} className="flex-1 bg-[#6B5E70] text-white py-3 rounded-xl font-black uppercase text-[9px] shadow-md hover:bg-[#5A4D5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {isProcessing ? <><Loader2 size={12} className="inline animate-spin mr-2" />Guardando...</> : isEditing ? "Guardar" : "Añadir"}
              </motion.button>
              {isEditing && <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={onClose} className="px-4 bg-gray-100 text-[#6B5E70] rounded-xl font-black uppercase text-[8px] hover:bg-gray-200 transition-colors">Cancelar</motion.button>}
            </div>
          </form>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {links?.map((link, i) => (
              <motion.div key={i} layout className="flex items-center justify-between p-3 rounded-xl border bg-[#6B5E70]/5 border-[#6B5E70]/10 hover:bg-[#6B5E70]/10 transition-colors">
                <span className="text-[10px] font-black text-[#6B5E70] truncate uppercase italic">{link.titulo}</span>
                <div className="flex gap-1">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onEdit(i)} className="text-[#6B5E70]/40 hover:text-[#6B5E70] p-1 transition-colors"><Edit3 size={14} /></motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(i)} className="text-red-400 hover:text-red-600 p-1 transition-colors"><Trash2 size={14} /></motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ============================================================================
// MODAL DE SECCIÓN (EDITOR INDIVIDUAL)
// ============================================================================

const SeccionModal = ({ isOpen, isEditing, onClose, isProcessing, nombre, onNombreChange, es, onEsChange, en, onEnChange, jp, onJpChange, romaji, onRomajiChange, onSave, onDelete = null }) => {
  const [activeTab, setActiveTab] = React.useState("es");
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl relative z-10 border border-[#6B5E70]/10 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#6B5E70]/10 flex items-center justify-between">
              <h3 className="text-[#6B5E70] font-black uppercase text-[11px] tracking-[0.3em] italic">{isEditing ? "✏️ Editar Sección" : "➕ Nueva Sección"}</h3>
              <motion.button whileHover={{ rotate: 90 }} onClick={onClose} className="text-[#6B5E70]/20 hover:text-[#6B5E70] transition-colors"><X size={20} /></motion.button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-6">
                <div>
                  <label className="text-[8px] font-black text-[#6B5E70]/40 uppercase mb-2 block italic tracking-widest">Nombre de la sección</label>
                  <input autoFocus type="text" placeholder="ESTROFA, CORO, PUENTE, PRE-CORO..." value={nombre} onChange={(e) => onNombreChange(e.target.value)} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-3 px-4 text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] rounded-xl uppercase" />
                </div>
                <div className="border-b border-[#6B5E70]/10">
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {IDIOMAS.map((lang) => (
                      <button key={lang.id} type="button" onClick={() => setActiveTab(lang.id)} className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === lang.id ? "bg-[#6B5E70] text-white shadow-md" : "bg-[#6B5E70]/5 text-[#6B5E70]/60 hover:bg-[#6B5E70]/10"}`}>
                        {lang.label} - {lang.nombre}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {activeTab === "es" && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2"><label className="text-[8px] font-black text-[#6B5E70]/40 uppercase block italic">Español</label><textarea value={es} onChange={(e) => onEsChange(e.target.value)} placeholder="Escribe la letra en español..." rows={8} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 resize-none italic font-serif leading-relaxed" /><p className="text-[10px] text-[#6B5E70]/40 italic">{es.length} caracteres</p></motion.div>}
                  {activeTab === "en" && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2"><label className="text-[8px] font-black text-[#6B5E70]/40 uppercase block italic">Inglés</label><textarea value={en} onChange={(e) => onEnChange(e.target.value)} placeholder="Escribe la letra en inglés..." rows={8} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 resize-none italic font-serif leading-relaxed" /><p className="text-[10px] text-[#6B5E70]/40 italic">{en.length} caracteres</p></motion.div>}
                  {activeTab === "jp" && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2"><label className="text-[8px] font-black text-[#6B5E70]/40 uppercase block italic">Japonés</label><textarea value={jp} onChange={(e) => onJpChange(e.target.value)} placeholder="Escribe la letra en japonés..." rows={8} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 resize-none italic font-serif leading-relaxed" /><p className="text-[10px] text-[#6B5E70]/40 italic">{jp.length} caracteres</p></motion.div>}
                  {activeTab === "romaji" && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2"><label className="text-[8px] font-black text-[#6B5E70]/40 uppercase block italic">Romaji (Reading)</label><textarea value={romaji} onChange={(e) => onRomajiChange(e.target.value)} placeholder="Escribe la pronunciación romanizada..." rows={8} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 resize-none italic font-serif leading-relaxed" /><p className="text-[10px] text-[#6B5E70]/40 italic">{romaji.length} caracteres</p></motion.div>}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#6B5E70]/10 bg-[#FDFCFD] flex gap-3">
              <button onClick={onClose} disabled={isProcessing} className="flex-1 px-4 py-3 rounded-xl border-2 border-[#6B5E70]/20 text-[#6B5E70] font-black uppercase text-[9px] hover:bg-[#6B5E70]/5 transition-colors">Cancelar</button>
              <button onClick={onSave} disabled={isProcessing || !nombre.trim() || !es.trim()} type="button" className="flex-1 px-4 py-3 rounded-xl bg-[#6B5E70] text-white font-black uppercase text-[9px] shadow-lg hover:bg-[#5A4D5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"><Save size={14} />{isProcessing ? "Guardando..." : "Guardar"}</button>
              {isEditing && onDelete && <button onClick={onDelete} disabled={isProcessing} className="px-4 py-3 rounded-xl bg-red-50 text-red-400 font-black uppercase text-[9px] border-2 border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"><Trash2 size={14} />Borrar</button>}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function CancionDetalle() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [cancion, setCancion] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState(false);
  const [idiomasActivos, setIdiomasActivos] = useState(["es"]);

  const [modalState, dispatchModal] = useReducer(modalReducer, initialModalState);
  const [formState, dispatchForm] = useReducer(formReducer, initialFormState);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const adminStatus = !!session;
      setIsAdmin(adminStatus);
      const { data: cancionData, error: errorC } = await supabase.from("canciones").select("*").eq("id", id).single();
      if (errorC || !cancionData) { setErrorAcceso(true); return; }
      if (!cancionData.visible && !adminStatus) { setErrorAcceso(true); return; }
      setCancion(cancionData);
      const { data: seccionesData, error: errorS } = await supabase.from("secciones_cancion").select("*").eq("cancion_id", id).order("orden", { ascending: true });
      if (errorS) throw errorS;
      setSecciones(seccionesData || []);
    } catch (err) {
      console.error("Error en la carga:", err);
      setErrorAcceso(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleIdioma = useCallback((idm) => {
    setIdiomasActivos((prev) => {
      if (prev.includes(idm)) return prev.length === 1 ? prev : prev.filter((i) => i !== idm);
      if (prev.length >= 2) return [prev[prev.length - 1], idm];
      return [...prev, idm];
    });
  }, []);

  const handleSaveLink = async (e) => {
    e.preventDefault();
    const { nuevoLinkTitulo, nuevoLinkUrl } = formState;
    if (!nuevoLinkTitulo.trim() || !nuevoLinkUrl.trim() || modalState.procesando) return;
    dispatchModal({ type: "SET_PROCESANDO", payload: true });
    try {
      let linksActuales = Array.isArray(cancion?.links) ? [...cancion.links] : [];
      const nuevoLink = { titulo: nuevoLinkTitulo.trim(), url: nuevoLinkUrl.trim() };
      if (modalState.linkEditandoIndex !== null) linksActuales[modalState.linkEditandoIndex] = nuevoLink;
      else linksActuales.push(nuevoLink);
      const { error } = await supabase.from("canciones").update({ links: linksActuales }).eq("id", id);
      if (error) throw error;
      setCancion((prev) => ({ ...prev, links: linksActuales }));
      dispatchForm({ type: "RESET_LINK" });
      dispatchModal({ type: "SET_EDITING_LINK", payload: null });
      dispatchModal({ type: "CLOSE_LINKS" });
    } catch (error) {
      alert("Error: " + (error.message || "No se pudo guardar el enlace"));
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  const prepararEdicionLink = useCallback((index) => {
    const link = cancion.links[index];
    dispatchForm({ type: "SET_LINK", payload: { nuevoLinkTitulo: link.titulo, nuevoLinkUrl: link.url } });
    dispatchModal({ type: "SET_EDITING_LINK", payload: index });
  }, [cancion?.links]);

  const removeLink = async (index) => {
    if (!confirm("¿Eliminar este enlace?")) return;
    try {
      const filtrados = (cancion?.links || []).filter((_, i) => i !== index);
      const { error } = await supabase.from("canciones").update({ links: filtrados }).eq("id", id);
      if (error) throw error;
      setCancion((prev) => ({ ...prev, links: filtrados }));
    } catch (error) {
      alert("Error al borrar el enlace");
    }
  };

  const handleUpdateEstado = async (nuevoEstado) => {
    try {
      setCancion((prev) => ({ ...prev, estado: nuevoEstado }));
      const { error } = await supabase.from("canciones").update({ estado: nuevoEstado }).eq("id", id);
      if (error) throw error;
    } catch (error) {
      await fetchData();
    }
  };

  const handleCrearSeccion = async (e) => {
    e.preventDefault();
    const { nuevoNombre, nuevaLetraEs, nuevaLetraEn, nuevaLetraJp, nuevaLetraRomaji } = formState;
    if (!nuevoNombre.trim() || !nuevaLetraEs.trim() || modalState.procesando) return;
    dispatchModal({ type: "SET_PROCESANDO", payload: true });
    try {
      const { data, error } = await supabase.from("secciones_cancion").insert([{
        cancion_id: id,
        nombre_seccion: nuevoNombre.toUpperCase(),
        letra_es: nuevaLetraEs,
        letra_en: nuevaLetraEn,
        letra_jp: nuevaLetraJp,
        letra_romaji: nuevaLetraRomaji,
        orden: secciones.length + 1
      }]).select();
      if (error) throw error;
      if (data) setSecciones((prev) => [...prev, data[0]]);
      dispatchForm({ type: "RESET_NUEVA" });
      dispatchModal({ type: "CLOSE_ADD" });
    } catch (error) {
      alert("Error: " + (error.message || "No se pudo crear la sección"));
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  const handleUpdateSeccion = async (e) => {
    e.preventDefault();
    const { editSecNombre, editSecEs, editSecEn, editSecJp, editSecRomaji } = formState;
    const { selectedSec } = modalState;
    if (!editSecNombre.trim() || !editSecEs.trim() || modalState.procesando) return;
    dispatchModal({ type: "SET_PROCESANDO", payload: true });
    try {
      const { error } = await supabase.from("secciones_cancion").update({
        nombre_seccion: editSecNombre.toUpperCase(),
        letra_es: editSecEs,
        letra_en: editSecEn,
        letra_jp: editSecJp,
        letra_romaji: editSecRomaji
      }).eq("id", selectedSec.id);
      if (error) throw error;
      setSecciones((prev) => prev.map((s) => s.id === selectedSec.id ? { ...s, nombre_seccion: editSecNombre.toUpperCase(), letra_es: editSecEs, letra_en: editSecEn, letra_jp: editSecJp, letra_romaji: editSecRomaji } : s));
      dispatchForm({ type: "RESET_EDIT" });
      dispatchModal({ type: "CLOSE_EDIT_SEC" });
    } catch (error) {
      alert("Error: " + (error.message || "No se pudo actualizar la sección"));
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  // ========================================================================
  // GUARDADO MASIVO (SINCRONIZACIÓN TOTAL)
  // ========================================================================
  const handleMassUpdate = async (seccionesActualizadas) => {
    dispatchModal({ type: "SET_PROCESANDO", payload: true });
    try {
      // 1. Eliminamos las secciones actuales de esta canción
      const { error: deleteError } = await supabase
        .from("secciones_cancion")
        .delete()
        .eq("cancion_id", id);

      if (deleteError) throw deleteError;

      // 2. Preparamos el nuevo set de datos para insertar
      const nuevasSecciones = seccionesActualizadas.map((sec) => ({
        cancion_id: id,
        nombre_seccion: sec.nombre_seccion,
        letra_es: sec.letra_es,
        letra_en: sec.letra_en,
        letra_jp: sec.letra_jp,
        letra_romaji: sec.letra_romaji,
        orden: sec.orden
      }));

      // 3. Insertamos de golpe
      const { data: insertedData, error: insertError } = await supabase
        .from("secciones_cancion")
        .insert(nuevasSecciones)
        .select();

      if (insertError) throw insertError;

      // 4. Actualizamos estado local
      setSecciones(insertedData.sort((a, b) => a.orden - b.orden));
      dispatchModal({ type: "CLOSE_MASS_EDIT" });
      alert("¡Estructura de la canción actualizada correctamente!");
    } catch (error) {
      console.error("Error en update masivo:", error);
      alert("Hubo un error al guardar los cambios masivos.");
      fetchData(); // Resetear estado local por seguridad
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  const deleteSeccion = async () => {
    const { selectedSec } = modalState;
    if (!selectedSec) return;
    dispatchModal({ type: "SET_PROCESANDO", payload: true });
    try {
      const { error } = await supabase.from("secciones_cancion").delete().eq("id", selectedSec.id);
      if (error) throw error;
      setSecciones((prev) => prev.filter((s) => s.id !== selectedSec.id));
      dispatchModal({ type: "CLOSE_EDIT_SEC" });
    } catch (error) {
      alert("Error al borrar la sección");
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  const openEditSec = useCallback((seccion) => {
    dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecNombre: seccion.nombre_seccion, editSecEs: seccion.letra_es || "", editSecEn: seccion.letra_en || "", editSecJp: seccion.letra_jp || "", editSecRomaji: seccion.letra_romaji || "" } });
    dispatchModal({ type: "OPEN_EDIT_SEC", payload: seccion });
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFCFD] flex-col gap-4">
        <Loader2 className="text-[#6B5E70] animate-spin" size={32} />
        <p className="text-[#6B5E70] uppercase text-[10px] tracking-widest italic font-black">Afinando instrumentos...</p>
      </div>
    );
  }

  if (errorAcceso) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFCFD] flex-col gap-4">
        <AlertCircle className="text-red-400" size={48} />
        <p className="text-[#6B5E70] uppercase text-[10px] tracking-widest italic font-black">Acceso denegado o canción no encontrada</p>
        <button onClick={() => router.push("/wiki/paginas/canciones")} className="mt-4 bg-[#6B5E70] text-white px-6 py-2 rounded-full font-black text-sm hover:bg-[#5A4D5F]">Volver</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20 relative">
      <LinksModal isOpen={modalState.showLinksModal} onClose={() => { dispatchModal({ type: "CLOSE_LINKS" }); dispatchForm({ type: "RESET_LINK" }); }} isProcessing={modalState.procesando} titulo={formState.nuevoLinkTitulo} onTituloChange={(val) => dispatchForm({ type: "SET_LINK", payload: { nuevoLinkTitulo: val } })} url={formState.nuevoLinkUrl} onUrlChange={(val) => dispatchForm({ type: "SET_LINK", payload: { nuevoLinkUrl: val } })} onSave={handleSaveLink} links={cancion?.links || []} onEdit={prepararEdicionLink} onDelete={removeLink} isEditing={modalState.linkEditandoIndex !== null} />
      <SeccionModal isOpen={modalState.showAddModal} isEditing={false} onClose={() => { dispatchModal({ type: "CLOSE_ADD" }); dispatchForm({ type: "RESET_NUEVA" }); }} isProcessing={modalState.procesando} nombre={formState.nuevoNombre} onNombreChange={(val) => dispatchForm({ type: "SET_NUEVA_SECCION", payload: { nuevoNombre: val } })} es={formState.nuevaLetraEs} onEsChange={(val) => dispatchForm({ type: "SET_NUEVA_SECCION", payload: { nuevaLetraEs: val } })} en={formState.nuevaLetraEn} onEnChange={(val) => dispatchForm({ type: "SET_NUEVA_SECCION", payload: { nuevaLetraEn: val } })} jp={formState.nuevaLetraJp} onJpChange={(val) => dispatchForm({ type: "SET_NUEVA_SECCION", payload: { nuevaLetraJp: val } })} romaji={formState.nuevaLetraRomaji} onRomajiChange={(val) => dispatchForm({ type: "SET_NUEVA_SECCION", payload: { nuevaLetraRomaji: val } })} onSave={handleCrearSeccion} />
      <SeccionModal isOpen={modalState.showEditSecModal} isEditing={true} onClose={() => { dispatchModal({ type: "CLOSE_EDIT_SEC" }); dispatchForm({ type: "RESET_EDIT" }); }} isProcessing={modalState.procesando} nombre={formState.editSecNombre} onNombreChange={(val) => dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecNombre: val } })} es={formState.editSecEs} onEsChange={(val) => dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecEs: val } })} en={formState.editSecEn} onEnChange={(val) => dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecEn: val } })} jp={formState.editSecJp} onJpChange={(val) => dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecJp: val } })} romaji={formState.editSecRomaji} onRomajiChange={(val) => dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecRomaji: val } })} onSave={handleUpdateSeccion} onDelete={() => { if (confirm("¿Borrar esta sección? No se puede deshacer.")) deleteSeccion(); }} />
      <FullLyricsModal isOpen={modalState.showFullLyricsModal} onClose={() => dispatchModal({ type: "CLOSE_FULL_LYRICS" })} secciones={secciones} idiomaActivo={idiomasActivos} />
      
      <MassEditModal 
        isOpen={modalState.showMassEditModal}
        onClose={() => dispatchModal({ type: "CLOSE_MASS_EDIT" })}
        secciones={secciones}
        isProcessing={modalState.procesando}
        onSave={handleMassUpdate}
      />

      <motion.button whileHover={{ x: -4 }} onClick={() => router.push("/wiki/paginas/canciones")} className="p-8 text-[#6B5E70]/40 hover:text-[#6B5E70] flex items-center gap-2 font-black text-[10px] uppercase transition-colors italic"><ChevronLeft size={16} />Volver al Cancionero</motion.button>

      <div className={`mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-16 mt-4 transition-all duration-500 ${idiomasActivos.length > 1 ? "max-w-7xl" : "max-w-5xl"}`}>
        <aside className="space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#6B5E70]/10">
            <SmartImage src={cancion?.portada_url || "/placeholder-cover.jpg"} alt={cancion?.titulo} className="w-full h-full object-cover" />
          </motion.div>
          {isAdmin && !cancion?.visible && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-[#604b68] text-white rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl"><EyeOff size={16} /><span className="font-black uppercase text-[9px] tracking-widest italic">Oculto</span></motion.div>}
          {cancion?.estado && <EstadoSelector estado={cancion.estado} isAdmin={isAdmin} onchange={handleUpdateEstado} />}
          <LanguageToggler idiomasActivos={idiomasActivos} toggleIdioma={toggleIdioma} />
          {cancion?.personaje && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10"><h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic"><User size={12} />Personaje</h4><p className="text-[#6B5E70] font-bold text-sm italic">{cancion.personaje}</p></motion.div>}
          <LinkSection links={cancion?.links} isAdmin={isAdmin} onOpenModal={() => { dispatchForm({ type: "RESET_LINK" }); dispatchModal({ type: "OPEN_LINKS" }); }} onEdit={prepararEdicionLink} onDelete={removeLink} />
        </aside>

        <main>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="text-6xl font-black text-[#6B5E70] italic tracking-tighter leading-[0.85] mb-6 uppercase">{cancion?.titulo}</h1>
            <div className="h-1.5 w-24 bg-[#6B5E70]/10 rounded-full" />
          </motion.div>

          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8 border-b border-[#6B5E70]/10 pb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic"><List size={16} />Letra</h3>
                {secciones.length > 0 && (
                  <>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => dispatchModal({ type: "OPEN_FULL_LYRICS" })} className="flex items-center gap-1 px-3 py-1 bg-[#6B5E70]/5 rounded-lg text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors"><FileText size={12} /><span className="text-[8px] font-black uppercase tracking-widest">Lectura</span></motion.button>
                    {isAdmin && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => dispatchModal({ type: "OPEN_MASS_EDIT" })} className="flex items-center gap-1 px-3 py-1 bg-[#6B5E70]/5 rounded-lg text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors border border-[#6B5E70]/10"><Layers size={12} /><span className="text-[8px] font-black uppercase tracking-widest">Editor Maestro</span></motion.button>
                    )}
                  </>
                )}
              </div>
              {isAdmin && <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { dispatchForm({ type: "RESET_NUEVA" }); dispatchModal({ type: "OPEN_ADD" }); }} className="bg-[#6B5E70] text-white p-2 rounded-full shadow-lg hover:bg-[#5A4D5F] transition-colors"><Plus size={18} /></motion.button>}
            </div>

            <div className="space-y-12">
              {secciones.map((seccion, index) => (
                <motion.div key={seccion.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="relative group">
                  <div className={`bg-white border border-[#6B5E70]/5 rounded-[2.5rem] transition-all hover:border-[#6B5E70]/20 hover:shadow-2xl hover:shadow-[#6B5E70]/5 ${idiomasActivos.length > 1 ? "p-8 md:p-12" : "p-10"}`}>
                    <div className="flex items-center justify-between mb-8">
                      <span className="bg-[#F1F5F9] text-[#6B5E70]/60 px-4 py-1.5 rounded-full font-black text-[9px] tracking-widest uppercase italic">{seccion.nombre_seccion}</span>
                      {isAdmin && (
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openEditSec(seccion)} className="bg-[#6B5E70]/5 p-2 rounded-xl text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={14} /></motion.button>
                      )}
                    </div>
                    <div className={`grid gap-x-12 gap-y-8 ${idiomasActivos.length > 1 ? "md:grid-cols-2 divide-x-2 divide-[#6B5E70]/5" : "grid-cols-1"}`}>
                      {idiomasActivos.map((lang, i) => (
                        <div key={lang} className={`${i > 0 ? "md:pl-12" : ""}`}>
                          {idiomasActivos.length > 1 && <span className="text-[7px] font-black text-[#6B5E70]/20 uppercase tracking-[0.3em] block mb-4 italic">{IDIOMAS.find((x) => x.id === lang)?.nombre}</span>}
                          <div className={`text-[#6B5E70] leading-[1.8] font-medium whitespace-pre-wrap italic font-serif opacity-90 transition-all ${idiomasActivos.length > 1 ? "text-lg md:text-xl" : "text-xl md:text-2xl"}`}>
                            {lang === "es" && (seccion.letra_es || "---")}
                            {lang === "en" && (seccion.letra_en || "---")}
                            {lang === "jp" && (seccion.letra_jp || "---")}
                            {lang === "romaji" && (seccion.letra_romaji || "---")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {secciones.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 bg-[#6B5E70]/5 rounded-[3rem] border-2 border-dashed border-[#6B5E70]/10"><Music size={48} className="mx-auto text-[#6B5E70]/20 mb-4" /><p className="text-[#6B5E70]/40 font-bold uppercase text-sm tracking-widest mb-6 italic">El lienzo está en blanco</p>{isAdmin && <button onClick={() => { dispatchForm({ type: "RESET_NUEVA" }); dispatchModal({ type: "OPEN_ADD" }); }} className="bg-[#6B5E70] text-white px-8 py-3 rounded-full font-black uppercase text-[10px] shadow-lg hover:bg-[#5A4D5F] transition-colors">Escribir primer verso</button>}</motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}