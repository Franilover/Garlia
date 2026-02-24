"use client";
import React, { useEffect, useState, useCallback, useReducer, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { 
  ChevronLeft, Plus, Trash2, X, Edit3, Save, User, List, Music, 
  EyeOff, AlertCircle, Loader2, ChevronDown, Link2, ExternalLink,
  FileText, Copy, Layers, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SmartImage } from "@/components/shared/display/SmartImage";
import { MassEditModal } from "@/components/paginas/wiki/canciones/MassEditor";

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
            <option key={est} value={est}>{est}</option>
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
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 italic">
        <Link2 size={12} />Enlaces
      </h4>
      {isAdmin && (
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onOpenModal} className="text-[#6B5E70] hover:text-[#6B5E70]/60 transition-colors">
          <Plus size={14} />
        </motion.button>
      )}
    </div>
    {(!links || links.length === 0) ? (
      <p className="text-[#6B5E70]/40 text-xs italic">Sin enlaces</p>
    ) : (
      <div className="space-y-2">
        {links.map((link, i) => (
          <div key={i} className="flex items-center justify-between group">
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#6B5E70] hover:text-[#5A4D5F] transition-colors text-xs font-bold truncate flex-1">
              <ExternalLink size={10} className="flex-shrink-0" />
              <span className="truncate">{link.titulo}</span>
            </a>
            {isAdmin && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onEdit(i)} className="text-[#6B5E70]/40 hover:text-[#6B5E70] p-1"><Edit3 size={10} /></motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={10} /></motion.button>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </motion.div>
);

// ============================================================================
// MODAL DE LETRA COMPLETA
// ============================================================================
const FullLyricsModal = ({ isOpen, onClose, secciones, idiomaActivo }) => {
  const [zoom, setZoom] = useState(1);
  const handleCopy = () => {
    const lang = Array.isArray(idiomaActivo) ? idiomaActivo[0] : "es";
    const texto = secciones
      .map((s) => {
        const letraSeccion = s[`letra_${lang}`];
        return letraSeccion ? `${s.nombre_seccion}\n\n${letraSeccion}` : "";
      })
      .filter(Boolean)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(texto);
    alert("✅ Letra copiada al portapapeles");
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#6B5E70]/40 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[#FDFCFD] w-full max-w-5xl h-full md:h-[90vh] md:rounded-[3rem] shadow-2xl relative z-10 border border-[#6B5E70]/10 flex flex-col"
          >
            <div className="px-10 py-6 bg-white border-b border-[#6B5E70]/10 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-[#6B5E70] p-2 rounded-xl text-white"><FileText size={18} /></div>
                  <div>
                    <h3 className="text-[#6B5E70] font-black uppercase text-[12px] tracking-[0.3em] italic">Modo Lectura</h3>
                    <p className="text-[8px] font-bold text-[#6B5E70]/40 uppercase tracking-widest mt-1">
                      {IDIOMAS.find((i) => i.id === (Array.isArray(idiomaActivo) ? idiomaActivo[0] : "es"))?.nombre}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-8">
                    <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="w-8 h-8 flex items-center justify-center bg-[#6B5E70]/5 rounded-lg text-[#6B5E70] hover:bg-[#6B5E70]/10 transition-colors text-lg font-bold">-</button>
                    <span className="text-[10px] font-black text-[#6B5E70]/60 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="w-8 h-8 flex items-center justify-center bg-[#6B5E70]/5 rounded-lg text-[#6B5E70] hover:bg-[#6B5E70]/10 transition-colors text-lg font-bold">+</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopy} className="flex items-center gap-2 text-[#6B5E70] bg-[#6B5E70]/5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-[#6B5E70]/10">
                    <Copy size={14} /> Copiar
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} onClick={onClose} className="text-[#6B5E70]/40 p-2 hover:text-red-500 transition-all"><X size={24} /></motion.button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-[#FDFCFD] selection:bg-[#6B5E70]/10 custom-scrollbar">
              <div
                className="w-full h-fit p-8 md:p-20 transition-all duration-300 ease-out origin-top"
                style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%`, marginLeft: `${(100 - (100 / zoom)) / 2}%` }}
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
                      <p className="text-[#3A323D] text-3xl md:text-5xl lg:text-6xl font-medium italic font-serif leading-[1.5] whitespace-pre-wrap break-words">{texto}</p>
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
          <motion.button whileHover={{ rotate: 90 }} onClick={onClose} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70] transition-colors"><X size={20} /></motion.button>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-3xl rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <motion.button whileHover={{ rotate: 90 }} onClick={onClose} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70] transition-colors z-10"><X size={20} /></motion.button>
            <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">{isEditing ? "Editar Sección" : "Nueva Sección"}</h3>
            <div className="space-y-6">
              <input type="text" placeholder="NOMBRE DE LA SECCIÓN (Ej: ESTROFA, CORO)" value={nombre} onChange={(e) => onNombreChange(e.target.value.toUpperCase())} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-3 text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase tracking-widest" />
              <div className="flex gap-1 bg-[#6B5E70]/5 p-1 rounded-xl border border-[#6B5E70]/10">
                {IDIOMAS.map((lang) => (
                  <button key={lang.id} type="button" onClick={() => setActiveTab(lang.id)} className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase transition-all ${activeTab === lang.id ? "bg-[#6B5E70] text-white shadow-md" : "text-[#6B5E70]/40 hover:text-[#6B5E70]"}`}>{lang.label}</button>
                ))}
              </div>
              <div className="min-h-[200px]">
                {activeTab === "es" && <textarea value={es} onChange={(e) => onEsChange(e.target.value)} rows={8} className="w-full bg-[#FDFCFD] border border-[#6B5E70]/5 rounded-[2rem] p-6 text-[#6B5E70] text-sm italic font-serif leading-relaxed outline-none focus:bg-white focus:border-[#6B5E70]/30 transition-all resize-none" placeholder="Escribe la letra en español..." />}
                {activeTab === "en" && <textarea value={en} onChange={(e) => onEnChange(e.target.value)} rows={8} className="w-full bg-[#FDFCFD] border border-[#6B5E70]/5 rounded-[2rem] p-6 text-[#6B5E70] text-sm italic font-serif leading-relaxed outline-none focus:bg-white focus:border-[#6B5E70]/30 transition-all resize-none" placeholder="Escribe la letra en inglés..." />}
                {activeTab === "jp" && <textarea value={jp} onChange={(e) => onJpChange(e.target.value)} rows={8} className="w-full bg-[#FDFCFD] border border-[#6B5E70]/5 rounded-[2rem] p-6 text-[#6B5E70] text-sm italic font-serif leading-relaxed outline-none focus:bg-white focus:border-[#6B5E70]/30 transition-all resize-none" placeholder="日本語で歌詞を書く..." />}
                {activeTab === "romaji" && <textarea value={romaji} onChange={(e) => onRomajiChange(e.target.value)} rows={8} className="w-full bg-[#FDFCFD] border border-[#6B5E70]/5 rounded-[2rem] p-6 text-[#6B5E70] text-sm italic font-serif leading-relaxed outline-none focus:bg-white focus:border-[#6B5E70]/30 transition-all resize-none" placeholder="Kakikomi romaji..." />}
              </div>
              <div className="flex gap-4 pt-4">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onSave} disabled={isProcessing || !nombre.trim()} className="flex-1 bg-[#6B5E70] text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-md hover:bg-[#5A4D5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {isProcessing ? <><Loader2 size={14} className="animate-spin" />Guardando...</> : <><Save size={14} />Guardar Sección</>}
                </motion.button>
                {isEditing && onDelete && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onDelete} disabled={isProcessing} className="px-6 bg-red-500 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                    <Trash2 size={14} />Eliminar
                  </motion.button>
                )}
              </div>
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
export default function CancionDetallesPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [cancion, setCancion] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [idiomasActivos, setIdiomasActivos] = useState(["es"]);
  const [modalState, dispatchModal] = useReducer(modalReducer, initialModalState);
  const [formState, dispatchForm] = useReducer(formReducer, initialFormState);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [
        { data: { session } },
        { data: cancionData, error: errorC },
        { data: seccionesData, error: errorS }
      ] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from("canciones").select("*").eq("id", id).single(),
        supabase.from("secciones_cancion").select("*").eq("cancion_id", id).order("orden", { ascending: true })
      ]);
      const adminStatus = !!session;
      setIsAdmin(adminStatus);
      if (errorC || !cancionData) { setErrorAcceso(true); return; }
      if (!cancionData.visible && !adminStatus) { setErrorAcceso(true); return; }
      if (errorS) throw errorS;
      setCancion(cancionData);
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
      dispatchModal({ type: "SET_EDITING_LINK", payload: null });
    } catch (error) {
      alert("Error: " + (error.message || "No se pudo eliminar el enlace"));
    }
  };

  const handleUpdateEstado = async (nuevoEstado) => {
    try {
      const { error } = await supabase.from("canciones").update({ estado: nuevoEstado }).eq("id", id);
      if (error) throw error;
      setCancion((prev) => ({ ...prev, estado: nuevoEstado }));
    } catch (error) {
      alert("Error: " + (error.message || "No se pudo actualizar el estado"));
    }
  };

  const handleCrearSeccion = async () => {
    const { nuevoNombre, nuevaLetraEs, nuevaLetraEn, nuevaLetraJp, nuevaLetraRomaji } = formState;
    if (!nuevoNombre.trim() || modalState.procesando) return;
    dispatchModal({ type: "SET_PROCESANDO", payload: true });
    try {
      const maxOrden = secciones.length > 0 ? Math.max(...secciones.map((s) => s.orden || 0)) : 0;
      const nuevaSeccion = {
        cancion_id: id,
        nombre_seccion: nuevoNombre.trim(),
        letra_es: nuevaLetraEs.trim() || null,
        letra_en: nuevaLetraEn.trim() || null,
        letra_jp: nuevaLetraJp.trim() || null,
        letra_romaji: nuevaLetraRomaji.trim() || null,
        orden: maxOrden + 1
      };
      const { data, error } = await supabase.from("secciones_cancion").insert([nuevaSeccion]).select().single();
      if (error) throw error;
      setSecciones((prev) => [...prev, data]);
      dispatchForm({ type: "RESET_NUEVA" });
      dispatchModal({ type: "CLOSE_ADD" });
    } catch (error) {
      alert("Error: " + (error.message || "No se pudo crear la sección"));
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  const handleUpdateSeccion = async () => {
    const { editSecNombre, editSecEs, editSecEn, editSecJp, editSecRomaji } = formState;
    const sec = modalState.selectedSec;
    if (!sec || !editSecNombre.trim() || modalState.procesando) return;
    dispatchModal({ type: "SET_PROCESANDO", payload: true });
    try {
      const updates = {
        nombre_seccion: editSecNombre.trim(),
        letra_es: editSecEs.trim() || null,
        letra_en: editSecEn.trim() || null,
        letra_jp: editSecJp.trim() || null,
        letra_romaji: editSecRomaji.trim() || null
      };
      const { error } = await supabase.from("secciones_cancion").update(updates).eq("id", sec.id);
      if (error) throw error;
      setSecciones((prev) => prev.map((s) => (s.id === sec.id ? { ...s, ...updates } : s)));
      dispatchForm({ type: "RESET_EDIT" });
      dispatchModal({ type: "CLOSE_EDIT_SEC" });
    } catch (error) {
      alert("Error: " + (error.message || "No se pudo actualizar la sección"));
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  const deleteSeccion = async () => {
    const sec = modalState.selectedSec;
    if (!sec || modalState.procesando) return;
    dispatchModal({ type: "SET_PROCESANDO", payload: true });
    try {
      const { error } = await supabase.from("secciones_cancion").delete().eq("id", sec.id);
      if (error) throw error;
      setSecciones((prev) => prev.filter((s) => s.id !== sec.id));
      dispatchForm({ type: "RESET_EDIT" });
      dispatchModal({ type: "CLOSE_EDIT_SEC" });
    } catch (error) {
      alert("Error: " + (error.message || "No se pudo eliminar la sección"));
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  // ✅ CORREGIDO: ya no llama fetchData() al terminar de guardar.
  // Antes, fetchData() hacía setLoading(true) que reseteaba todo el componente
  // y cerraba/reiniciaba el modal mientras se editaba.
  const handleMassUpdate = async (seccionesEditadas) => {
    try {
      const seccionesNuevas = seccionesEditadas.filter((sec) => sec.id.toString().startsWith("temp-"));
      const seccionesExistentes = seccionesEditadas.filter((sec) => !sec.id.toString().startsWith("temp-"));

      // Secciones que se eliminaron dentro del editor
      const idsEditadas = new Set(seccionesExistentes.map((s) => String(s.id)));
      const seccionesEliminadas = secciones.filter((s) => !idsEditadas.has(String(s.id)));

      // 1. Eliminar las que se borraron en el editor
      for (const sec of seccionesEliminadas) {
        const { error } = await supabase.from("secciones_cancion").delete().eq("id", sec.id);
        if (error) throw error;
      }

      // 2. Insertar las nuevas y guardar el id real que devuelve Supabase
      const seccionesInsertadas = [];
      for (const sec of seccionesNuevas) {
        const { data, error } = await supabase
          .from("secciones_cancion")
          .insert([{
            cancion_id: parseInt(id),
            nombre_seccion: sec.nombre_seccion,
            letra_es: sec.letra_es || "",
            letra_en: sec.letra_en || "",
            letra_jp: sec.letra_jp || "",
            letra_romaji: sec.letra_romaji || "",
            orden: sec.orden,
          }])
          .select()
          .single();
        if (error) throw error;
        seccionesInsertadas.push({ tempId: sec.id, real: data });
      }

      // 3. Actualizar las existentes
      for (const sec of seccionesExistentes) {
        const { error } = await supabase
          .from("secciones_cancion")
          .update({
            nombre_seccion: sec.nombre_seccion,
            letra_es: sec.letra_es || "",
            letra_en: sec.letra_en || "",
            letra_jp: sec.letra_jp || "",
            letra_romaji: sec.letra_romaji || "",
            orden: sec.orden,
          })
          .eq("id", sec.id);
        if (error) throw error;
      }

      // 4. Actualizar estado local directamente — sin fetchData()
      const seccionesFinales = seccionesEditadas.map((sec) => {
        if (sec.id.toString().startsWith("temp-")) {
          const insertada = seccionesInsertadas.find((i) => i.tempId === sec.id);
          return insertada ? insertada.real : sec;
        }
        return sec;
      });

      setSecciones(seccionesFinales);

    } catch (error) {
      console.error("Error en handleMassUpdate:", error);
      alert("Error al guardar: " + (error.message || "Error desconocido"));
      throw error;
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
      <LinksModal
        isOpen={modalState.showLinksModal}
        onClose={() => { dispatchModal({ type: "CLOSE_LINKS" }); dispatchForm({ type: "RESET_LINK" }); }}
        isProcessing={modalState.procesando}
        titulo={formState.nuevoLinkTitulo}
        onTituloChange={(val) => dispatchForm({ type: "SET_LINK", payload: { nuevoLinkTitulo: val } })}
        url={formState.nuevoLinkUrl}
        onUrlChange={(val) => dispatchForm({ type: "SET_LINK", payload: { nuevoLinkUrl: val } })}
        onSave={handleSaveLink}
        links={cancion?.links || []}
        onEdit={prepararEdicionLink}
        onDelete={removeLink}
        isEditing={modalState.linkEditandoIndex !== null}
      />
      <SeccionModal
        isOpen={modalState.showAddModal}
        isEditing={false}
        onClose={() => { dispatchModal({ type: "CLOSE_ADD" }); dispatchForm({ type: "RESET_NUEVA" }); }}
        isProcessing={modalState.procesando}
        nombre={formState.nuevoNombre}
        onNombreChange={(val) => dispatchForm({ type: "SET_NUEVA_SECCION", payload: { nuevoNombre: val } })}
        es={formState.nuevaLetraEs}
        onEsChange={(val) => dispatchForm({ type: "SET_NUEVA_SECCION", payload: { nuevaLetraEs: val } })}
        en={formState.nuevaLetraEn}
        onEnChange={(val) => dispatchForm({ type: "SET_NUEVA_SECCION", payload: { nuevaLetraEn: val } })}
        jp={formState.nuevaLetraJp}
        onJpChange={(val) => dispatchForm({ type: "SET_NUEVA_SECCION", payload: { nuevaLetraJp: val } })}
        romaji={formState.nuevaLetraRomaji}
        onRomajiChange={(val) => dispatchForm({ type: "SET_NUEVA_SECCION", payload: { nuevaLetraRomaji: val } })}
        onSave={handleCrearSeccion}
      />
      <SeccionModal
        isOpen={modalState.showEditSecModal}
        isEditing={true}
        onClose={() => { dispatchModal({ type: "CLOSE_EDIT_SEC" }); dispatchForm({ type: "RESET_EDIT" }); }}
        isProcessing={modalState.procesando}
        nombre={formState.editSecNombre}
        onNombreChange={(val) => dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecNombre: val } })}
        es={formState.editSecEs}
        onEsChange={(val) => dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecEs: val } })}
        en={formState.editSecEn}
        onEnChange={(val) => dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecEn: val } })}
        jp={formState.editSecJp}
        onJpChange={(val) => dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecJp: val } })}
        romaji={formState.editSecRomaji}
        onRomajiChange={(val) => dispatchForm({ type: "SET_EDIT_SECCION", payload: { editSecRomaji: val } })}
        onSave={handleUpdateSeccion}
        onDelete={() => { if (confirm("¿Borrar esta sección? No se puede deshacer.")) deleteSeccion(); }}
      />
      <FullLyricsModal
        isOpen={modalState.showFullLyricsModal}
        onClose={() => dispatchModal({ type: "CLOSE_FULL_LYRICS" })}
        secciones={secciones}
        idiomaActivo={idiomasActivos}
      />
      <MassEditModal
        isOpen={modalState.showMassEditModal}
        onClose={() => dispatchModal({ type: "CLOSE_MASS_EDIT" })}
        secciones={secciones}
        isProcessing={modalState.procesando}
        onSave={handleMassUpdate}
        cancionId={id}
      />

      <motion.button whileHover={{ x: -4 }} onClick={() => router.push("/wiki/paginas/canciones")} className="p-8 text-[#6B5E70]/40 hover:text-[#6B5E70] flex items-center gap-2 font-black text-[10px] uppercase transition-colors italic">
        <ChevronLeft size={16} />Volver al Cancionero
      </motion.button>

      <div className={`mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-16 mt-4 transition-all duration-500 ${idiomasActivos.length > 1 ? "max-w-7xl" : "max-w-5xl"}`}>
        <aside className="space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#6B5E70]/10">
            <SmartImage src={cancion?.portada_url || "/placeholder-cover.jpg"} alt={cancion?.titulo} className="w-full h-full object-cover" />
          </motion.div>
          {isAdmin && !cancion?.visible && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-[#604b68] text-white rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl">
              <EyeOff size={16} /><span className="font-black uppercase text-[9px] tracking-widest italic">Oculto</span>
            </motion.div>
          )}
          {cancion?.estado && <EstadoSelector estado={cancion.estado} isAdmin={isAdmin} onchange={handleUpdateEstado} />}
          <LanguageToggler idiomasActivos={idiomasActivos} toggleIdioma={toggleIdioma} />
          {cancion?.personaje && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10">
              <h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic"><User size={12} />Personaje</h4>
              <p className="text-[#6B5E70] font-bold text-sm italic">{cancion.personaje}</p>
            </motion.div>
          )}
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
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => dispatchModal({ type: "OPEN_FULL_LYRICS" })} className="flex items-center gap-1 px-3 py-1 bg-[#6B5E70]/5 rounded-lg text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors">
                      <FileText size={12} /><span className="text-[8px] font-black uppercase tracking-widest">Lectura</span>
                    </motion.button>
                    {isAdmin && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => dispatchModal({ type: "OPEN_MASS_EDIT" })} className="flex items-center gap-1 px-3 py-1 bg-[#6B5E70]/5 rounded-lg text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors border border-[#6B5E70]/10">
                        <Layers size={12} /><span className="text-[8px] font-black uppercase tracking-widest">Editor Maestro</span>
                      </motion.button>
                    )}
                  </>
                )}
              </div>
              {isAdmin && (
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { dispatchForm({ type: "RESET_NUEVA" }); dispatchModal({ type: "OPEN_ADD" }); }} className="bg-[#6B5E70] text-white p-2 rounded-full shadow-lg hover:bg-[#5A4D5F] transition-colors">
                  <Plus size={18} />
                </motion.button>
              )}
            </div>

            <div className="space-y-12">
              {secciones.map((seccion, index) => (
                <motion.div key={seccion.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="relative group">
                  <div className={`bg-white border border-[#6B5E70]/5 rounded-[2.5rem] transition-all hover:border-[#6B5E70]/20 hover:shadow-2xl hover:shadow-[#6B5E70]/5 ${idiomasActivos.length > 1 ? "p-8 md:p-12" : "p-10"}`}>
                    <div className="flex items-center justify-between mb-8">
                      <span className="bg-[#F1F5F9] text-[#6B5E70]/60 px-4 py-1.5 rounded-full font-black text-[9px] tracking-widest uppercase italic">{seccion.nombre_seccion}</span>
                      {isAdmin && (
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openEditSec(seccion)} className="bg-[#6B5E70]/5 p-2 rounded-xl text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                          <Edit3 size={14} />
                        </motion.button>
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
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 bg-[#6B5E70]/5 rounded-[3rem] border-2 border-dashed border-[#6B5E70]/10">
                <Music size={48} className="mx-auto text-[#6B5E70]/20 mb-4" />
                <p className="text-[#6B5E70]/40 font-bold uppercase text-sm tracking-widest mb-6 italic">El lienzo está en blanco</p>
                {isAdmin && <button onClick={() => { dispatchForm({ type: "RESET_NUEVA" }); dispatchModal({ type: "OPEN_ADD" }); }} className="bg-[#6B5E70] text-white px-8 py-3 rounded-full font-black uppercase text-[10px] shadow-lg hover:bg-[#5A4D5F] transition-colors">Escribir primer verso</button>}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}