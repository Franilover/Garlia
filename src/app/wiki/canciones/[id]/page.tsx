"use client";
import React, { useEffect, useState, useCallback, useReducer } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/supabase";
import { 
  ChevronLeft, Plus, Trash2, X, Edit3, Save, User, List, Music, 
  EyeOff, AlertCircle, Loader2, ChevronDown, Link2, ExternalLink,
  FileText, Copy 
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
  showFullLyricsModal: false, // Nuevo estado para el modal de lectura
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
    case "OPEN_FULL_LYRICS": return { ...state, showFullLyricsModal: true }; // Nuevo case
    case "CLOSE_FULL_LYRICS": return { ...state, showFullLyricsModal: false }; // Nuevo case
    case "SET_EDITING_LINK": return { ...state, linkEditandoIndex: action.payload };
    case "SET_PROCESANDO": return { ...state, procesando: action.payload };
    default: return state;
  }
};

// ============================================================================
// REDUCER PARA FORMULARIOS
// ============================================================================

const initialFormState = {
  // Nueva sección
  nuevoNombre: "",
  nuevaLetraEs: "",
  nuevaLetraEn: "",
  nuevaLetraJp: "",
  nuevaLetraRomaji: "",
  // Editar sección
  editSecNombre: "",
  editSecEs: "",
  editSecEn: "",
  editSecJp: "",
  editSecRomaji: "",
  // Links
  nuevoLinkTitulo: "",
  nuevoLinkUrl: ""
};

