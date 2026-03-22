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
import { SmartImage } from "@/components/display/SmartImage";
import { MassEditModal } from "@/components/paginas/wiki/canciones/MassEditor";

const IDIOMAS = [
  { id: "es", label: "ES", nombre: "Español" },
  { id: "en", label: "EN", nombre: "Inglés" },
  { id: "jp", label: "JP", nombre: "Japonés" },
  { id: "romaji", label: "RO", nombre: "Reading" }
];
const ESTADOS = ["BORRADOR", "EN PROCESO", "TERMINADA"];
const getEstadoColor = (estado) => {
  const colores = {
    "TERMINADA": "bg-primary/10 text-primary border-primary/20",
    "EN PROCESO": "bg-bg-main text-primary/80 border-primary/10",
    "BORRADOR": "bg-primary/5 text-primary/60 border-primary/10"
  };
  return colores[estado] || colores["BORRADOR"];
};

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

const LanguageToggler = ({ idiomasActivos, toggleIdioma }) => (
  <div className="p-6 bg-primary rounded-[var(--radius-card)] shadow-xl shadow-primary/20">
    <h4 className="font-black uppercase text-[8px] tracking-[0.2em] mb-4 text-center italic"
        style={{ color: "color-mix(in srgb, var(--btn-text) 40%, transparent)" }}>
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
          className={`py-2 rounded-[var(--radius-btn)] font-black text-[9px] transition-all uppercase border-2 ${
            idiomasActivos.includes(l.id)
              ? "bg-white-custom border-white-custom scale-105"
              : "bg-transparent border-2"
          }`}
          style={idiomasActivos.includes(l.id)
            ? { color: "var(--primary)" }
            : {
                color: "color-mix(in srgb, var(--btn-text) 50%, transparent)",
                borderColor: "color-mix(in srgb, var(--btn-text) 15%, transparent)",
              }
          }
        >
          {l.label}
        </motion.button>
      ))}
    </div>
    <p className="text-[7px] text-center mt-3 font-bold uppercase tracking-widest"
       style={{ color: "color-mix(in srgb, var(--btn-text) 25%, transparent)" }}>
      Máx. 2 idiomas
    </p>
  </div>
);

