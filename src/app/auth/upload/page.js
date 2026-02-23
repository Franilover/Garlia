"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/api/client/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, Camera, ChevronDown, Sparkles, UserCircle, Link as LinkIcon } from 'lucide-react';

const CONFIG_ESTRUCTURA = {
  personal: {
    label: 'Personal',
    tablas: {
      dibujos: { label: 'Dibujos', icon: <ImageIcon size={14} />, categorias: ['original', 'fanart', 'bocetos'] },
      diario_fotos: { label: 'Fotos', icon: <Camera size={14} />, categorias: ['yo', 'amigos', 'animales', 'paisajes'] }
    }
  },
  garden_of_sins: {
    label: 'Garden of Sins',
    tablas: {
      criaturas: { label: 'Criaturas', icon: <Sparkles size={14} />, categorias: ['terrestres', 'voladoras', 'acuÃ¡ticas'] },
      personajes: { label: 'Personajes', icon: <UserCircle size={14} />, categorias: ['Caelistan', 'Greendom', 'Omnisia', 'Aelistan', 'Otros'] }
    }
  }
};

export default function UploadPage() {
  const { perfil } = useAuth();
  const router = useRouter();
  
  const [seccion, setSeccion] = useState('personal');
  const [tabla, setTabla] = useState('dibujos'); 
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [uploadMethod, setUploadMethod] = useState('file');
  const [loading, setLoading] = useState(false);
  const [nombreObra, setNombreObra] = useState('');
  const [categoria, setCategoria] = useState(CONFIG_ESTRUCTURA.personal.tablas.dibujos.categorias[0]);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!perfil || (perfil.rol !== 'admin' && perfil.rol !== 'autor')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EBEBEB] text-[#6B5E70] font-black uppercase text-xs tracking-widest italic">
        "Acceso restringido"
      </div>
    );
  }

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = externalUrl;
      
      // 1. Subida de archivo a Storage (si aplica)
      if (uploadMethod === 'file' && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${tabla}/${fileName}`;

        const { error: storageError } = await supabase.storage
          .from('galeria')
          .upload(filePath, file);

        if (storageError) throw storageError;

        const { data: { publicUrl } } = supabase.storage
          .from('galeria')
          .getPublicUrl(filePath);
          
        finalImageUrl = publicUrl;
      }

      // 2. InserciÃ³n en la base de datos segÃºn la secciÃ³n
      const insertData = seccion === 'personal' 
        ? { titulo: nombreObra, url_imagen: finalImageUrl, categoria }
        : { nombre: nombreObra, imagen_url: finalImageUrl, categoria };

      const { error: dbError } = await supabase.from(tabla).insert([insertData]);
      if (dbError) throw dbError;

      // 3. DISPARAR NOTIFICACIÃN PUSH (Llamada a tu nueva API)
      try {
        const baseUrl = window.location.origin;
        await fetch(`${baseUrl}/api/notify`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log("NotificaciÃ³n solicitada correctamente");
      } catch (pushError) {
        console.error("Error al conectar con la API de notificaciones:", pushError);
      }

      alert("Â¡Publicado con Ã©xito! â¨");
      
      // Limpiar formulario
      setNombreObra(''); 
      setFile(null); 
      setExternalUrl('');
      router.refresh(); 
      
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 flex justify-center bg-[#EBEBEB]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-zinc-200 p-8 rounded-[3rem] shadow-2xl"
      >
        <header className="text-center mb-8">
          <h1 className="text-2xl font-black text-[#6B5E70] italic uppercase tracking-tighter">"Publicar Contenido"</h1>
          <p className="text-[#6B5E70]/40 text-[9px] font-black uppercase tracking-widest mt-1">"Admin Panel"</p>
        </header>

        {/* Selector de SecciÃ³n */}
        <div className="flex gap-2 mb-8 bg-[#EBEBEB] p-1.5 rounded-2xl">
          {Object.keys(CONFIG_ESTRUCTURA).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSeccion(key);
                const primeraTabla = Object.keys(CONFIG_ESTRUCTURA[key].tablas)[0];
                setTabla(primeraTabla);
                setCategoria(CONFIG_ESTRUCTURA[key].tablas[primeraTabla].categorias[0]);
              }}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${seccion === key ? 'bg-white text-[#6B5E70] shadow-sm' : 'text-[#6B5E70]/40 hover:text-[#6B5E70]'}`}
            >
              {CONFIG_ESTRUCTURA[key].label}
            </button>
          ))}
        </div>
        
        <form onSubmit={handleUpload} className="space-y-6">
          {/* Selector de Tabla */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(CONFIG_ESTRUCTURA[seccion].tablas).map(([key, value]) => (
              <button 
                key={key} 
                type="button" 
                onClick={() => { 
                  setTabla(key); 
                  setCategoria(value.categorias[0]); 
                }} 
                className={`py-3 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${tabla === key ? 'bg-[#6B5E70] text-white border-[#6B5E70]' : 'bg-transparent text-[#6B5E70]/40 border-zinc-200'}`}
              >
                {value.icon} {value.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black uppercase text-[#6B5E70]/40 tracking-widest ml-4 mb-2 block">"NOMBRE / TÃTULO"</label>
              <input 
                type="text" 
                className="w-full bg-[#EBEBEB] border-none rounded-2xl px-6 py-4 text-[#6B5E70] font-black text-xs outline-none focus:ring-2 ring-[#6B5E70]/10 transition-all" 
                value={nombreObra} 
                onChange={(e) => setNombreObra(e.target.value)} 
                placeholder="Ej: Nueva criatura..." 
                required 
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-[#6B5E70]/40 tracking-widest ml-4 mb-2 block">"CATEGORÃA"</label>
              <div className="relative">
                <select 
                  value={categoria} 
                  onChange={(e) => setCategoria(e.target.value)} 
                  className="w-full bg-[#EBEBEB] border-none rounded-2xl px-6 py-4 text-[#6B5E70] font-black text-[10px] tracking-widest appearance-none outline-none"
                >
                  {CONFIG_ESTRUCTURA[seccion].tablas[tabla].categorias.map((cat) => (
                    <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B5E70]/40 pointer-events-none" size={14} />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-100">
            {/* MÃ©todo de subida */}
            <div className="flex justify-center gap-6">
              <button 
                type="button" 
                onClick={() => setUploadMethod('file')} 
                className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${uploadMethod === 'file' ? 'text-[#6B5E70]' : 'text-[#6B5E70]/20'}`}
              >
                <Upload size={14}/> "Archivo Local"
              </button>
              <button 
                type="button" 
                onClick={() => setUploadMethod('url')} 
                className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${uploadMethod === 'url' ? 'text-[#6B5E70]' : 'text-[#6B5E70]/20'}`}
              >
                <LinkIcon size={14}/> "URL Externa"
              </button>
            </div>

            {uploadMethod === 'file' ? (
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <div className={`w-full py-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all ${file ? 'border-[#6B5E70] bg-[#6B5E70]/5' : 'border-zinc-200 bg-zinc-50'}`}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded-xl shadow-lg" />
                  ) : (
                    <Upload className="text-zinc-300" size={24} />
                  )}
                  <span className="text-[#6B5E70]/40 text-[9px] font-black uppercase">"Arrastra o haz click"</span>
                </div>
              </div>
            ) : (
              <input 
                type="text" 
                placeholder="https://..." 
                className="w-full bg-[#EBEBEB] border-none rounded-2xl px-6 py-4 text-[#6B5E70] font-black text-xs outline-none" 
                value={externalUrl} 
                onChange={(e) => setExternalUrl(e.target.value)} 
              />
            )}
          </div>

          <button 
            disabled={loading} 
            type="submit"
            className="w-full py-5 rounded-[2rem] bg-[#6B5E70] text-white font-black text-[10px] tracking-[0.3em] uppercase shadow-xl shadow-[#6B5E70]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? '"Subiendo contenido..."' : '"Publicar Ahora"'}
          </button>
        </form>
      </motion.div>
    </main>
  );
}