const formReducer = (state, action) => {
  switch(action.type) {
    case "SET_NUEVA_SECCION":
      return { ...state, ...action.payload };
    case "SET_EDIT_SECCION":
      return { ...state, ...action.payload };
    case "SET_LINK":
      return { ...state, ...action.payload };
    case "RESET_NUEVA":
      return { ...state, nuevoNombre: "", nuevaLetraEs: "", nuevaLetraEn: "", nuevaLetraJp: "", nuevaLetraRomaji: "" };
    case "RESET_EDIT":
      return { ...state, editSecNombre: "", editSecEs: "", editSecEn: "", editSecJp: "", editSecRomaji: "" };
    case "RESET_LINK":
      return { ...state, nuevoLinkTitulo: "", nuevoLinkUrl: "" };
    default:
      return state;
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
// MODAL DE LECTURA COMPLETA (CORREGIDO Y AMPLIADO)
// ============================================================================

const FullLyricsModal = ({ isOpen, onClose, secciones, idiomaActivo }) => {
  // Estado local para ajustar el tamaño dinámicamente si se desea
  const [zoom, setZoom] = React.useState(1);

  const handleCopy = () => {
    const langCode = Array.isArray(idiomaActivo) ? idiomaActivo[0] : idiomaActivo;
    const key = `letra_${langCode}`;
    
    const textoCompleto = secciones
      .map(s => s[key] || "")
      .filter(Boolean)
      .join("\n\n");

    navigator.clipboard.writeText(textoCompleto);
    alert("¡Letra copiada al portapapeles!");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-0 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#6B5E70]/60 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            className="bg-[#FDFCFD] w-full max-w-4xl md:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(107,94,112,0.3)] relative z-10 border border-[#6B5E70]/10 h-full md:h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header mejorado */}
            <div className="px-8 py-6 border-b border-[#6B5E70]/5 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-20">
              <div className="flex flex-col">
                <h3 className="text-[#6B5E70] font-black uppercase text-[12px] tracking-[0.4em] italic flex items-center gap-3">
                  <div className="w-8 h-[2px] bg-[#6B5E70]/20" />
                  Modo Lectura
                </h3>
                <p className="text-[#6B5E70]/40 text-[9px] font-bold uppercase tracking-widest mt-1 ml-11">
                  Idioma: {IDIOMAS.find(l => l.id === (Array.isArray(idiomaActivo) ? idiomaActivo[0] : idiomaActivo))?.nombre}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Controles de tamaño rápidos */}
                <div className="hidden md:flex items-center gap-2 bg-[#6B5E70]/5 rounded-full px-3 py-1">
                  <button onClick={() => setZoom(prev => Math.max(0.8, prev - 0.1))} className="text-[#6B5E70] hover:scale-125 transition-transform p-1">
                    <span className="text-xs">-</span>
                  </button>
                  <div className="w-[1px] h-3 bg-[#6B5E70]/10" />
                  <button onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))} className="text-[#6B5E70] hover:scale-125 transition-transform p-1">
                    <span className="text-xs">+</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: "#6B5E70", color: "#fff" }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleCopy}
                    className="text-[#6B5E70] bg-[#6B5E70]/5 p-3 rounded-2xl transition-all"
                  >
                    <Copy size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ rotate: 90, backgroundColor: "#ef444410", color: "#ef4444" }}
                    onClick={onClose}
                    className="text-[#6B5E70]/40 p-3 rounded-2xl transition-all"
                  >
                    <X size={24} />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Contenido con letra más grande y legible */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-white to-[#FDFCFD]">
              <div 
                className="max-w-3xl mx-auto p-12 md:p-20 transition-all duration-300"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
              >
                {secciones.length > 0 ? (
                  secciones.map((seccion) => {
                    const lang = Array.isArray(idiomaActivo) ? idiomaActivo[0] : "es";
                    const texto = seccion[`letra_${lang}`];
                    
                    return texto ? (
                      <div key={seccion.id} className="mb-16 last:mb-0 group">
                        {/* Indicador de sección sutil */}
                        <div className="flex items-center gap-4 mb-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-black text-[#6B5E70]/30 uppercase tracking-[0.3em] italic">
                            {seccion.nombre_seccion}
                          </span>
                          <div className="h-[1px] flex-1 bg-[#6B5E70]/5" />
                        </div>
                        
                        {/* TEXTO AMPLIADO: Pasamos de text-xl a text-3xl/4xl */}
                        <p className="text-[#4A3F4F] text-3xl md:text-4xl lg:text-5xl font-medium italic font-serif leading-[1.4] whitespace-pre-wrap selection:bg-[#6B5E70]/10">
                          {texto}
                        </p>
                      </div>
                    ) : null;
                  })
                ) : (
                  <div className="h-full flex items-center justify-center py-20">
                     <p className="text-[#6B5E70]/20 font-black uppercase tracking-[0.5em] italic">Sin contenido</p>
                  </div>
                )}
                
                {/* Separador final decorativo */}
                <div className="mt-20 flex justify-center opacity-20">
                  <div className="flex gap-2">
                    {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#6B5E70]" />)}
                  </div>
                </div>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10"
        >
          <motion.button
            whileHover={{ rotate: 90 }}
            onClick={onClose}
            className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70] transition-colors"
          >
            <X size={20} />
          </motion.button>

          <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">
            {isEditing ? "Editar Enlace" : "Gestionar Enlaces"}
          </h3>

          <form onSubmit={onSave} className="space-y-4 mb-8">
            <input
              type="text"
              placeholder="TÍTULO"
              value={titulo}
              onChange={(e) => onTituloChange(e.target.value)}
              className="w-full bg-[#FDFCFD] border-b border-[#6B5E70]/10 py-3 text-sm font-bold text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-0 uppercase"
            />
            <input
              type="url"
              placeholder="URL"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              className="w-full bg-[#FDFCFD] border-b border-[#6B5E70]/10 py-3 text-sm font-medium text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-0"
            />
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isProcessing || !titulo.trim() || !url.trim()}
                className="flex-1 bg-[#6B5E70] text-white py-3 rounded-xl font-black uppercase text-[9px] shadow-md hover:bg-[#5A4D5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={12} className="inline animate-spin mr-2" />
                    Guardando...
                  </>
                ) : isEditing ? (
                  "Guardar"
                ) : (
                  "Añadir"
                )}
              </motion.button>
              {isEditing && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onClose}
                  className="px-4 bg-gray-100 text-[#6B5E70] rounded-xl font-black uppercase text-[8px] hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </motion.button>
              )}
            </div>
          </form>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {links?.map((link, i) => (
              <motion.div
                key={i}
                layout
                className="flex items-center justify-between p-3 rounded-xl border bg-[#6B5E70]/5 border-[#6B5E70]/10 hover:bg-[#6B5E70]/10 transition-colors"
              >
                <span className="text-[10px] font-black text-[#6B5E70] truncate uppercase italic">
                  {link.titulo}
                </span>
                <div className="flex gap-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onEdit(i)}
                    className="text-[#6B5E70]/40 hover:text-[#6B5E70] p-1 transition-colors"
                  >
                    <Edit3 size={14} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onDelete(i)}
                    className="text-red-400 hover:text-red-600 p-1 transition-colors"
                  >
                    <Trash2 size={14} />
                  </motion.button>
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
// MODAL DE SECCIÓN
// ============================================================================

const SeccionModal = ({
  isOpen,
  isEditing,
  onClose,
  isProcessing,
  nombre,
  onNombreChange,
  es,
  onEsChange,
  en,
  onEnChange,
  jp,
  onJpChange,
  romaji,
  onRomajiChange,
  onSave,
  onDelete = null
}) => {
  const [activeTab, setActiveTab] = React.useState("es");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl relative z-10 border border-[#6B5E70]/10 max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* HEADER */}
            <div className="p-6 border-b border-[#6B5E70]/10 flex items-center justify-between">
              <div>
                <h3 className="text-[#6B5E70] font-black uppercase text-[11px] tracking-[0.3em] italic">
                  {isEditing ? "✏️ Editar Sección" : "➕ Nueva Sección"}
                </h3>
              </div>
              <motion.button
                whileHover={{ rotate: 90 }}
                onClick={onClose}
                className="text-[#6B5E70]/20 hover:text-[#6B5E70] transition-colors"
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* CONTENIDO */}
            <div className="overflow-y-auto flex-1 p-6">
              <form onSubmit={onSave} className="space-y-6">
                {/* NOMBRE DE LA SECCIÓN */}
                <div>
                  <label className="text-[8px] font-black text-[#6B5E70]/40 uppercase mb-2 block italic tracking-widest">
                    Nombre de la sección
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="ESTROFA, CORO, PUENTE, PRE-CORO..."
                    value={nombre}
                    onChange={(e) => onNombreChange(e.target.value)}
                    className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-3 px-4 text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] rounded-xl uppercase"
                  />
                </div>

                {/* TABS DE IDIOMAS */}
                <div className="border-b border-[#6B5E70]/10">
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {IDIOMAS.map((lang) => (
                      <motion.button
                        key={lang.id}
                        type="button"
                        onClick={() => setActiveTab(lang.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${
                          activeTab === lang.id
                            ? "bg-[#6B5E70] text-white shadow-md"
                            : "bg-[#6B5E70]/5 text-[#6B5E70]/60 hover:bg-[#6B5E70]/10"
                        }`}
                      >
                        {lang.label} - {lang.nombre}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* TEXTAREAS CON TABS */}
                <div className="space-y-3">
                  {activeTab === "es" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-[8px] font-black text-[#6B5E70]/40 uppercase block italic">
                        Español
                      </label>
                      <textarea
                        value={es}
                        onChange={(e) => onEsChange(e.target.value)}
                        placeholder="Escribe la letra en español..."
                        rows={8}
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 resize-none italic font-serif leading-relaxed"
                      />
                      <p className="text-[10px] text-[#6B5E70]/40 italic">{es.length} caracteres</p>
                    </motion.div>
                  )}

                  {activeTab === "en" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-[8px] font-black text-[#6B5E70]/40 uppercase block italic">
                        Inglés
                      </label>
                      <textarea
                        value={en}
                        onChange={(e) => onEnChange(e.target.value)}
                        placeholder="Escribe la letra en inglés..."
                        rows={8}
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 resize-none italic font-serif leading-relaxed"
                      />
                      <p className="text-[10px] text-[#6B5E70]/40 italic">{en.length} caracteres</p>
                    </motion.div>
                  )}

                  {activeTab === "jp" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-[8px] font-black text-[#6B5E70]/40 uppercase block italic">
                        Japonés
                      </label>
                      <textarea
                        value={jp}
                        onChange={(e) => onJpChange(e.target.value)}
                        placeholder="Escribe la letra en japonés..."
                        rows={8}
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 resize-none italic font-serif leading-relaxed"
                      />
                      <p className="text-[10px] text-[#6B5E70]/40 italic">{jp.length} caracteres</p>
                    </motion.div>
                  )}

                  {activeTab === "romaji" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-[8px] font-black text-[#6B5E70]/40 uppercase block italic">
                        Romaji (Reading)
                      </label>
                      <textarea
                        value={romaji}
                        onChange={(e) => onRomajiChange(e.target.value)}
                        placeholder="Escribe la pronunciación romanizada..."
                        rows={8}
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 resize-none italic font-serif leading-relaxed"
                      />
                      <p className="text-[10px] text-[#6B5E70]/40 italic">{romaji.length} caracteres</p>
                    </motion.div>
                  )}
                </div>

                {/* ESTADO DE VALIDACIÓN */}
                {!nombre.trim() && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <p className="text-[10px] text-yellow-800 font-bold italic">
                      ⚠️ Debes ingresar un nombre para la sección
                    </p>
                  </motion.div>
                )}

                {!es.trim() && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <p className="text-[10px] text-yellow-800 font-bold italic">
                      ⚠️ La letra en español es obligatoria
                    </p>
                  </motion.div>
                )}
              </form>
            </div>

            {/* FOOTER CON BOTONES */}
            <div className="p-6 border-t border-[#6B5E70]/10 bg-[#FDFCFD] flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-[#6B5E70]/20 text-[#6B5E70] font-black uppercase text-[9px] hover:bg-[#6B5E70]/5 transition-colors"
              >
                Cancelar
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSave}
                disabled={isProcessing || !nombre.trim() || !es.trim()}
                type="submit"
                className="flex-1 px-4 py-3 rounded-xl bg-[#6B5E70] text-white font-black uppercase text-[9px] shadow-lg hover:bg-[#5A4D5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Save size={14} />
                {isProcessing ? "Guardando..." : "Guardar"}
              </motion.button>

              {isEditing && onDelete && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onDelete}
                  disabled={isProcessing}
                  className="px-4 py-3 rounded-xl bg-red-50 text-red-400 font-black uppercase text-[9px] border-2 border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Borrar
                </motion.button>
              )}
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

  // Estado principal
  const [cancion, setCancion] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState(false);
  const [idiomasActivos, setIdiomasActivos] = useState(["es"]);

  // Reducers
  const [modalState, dispatchModal] = useReducer(modalReducer, initialModalState);
  const [formState, dispatchForm] = useReducer(formReducer, initialFormState);

  // ========================================================================
  // FUNCIONES PRINCIPALES
  // ========================================================================

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const adminStatus = !!session;
      setIsAdmin(adminStatus);

      const { data: cancionData, error: errorC } = await supabase
        .from("canciones")
        .select("*")
        .eq("id", id)
        .single();

      if (errorC || !cancionData) {
        setErrorAcceso(true);
        return;
      }

      if (!cancionData.visible && !adminStatus) {
        setErrorAcceso(true);
        return;
      }

      setCancion(cancionData);

      const { data: seccionesData, error: errorS } = await supabase
        .from("secciones_cancion")
        .select("*")
        .eq("cancion_id", id)
        .order("orden", { ascending: true });

      if (errorS) throw errorS;
      setSecciones(seccionesData || []);
    } catch (err) {
      console.error("Error en la carga:", err);
      setErrorAcceso(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ========================================================================
  // TOGGLEAR IDIOMAS (máx 2)
  // ========================================================================

  const toggleIdioma = useCallback((idm) => {
    setIdiomasActivos((prev) => {
      // Si está activo, desactivar (mínimo 1)
      if (prev.includes(idm)) {
        return prev.length === 1 ? prev : prev.filter((i) => i !== idm);
      }
      // Si no está activo, agregar (máximo 2)
      if (prev.length >= 2) {
        return [prev[prev.length - 1], idm];
      }
      return [...prev, idm];
    });
  }, []);

  // ========================================================================
  // GESTIÓN DE ENLACES
  // ========================================================================

  const handleSaveLink = async (e) => {
    e.preventDefault();
    const { nuevoLinkTitulo, nuevoLinkUrl } = formState;

    if (!nuevoLinkTitulo.trim() || !nuevoLinkUrl.trim() || modalState.procesando) {
      return;
    }

    dispatchModal({ type: "SET_PROCESANDO", payload: true });

    try {
      let linksActuales = Array.isArray(cancion?.links) ? [...cancion.links] : [];
      const nuevoLink = {
        titulo: nuevoLinkTitulo.trim(),
        url: nuevoLinkUrl.trim()
      };

      if (modalState.linkEditandoIndex !== null) {
        linksActuales[modalState.linkEditandoIndex] = nuevoLink;
      } else {
        linksActuales.push(nuevoLink);
      }

      const { error } = await supabase
        .from("canciones")
        .update({ links: linksActuales })
        .eq("id", id);

      if (error) throw error;

      setCancion((prev) => ({ ...prev, links: linksActuales }));
      dispatchForm({ type: "RESET_LINK" });
      dispatchModal({ type: "SET_EDITING_LINK", payload: null });
      dispatchModal({ type: "CLOSE_LINKS" });
    } catch (error) {
      console.error("Error guardando link:", error);
      alert("Error: " + (error.message || "No se pudo guardar el enlace"));
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  const prepararEdicionLink = useCallback((index) => {
    const link = cancion.links[index];
    dispatchForm({
      type: "SET_LINK",
      payload: {
        nuevoLinkTitulo: link.titulo,
        nuevoLinkUrl: link.url
      }
    });
    dispatchModal({ type: "SET_EDITING_LINK", payload: index });
  }, [cancion?.links]);

  const removeLink = async (index) => {
    if (!confirm("¿Eliminar este enlace?")) return;

    try {
      const filtrados = (cancion?.links || []).filter((_, i) => i !== index);
      const { error } = await supabase
        .from("canciones")
        .update({ links: filtrados })
        .eq("id", id);

      if (error) throw error;

      setCancion((prev) => ({ ...prev, links: filtrados }));

      if (modalState.linkEditandoIndex === index) {
        dispatchForm({ type: "RESET_LINK" });
        dispatchModal({ type: "SET_EDITING_LINK", payload: null });
      }
    } catch (error) {
      console.error("Error al borrar link:", error);
      alert("Error al borrar el enlace");
    }
  };

  // ========================================================================
  // GESTIÓN DE ESTADO DE LA CANCIÓN
  // ========================================================================

  const handleUpdateEstado = async (nuevoEstado) => {
    try {
      setCancion((prev) => ({ ...prev, estado: nuevoEstado }));

      const { error } = await supabase
        .from("canciones")
        .update({ estado: nuevoEstado })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error actualizando estado:", error);
      await fetchData(); // Recargar si falla
    }
  };

  // ========================================================================
  // CREAR SECCIÓN (CORREGIDO PARA EVITAR CONGELAMIENTO)
  // ========================================================================

  const handleCrearSeccion = async (e) => {
    e.preventDefault();
    const { nuevoNombre, nuevaLetraEs, nuevaLetraEn, nuevaLetraJp, nuevaLetraRomaji } = formState;

    if (!nuevoNombre.trim() || !nuevaLetraEs.trim() || modalState.procesando) {
      return;
    }

    dispatchModal({ type: "SET_PROCESANDO", payload: true });

    try {
      const { data, error } = await supabase
        .from("secciones_cancion")
        .insert([
          {
            cancion_id: id,
            nombre_seccion: nuevoNombre.toUpperCase(),
            letra_es: nuevaLetraEs,
            letra_en: nuevaLetraEn,
            letra_jp: nuevaLetraJp,
            letra_romaji: nuevaLetraRomaji,
            orden: secciones.length + 1
          }
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setSecciones((prev) => [...prev, data[0]]);
      } else {
        // Fallback: si no devuelve data, recargamos
        fetchData();
      }
      
      // Cerramos siempre si no hay error
      dispatchForm({ type: "RESET_NUEVA" });
      dispatchModal({ type: "CLOSE_ADD" });

    } catch (error) {
      console.error("Error al crear sección:", error);
      alert("Error: " + (error.message || "No se pudo crear la sección"));
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  // ========================================================================
  // ACTUALIZAR SECCIÓN (CORREGIDO PARA EVITAR CONGELAMIENTO)
  // ========================================================================

  const handleUpdateSeccion = async (e) => {
    e.preventDefault();
    const { editSecNombre, editSecEs, editSecEn, editSecJp, editSecRomaji } = formState;
    const { selectedSec } = modalState;

    if (!editSecNombre.trim() || !editSecEs.trim() || modalState.procesando) {
      return;
    }

    dispatchModal({ type: "SET_PROCESANDO", payload: true });

    try {
      const { error } = await supabase
        .from("secciones_cancion")
        .update({
          nombre_seccion: editSecNombre.toUpperCase(),
          letra_es: editSecEs,
          letra_en: editSecEn,
          letra_jp: editSecJp,
          letra_romaji: editSecRomaji
        })
        .eq("id", selectedSec.id);

      if (error) throw error;

      setSecciones((prev) =>
        prev.map((s) =>
          s.id === selectedSec.id
            ? {
                ...s,
                nombre_seccion: editSecNombre.toUpperCase(),
                letra_es: editSecEs,
                letra_en: editSecEn,
                letra_jp: editSecJp,
                letra_romaji: editSecRomaji
              }
            : s
        )
      );

      // Cerramos siempre si no hay error
      dispatchForm({ type: "RESET_EDIT" });
      dispatchModal({ type: "CLOSE_EDIT_SEC" });

    } catch (error) {
      console.error("Error al actualizar sección:", error);
      alert("Error: " + (error.message || "No se pudo actualizar la sección"));
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  // ========================================================================
  // ELIMINAR SECCIÓN
  // ========================================================================

  const deleteSeccion = async () => {
    const { selectedSec } = modalState;
    if (!selectedSec) return;

    dispatchModal({ type: "SET_PROCESANDO", payload: true });

    try {
      const { error } = await supabase
        .from("secciones_cancion")
        .delete()
        .eq("id", selectedSec.id);

      if (error) throw error;

      setSecciones((prev) => prev.filter((s) => s.id !== selectedSec.id));
      dispatchModal({ type: "CLOSE_EDIT_SEC" });
    } catch (error) {
      console.error("Error al borrar sección:", error);
      alert("Error al borrar la sección");
    } finally {
      dispatchModal({ type: "SET_PROCESANDO", payload: false });
    }
  };

  // ========================================================================
  // ABRIR EDICIÓN DE SECCIÓN
  // ========================================================================

  const openEditSec = useCallback((seccion) => {
    dispatchForm({
      type: "SET_EDIT_SECCION",
      payload: {
        editSecNombre: seccion.nombre_seccion,
        editSecEs: seccion.letra_es || "",
        editSecEn: seccion.letra_en || "",
        editSecJp: seccion.letra_jp || "",
        editSecRomaji: seccion.letra_romaji || ""
      }
    });
    dispatchModal({ type: "OPEN_EDIT_SEC", payload: seccion });
  }, []);

  // ========================================================================
  // RENDER
  // ========================================================================

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFCFD] flex-col gap-4">
        <Loader2 className="text-[#6B5E70] animate-spin" size={32} />
        <p className="text-[#6B5E70] uppercase text-[10px] tracking-widest italic font-black">
          Afinando instrumentos...
        </p>
      </div>
    );
  }

  if (errorAcceso) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFCFD] flex-col gap-4">
        <AlertCircle className="text-red-400" size={48} />
        <p className="text-[#6B5E70] uppercase text-[10px] tracking-widest italic font-black">
          Acceso denegado o canción no encontrada
        </p>
        <button
          onClick={() => router.push("/wiki/canciones")}
          className="mt-4 bg-[#6B5E70] text-white px-6 py-2 rounded-full font-black text-sm hover:bg-[#5A4D5F]"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20 relative">
      {/* MODALES */}
      <LinksModal
        isOpen={modalState.showLinksModal}
        onClose={() => {
          dispatchModal({ type: "CLOSE_LINKS" });
          dispatchForm({ type: "RESET_LINK" });
        }}
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
        onClose={() => {
          dispatchModal({ type: "CLOSE_ADD" });
          dispatchForm({ type: "RESET_NUEVA" });
        }}
        isProcessing={modalState.procesando}
        nombre={formState.nuevoNombre}
        onNombreChange={(val) =>
          dispatchForm({
            type: "SET_NUEVA_SECCION",
            payload: { nuevoNombre: val }
          })
        }
        es={formState.nuevaLetraEs}
        onEsChange={(val) =>
          dispatchForm({
            type: "SET_NUEVA_SECCION",
            payload: { nuevaLetraEs: val }
          })
        }
        en={formState.nuevaLetraEn}
        onEnChange={(val) =>
          dispatchForm({
            type: "SET_NUEVA_SECCION",
            payload: { nuevaLetraEn: val }
          })
        }
        jp={formState.nuevaLetraJp}
        onJpChange={(val) =>
          dispatchForm({
            type: "SET_NUEVA_SECCION",
            payload: { nuevaLetraJp: val }
          })
        }
        romaji={formState.nuevaLetraRomaji}
        onRomajiChange={(val) =>
          dispatchForm({
            type: "SET_NUEVA_SECCION",
            payload: { nuevaLetraRomaji: val }
          })
        }
        onSave={handleCrearSeccion}
      />

      <SeccionModal
        isOpen={modalState.showEditSecModal}
        isEditing={true}
        onClose={() => {
          dispatchModal({ type: "CLOSE_EDIT_SEC" });
          dispatchForm({ type: "RESET_EDIT" });
        }}
        isProcessing={modalState.procesando}
        nombre={formState.editSecNombre}
        onNombreChange={(val) =>
          dispatchForm({
            type: "SET_EDIT_SECCION",
            payload: { editSecNombre: val }
          })
        }
        es={formState.editSecEs}
        onEsChange={(val) =>
          dispatchForm({
            type: "SET_EDIT_SECCION",
            payload: { editSecEs: val }
          })
        }
        en={formState.editSecEn}
        onEnChange={(val) =>
          dispatchForm({
            type: "SET_EDIT_SECCION",
            payload: { editSecEn: val }
          })
        }
        jp={formState.editSecJp}
        onJpChange={(val) =>
          dispatchForm({
            type: "SET_EDIT_SECCION",
            payload: { editSecJp: val }
          })
        }
        romaji={formState.editSecRomaji}
        onRomajiChange={(val) =>
          dispatchForm({
            type: "SET_EDIT_SECCION",
            payload: { editSecRomaji: val }
          })
        }
        onSave={handleUpdateSeccion}
        onDelete={() => {
          if (confirm("¿Borrar esta sección? No se puede deshacer.")) {
            deleteSeccion();
          }
        }}
      />

      <FullLyricsModal 
        isOpen={modalState.showFullLyricsModal}
        onClose={() => dispatchModal({ type: "CLOSE_FULL_LYRICS" })}
        secciones={secciones}
        idiomaActivo={idiomasActivos}
      />

      {/* BOTÓN VOLVER */}
      <motion.button
        whileHover={{ x: -4 }}
        onClick={() => router.push("/wiki/canciones")}
        className="p-8 text-[#6B5E70]/40 hover:text-[#6B5E70] flex items-center gap-2 font-black text-[10px] uppercase transition-colors italic"
      >
        <ChevronLeft size={16} />
        Volver al Cancionero
      </motion.button>

      {/* CONTENIDO PRINCIPAL */}
      <div
        className={`mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-16 mt-4 transition-all duration-500 ${
          idiomasActivos.length > 1 ? "max-w-7xl" : "max-w-5xl"
        }`}
      >
        {/* SIDEBAR */}
        <aside className="space-y-6">
          {/* Imagen de portada */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#6B5E70]/10"
          >
            <SmartImage
              src={cancion?.portada_url || "/placeholder-cover.jpg"}
              alt={cancion?.titulo}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Indicador de oculto */}
          {isAdmin && !cancion?.visible && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-[#604b68] text-white rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl"
            >
              <EyeOff size={16} />
              <span className="font-black uppercase text-[9px] tracking-widest italic">
                Oculto
              </span>
            </motion.div>
          )}

          {/* Selector de estado */}
          {cancion?.estado && (
            <EstadoSelector
              estado={cancion.estado}
              isAdmin={isAdmin}
              onchange={handleUpdateEstado}
            />
          )}

          {/* Selector de idiomas */}
          <LanguageToggler idiomasActivos={idiomasActivos} toggleIdioma={toggleIdioma} />

          {/* Personaje */}
          {cancion?.personaje && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10"
            >
              <h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic">
                <User size={12} />
                Personaje
              </h4>
              <p className="text-[#6B5E70] font-bold text-sm italic">{cancion.personaje}</p>
            </motion.div>
          )}

          {/* Enlaces */}
          <LinkSection
            links={cancion?.links}
            isAdmin={isAdmin}
            onOpenModal={() => {
              dispatchForm({ type: "RESET_LINK" });
              dispatchModal({ type: "OPEN_LINKS" });
            }}
            onEdit={prepararEdicionLink}
            onDelete={removeLink}
          />
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main>
          {/* Título */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="text-6xl font-black text-[#6B5E70] italic tracking-tighter leading-[0.85] mb-6 uppercase">
              {cancion?.titulo}
            </h1>
            <div className="h-1.5 w-24 bg-[#6B5E70]/10 rounded-full" />
          </motion.div>

          {/* Secciones */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8 border-b border-[#6B5E70]/10 pb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic">
                  <List size={16} />
                  Letra
                </h3>
                
                {/* BOTÓN NUEVO: VISTA LECTURA */}
                {secciones.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => dispatchModal({ type: "OPEN_FULL_LYRICS" })}
                    className="flex items-center gap-1 px-3 py-1 bg-[#6B5E70]/5 rounded-lg text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors"
                  >
                    <FileText size={12} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Lectura</span>
                  </motion.button>
                )}
              </div>

              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    dispatchForm({ type: "RESET_NUEVA" });
                    dispatchModal({ type: "OPEN_ADD" });
                  }}
                  className="bg-[#6B5E70] text-white p-2 rounded-full shadow-lg hover:bg-[#5A4D5F] transition-colors"
                >
                  <Plus size={18} />
                </motion.button>
              )}
            </div>

            <div className="space-y-12">
              {secciones.map((seccion, index) => (
                <motion.div
                  key={seccion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <div
                    className={`bg-white border border-[#6B5E70]/5 rounded-[2.5rem] transition-all hover:border-[#6B5E70]/20 hover:shadow-2xl hover:shadow-[#6B5E70]/5 ${
                      idiomasActivos.length > 1 ? "p-8 md:p-12" : "p-10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <span className="bg-[#F1F5F9] text-[#6B5E70]/60 px-4 py-1.5 rounded-full font-black text-[9px] tracking-widest uppercase italic">
                        {seccion.nombre_seccion}
                      </span>
                      {isAdmin && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openEditSec(seccion)}
                          className="bg-[#6B5E70]/5 p-2 rounded-xl text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Edit3 size={14} />
                        </motion.button>
                      )}
                    </div>

                    <div
                      className={`grid gap-x-12 gap-y-8 ${
                        idiomasActivos.length > 1
                          ? "md:grid-cols-2 divide-x-2 divide-[#6B5E70]/5"
                          : "grid-cols-1"
                      }`}
                    >
                      {idiomasActivos.map((lang, i) => (
                        <div key={lang} className={`${i > 0 ? "md:pl-12" : ""}`}>
                          {idiomasActivos.length > 1 && (
                            <span className="text-[7px] font-black text-[#6B5E70]/20 uppercase tracking-[0.3em] block mb-4 italic">
                              {IDIOMAS.find((x) => x.id === lang)?.nombre}
                            </span>
                          )}
                          <div
                            className={`text-[#6B5E70] leading-[1.8] font-medium whitespace-pre-wrap italic font-serif opacity-90 transition-all ${
                              idiomasActivos.length > 1
                                ? "text-lg md:text-xl"
                                : "text-xl md:text-2xl"
                            }`}
                          >
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

            {/* Estado vacío */}
            {secciones.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24 bg-[#6B5E70]/5 rounded-[3rem] border-2 border-dashed border-[#6B5E70]/10"
              >
                <Music size={48} className="mx-auto text-[#6B5E70]/20 mb-4" />
                <p className="text-[#6B5E70]/40 font-bold uppercase text-sm tracking-widest mb-6 italic">
                  El lienzo está en blanco
                </p>
                {isAdmin && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      dispatchForm({ type: "RESET_NUEVA" });
                      dispatchModal({ type: "OPEN_ADD" });
                    }}
                    className="bg-[#6B5E70] text-white px-8 py-3 rounded-full font-black uppercase text-[10px] shadow-lg hover:bg-[#5A4D5F] transition-colors"
                  >
                    Escribir primer verso
                  </motion.button>
                )}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}