const EstadoSelector = ({ estado, isAdmin, onchange }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative p-4 rounded-[var(--radius-card)] border text-center ${getEstadoColor(estado)} shadow-sm transition-all`}
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
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 italic">
        <Link2 size={12} />Enlaces
      </h4>
      {isAdmin && (
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onOpenModal} className="text-primary hover:text-primary/60 transition-colors">
          <Plus size={14} />
        </motion.button>
      )}
    </div>
    {(!links || links.length === 0) ? (
      <p className="text-primary/40 text-xs italic">Sin enlaces</p>
    ) : (
      <div className="space-y-2">
        {links.map((link, i) => (
          <div key={i} className="flex items-center justify-between group">
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:text-[var(--primary)] transition-colors text-xs font-bold truncate flex-1">
              <ExternalLink size={10} className="flex-shrink-0" />
              <span className="truncate">{link.titulo}</span>
            </a>
            {isAdmin && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onEdit(i)} className="text-primary/40 hover:text-primary p-1"><Edit3 size={10} /></motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={10} /></motion.button>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </motion.div>
);

const FullLyricsModal = ({ isOpen, onClose, secciones, idiomaActivo }) => {
  const [zoom, setZoom] = useState(0.5);
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-primary/40 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-bg-main w-full max-w-5xl h-full md:h-[90vh] md:rounded-[var(--radius-card)] shadow-2xl relative z-10 border border-primary/10 flex flex-col"
          >
            <div className="px-6 py-2.5 bg-white-custom border-b border-primary/10 flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText size={13} className="text-primary/50 flex-shrink-0" />
                  <span className="text-primary font-black uppercase text-[10px] tracking-[0.2em] italic">Lectura</span>
                  <span className="text-primary/30 text-[9px] font-bold uppercase tracking-widest">
                    · {IDIOMAS.find((i) => i.id === (Array.isArray(idiomaActivo) ? idiomaActivo[0] : "es"))?.nombre}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded-[var(--radius-input)] text-primary hover:bg-primary/10 transition-colors text-sm font-bold">-</button>
                    <span className="text-[9px] font-black text-primary/50 min-w-[38px] text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded-[var(--radius-input)] text-primary hover:bg-primary/10 transition-colors text-sm font-bold">+</button>
                  </div>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopy} className="flex items-center gap-1.5 text-primary bg-primary/5 px-3 py-1.5 rounded-[var(--radius-btn)] text-[9px] font-black uppercase tracking-widest border border-primary/10">
                    <Copy size={12} /> Copiar
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} onClick={onClose} className="text-primary/40 p-1.5 hover:text-red-500 transition-all"><X size={18} /></motion.button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-bg-main selection:bg-primary/10 custom-scrollbar">
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
                        <div className="h-[1px] flex-1 max-w-[100px] bg-primary" />
                        <span className="text-[14px] font-black uppercase tracking-[0.5em] italic text-primary">{seccion.nombre_seccion}</span>
                        <div className="h-[1px] flex-1 max-w-[100px] bg-primary" />
                      </div>
                      <p className="text-[var(--foreground)] text-3xl md:text-5xl lg:text-6xl font-medium italic font-serif leading-[1.5] whitespace-pre-wrap break-words">{texto}</p>
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

const LinksModal = ({ isOpen, onClose, isProcessing, titulo, onTituloChange, url, onUrlChange, onSave, links, onEdit, onDelete, isEditing }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-primary/20 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white-custom w-full max-w-md rounded-[var(--radius-card)] p-10 shadow-2xl relative z-10 border border-primary/10">
          <motion.button whileHover={{ rotate: 90 }} onClick={onClose} className="absolute top-8 right-8 text-primary/20 hover:text-primary transition-colors"><X size={20} /></motion.button>
          <h3 className="text-center text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">{isEditing ? "Editar Enlace" : "Gestionar Enlaces"}</h3>
          <form onSubmit={onSave} className="space-y-4 mb-8">
            <input type="text" placeholder="TÍTULO" value={titulo} onChange={(e) => onTituloChange(e.target.value)} className="w-full bg-bg-main border-b border-primary/10 py-3 text-sm font-bold text-primary outline-none focus:border-primary focus:ring-0 uppercase" />
            <input type="url" placeholder="URL" value={url} onChange={(e) => onUrlChange(e.target.value)} className="w-full bg-bg-main border-b border-primary/10 py-3 text-sm font-medium text-primary outline-none focus:border-primary focus:ring-0" />
            <div className="flex gap-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isProcessing || !titulo.trim() || !url.trim()} className="flex-1 bg-primary text-btn-text py-3 rounded-[var(--radius-btn)] font-black uppercase text-[9px] shadow-md hover:bg-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {isProcessing ? <><Loader2 size={12} className="inline animate-spin mr-2" />Guardando...</> : isEditing ? "Guardar" : "Añadir"}
              </motion.button>
              {isEditing && <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={onClose} className="px-4 bg-primary/10 text-primary rounded-[var(--radius-btn)] font-black uppercase text-[8px] hover:bg-primary/20 transition-colors">Cancelar</motion.button>}
            </div>
          </form>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {links?.map((link, i) => (
              <motion.div key={i} layout className="flex items-center justify-between p-3 rounded-[var(--radius-btn)] border bg-primary/5 border-primary/10 hover:bg-primary/10 transition-colors">
                <span className="text-[10px] font-black text-primary truncate uppercase italic">{link.titulo}</span>
                <div className="flex gap-1">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onEdit(i)} className="text-primary/40 hover:text-primary p-1 transition-colors"><Edit3 size={14} /></motion.button>
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

const SeccionModal = ({ isOpen, isEditing, onClose, isProcessing, nombre, onNombreChange, es, onEsChange, en, onEnChange, jp, onJpChange, romaji, onRomajiChange, onSave, onDelete = null }) => {
  const [activeTab, setActiveTab] = React.useState("es");
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-primary/20 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white-custom w-full max-w-3xl rounded-[var(--radius-card)] p-10 shadow-2xl relative z-10 border border-primary/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <motion.button whileHover={{ rotate: 90 }} onClick={onClose} className="absolute top-8 right-8 text-primary/20 hover:text-primary transition-colors z-10"><X size={20} /></motion.button>
            <h3 className="text-center text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">{isEditing ? "Editar Sección" : "Nueva Sección"}</h3>
            <div className="space-y-6">
              <input type="text" placeholder="NOMBRE DE LA SECCIÓN (Ej: ESTROFA, CORO)" value={nombre} onChange={(e) => onNombreChange(e.target.value.toUpperCase())} className="w-full bg-bg-main border-b-2 border-primary/10 py-3 text-sm font-black text-primary outline-none focus:border-primary uppercase tracking-widest" />
              <div className="flex gap-1 bg-primary/5 p-1 rounded-[var(--radius-btn)] border border-primary/10">
                {IDIOMAS.map((lang) => (
                  <button key={lang.id} type="button" onClick={() => setActiveTab(lang.id)} className={`flex-1 py-2 rounded-[var(--radius-input)] font-black text-[9px] uppercase transition-all ${activeTab === lang.id ? "bg-primary shadow-md" : "text-primary/40 hover:text-primary"}`} style={activeTab === lang.id ? { color: "var(--btn-text)" } : {}}>{lang.label}</button>
                ))}
              </div>
              <div className="min-h-[200px]">
                {activeTab === "es" && <textarea value={es} onChange={(e) => onEsChange(e.target.value)} rows={8} className="w-full bg-bg-main border border-primary/5 rounded-[var(--radius-card)] p-6 text-primary text-sm italic font-serif leading-relaxed outline-none focus:bg-white-custom focus:border-primary/30 transition-all resize-none" placeholder="Escribe la letra en español..." />}
                {activeTab === "en" && <textarea value={en} onChange={(e) => onEnChange(e.target.value)} rows={8} className="w-full bg-bg-main border border-primary/5 rounded-[var(--radius-card)] p-6 text-primary text-sm italic font-serif leading-relaxed outline-none focus:bg-white-custom focus:border-primary/30 transition-all resize-none" placeholder="Escribe la letra en inglés..." />}
                {activeTab === "jp" && <textarea value={jp} onChange={(e) => onJpChange(e.target.value)} rows={8} className="w-full bg-bg-main border border-primary/5 rounded-[var(--radius-card)] p-6 text-primary text-sm italic font-serif leading-relaxed outline-none focus:bg-white-custom focus:border-primary/30 transition-all resize-none" placeholder="日本語で歌詞を書く..." />}
                {activeTab === "romaji" && <textarea value={romaji} onChange={(e) => onRomajiChange(e.target.value)} rows={8} className="w-full bg-bg-main border border-primary/5 rounded-[var(--radius-card)] p-6 text-primary text-sm italic font-serif leading-relaxed outline-none focus:bg-white-custom focus:border-primary/30 transition-all resize-none" placeholder="Kakikomi romaji..." />}
              </div>
              <div className="flex gap-4 pt-4">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onSave} disabled={isProcessing || !nombre.trim()} className="flex-1 bg-primary text-btn-text py-3 rounded-[var(--radius-btn)] font-black uppercase text-[10px] shadow-md hover:bg-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {isProcessing ? <><Loader2 size={14} className="animate-spin" />Guardando...</> : <><Save size={14} />Guardar Sección</>}
                </motion.button>
                {isEditing && onDelete && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onDelete} disabled={isProcessing} className="px-6 bg-red-500 py-3 rounded-[var(--radius-btn)] font-black uppercase text-[10px] shadow-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2" style={{ color: "#fff" }}>
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

  
  
  
  const handleMassUpdate = async (seccionesEditadas) => {
    try {
      const seccionesNuevas = seccionesEditadas.filter((sec) => sec.id.toString().startsWith("temp-"));
      const seccionesExistentes = seccionesEditadas.filter((sec) => !sec.id.toString().startsWith("temp-"));

      
      const idsEditadas = new Set(seccionesExistentes.map((s) => String(s.id)));
      const seccionesEliminadas = secciones.filter((s) => !idsEditadas.has(String(s.id)));

      
      for (const sec of seccionesEliminadas) {
        const { error } = await supabase.from("secciones_cancion").delete().eq("id", sec.id);
        if (error) throw error;
      }

      
      const seccionesInsertadas = [];
      for (const sec of seccionesNuevas) {
        const { data, error } = await supabase
          .from("secciones_cancion")
          .insert([{
            cancion_id: id,
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
      <div className="h-screen flex items-center justify-center bg-bg-main flex-col gap-4">
        <Loader2 className="text-primary animate-spin" size={32} />
        <p className="text-primary uppercase text-[10px] tracking-widest italic font-black">Afinando instrumentos...</p>
      </div>
    );
  }

  if (errorAcceso) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-main flex-col gap-4">
        <AlertCircle className="text-red-400" size={48} />
        <p className="text-primary uppercase text-[10px] tracking-widest italic font-black">Acceso denegado o canción no encontrada</p>
        <button onClick={() => router.push("/wiki/canciones")} className="mt-4 bg-primary text-btn-text px-6 py-2 rounded-full font-black text-sm hover:bg-[var(--primary)]">Volver</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
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

      <motion.button whileHover={{ x: -4 }} onClick={() => router.push("/wiki/canciones")} className="p-8 text-primary/40 hover:text-primary flex items-center gap-2 font-black text-[10px] uppercase transition-colors italic">
        <ChevronLeft size={16} />Volver al Cancionero
      </motion.button>

      <div className={`mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-16 mt-4 transition-all duration-500 ${idiomasActivos.length > 1 ? "max-w-7xl" : "max-w-5xl"}`}>
        <aside className="space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="aspect-square rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-primary/10">
            <SmartImage src={cancion?.portada_url || "/placeholder-cover.jpg"} alt={cancion?.titulo} className="w-full h-full object-cover" />
          </motion.div>
          {isAdmin && !cancion?.visible && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-primary text-btn-text rounded-[var(--radius-btn)] flex items-center justify-center gap-3 shadow-xl" style={{ color: "var(--btn-text)" }}>
              <EyeOff size={16} /><span className="font-black uppercase text-[9px] tracking-widest italic">Oculto</span>
            </motion.div>
          )}
          {cancion?.estado && <EstadoSelector estado={cancion.estado} isAdmin={isAdmin} onchange={handleUpdateEstado} />}
          <LanguageToggler idiomasActivos={idiomasActivos} toggleIdioma={toggleIdioma} />
          {cancion?.personaje && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10">
              <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic"><User size={12} />Personaje</h4>
              <p className="text-primary font-bold text-sm italic">{cancion.personaje}</p>
            </motion.div>
          )}
          <LinkSection links={cancion?.links} isAdmin={isAdmin} onOpenModal={() => { dispatchForm({ type: "RESET_LINK" }); dispatchModal({ type: "OPEN_LINKS" }); }} onEdit={prepararEdicionLink} onDelete={removeLink} />
        </aside>

        <main>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="text-6xl font-black text-primary italic tracking-tighter leading-[0.85] mb-6 uppercase">{cancion?.titulo}</h1>
            <div className="h-1.5 w-24 bg-primary/10 rounded-full" />
          </motion.div>

          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8 border-b border-primary/10 pb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-primary font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic"><List size={16} />Letra</h3>
                {secciones.length > 0 && (
                  <>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => dispatchModal({ type: "OPEN_FULL_LYRICS" })} className="flex items-center gap-1 px-3 py-1 bg-primary/5 rounded-[var(--radius-input)] text-primary hover:bg-primary hover:text-btn-text transition-colors">
                      <FileText size={12} /><span className="text-[8px] font-black uppercase tracking-widest">Lectura</span>
                    </motion.button>
                    {isAdmin && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => dispatchModal({ type: "OPEN_MASS_EDIT" })} className="flex items-center gap-1 px-3 py-1 bg-primary/5 rounded-[var(--radius-input)] text-primary hover:bg-primary hover:text-btn-text transition-colors border border-primary/10">
                        <Layers size={12} /><span className="text-[8px] font-black uppercase tracking-widest">Editor Maestro</span>
                      </motion.button>
                    )}
                  </>
                )}
              </div>
              {isAdmin && (
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { dispatchForm({ type: "RESET_NUEVA" }); dispatchModal({ type: "OPEN_ADD" }); }} className="bg-primary text-btn-text p-2 rounded-full shadow-lg hover:bg-[var(--primary)] transition-colors">
                  <Plus size={18} />
                </motion.button>
              )}
            </div>

            <div className="space-y-12">
              {secciones.map((seccion, index) => (
                <motion.div key={seccion.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="relative group">
                  <div className={`bg-white-custom border border-primary/5 rounded-[var(--radius-card)] transition-all hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 ${idiomasActivos.length > 1 ? "p-8 md:p-12" : "p-10"}`}>
                    <div className="flex items-center justify-between mb-8">
                      <span className="bg-primary/10 text-primary/60 px-4 py-1.5 rounded-full font-black text-[9px] tracking-widest uppercase italic">{seccion.nombre_seccion}</span>
                      {isAdmin && (
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openEditSec(seccion)} className="bg-primary/5 p-2 rounded-[var(--radius-btn)] text-primary hover:bg-primary hover:text-btn-text transition-colors opacity-0 group-hover:opacity-100">
                          <Edit3 size={14} />
                        </motion.button>
                      )}
                    </div>
                    <div className={`grid gap-x-12 gap-y-8 ${idiomasActivos.length > 1 ? "md:grid-cols-2 divide-x-2 divide-primary/5" : "grid-cols-1"}`}>
                      {idiomasActivos.map((lang, i) => (
                        <div key={lang} className={`${i > 0 ? "md:pl-12" : ""}`}>
                          {idiomasActivos.length > 1 && <span className="text-[7px] font-black text-primary/20 uppercase tracking-[0.3em] block mb-4 italic">{IDIOMAS.find((x) => x.id === lang)?.nombre}</span>}
                          <div className={`text-primary leading-[1.8] font-medium whitespace-pre-wrap italic font-serif opacity-90 transition-all ${idiomasActivos.length > 1 ? "text-lg md:text-xl" : "text-xl md:text-2xl"}`}>
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
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 bg-primary/5 rounded-[var(--radius-card)] border-[length:var(--border-width)] border-dashed border-primary/10">
                <Music size={48} className="mx-auto text-primary/20 mb-4" />
                <p className="text-primary/40 font-bold uppercase text-sm tracking-widest mb-6 italic">El lienzo está en blanco</p>
                {isAdmin && <button onClick={() => { dispatchForm({ type: "RESET_NUEVA" }); dispatchModal({ type: "OPEN_ADD" }); }} className="bg-primary text-btn-text px-8 py-3 rounded-full font-black uppercase text-[10px] shadow-lg hover:bg-[var(--primary)] transition-colors">Escribir primer verso</button>}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}