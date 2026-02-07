"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';

/**
 * Componente para renderizar la lista de canciones vinculadas.
 * @param {Array} listaLinks - Array de strings con las rutas (ej: ["/wiki/canciones/1"])
 * @param {string} nombre - Nombre del personaje para el texto del botón
 */
export const SeccionMusica = ({ listaLinks, nombre }) => {
  // Si no hay links o el array está vacío, no renderizamos nada
  if (!listaLinks || listaLinks.length === 0) return null;

  // Limpiamos los links por si acaso vienen con espacios o formatos extraños
  const linksLimpios = Array.isArray(listaLinks) 
    ? listaLinks.flatMap(item => typeof item === 'string' ? item.split(',') : item)
                .map(link => link.trim())
                .filter(link => link !== "" && link !== "[]")
    : [];

  if (linksLimpios.length === 0) return null;

  return (
    <div className="space-y-3 mt-6 border-t border-primary/5 pt-6">
      {/* Etiqueta de sección */}
      <div className="flex items-center gap-2 text-primary/30 mb-2">
        <Music size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">
          Soliloquios / Temas
        </span>
      </div>

      {/* Contenedor de botones */}
      <div className="flex flex-wrap gap-3">
        {linksLimpios.map((link, index) => (
          <Link 
            key={`${link}-${index}`} 
            href={link} 
            className="no-underline group"
          >
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 bg-white border-2 border-primary/10 px-6 py-3 rounded-2xl shadow-sm group-hover:border-primary/30 group-hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-[9px] text-primary/40 font-black uppercase tracking-tighter leading-none mb-1">
                  Ver Letra {linksLimpios.length > 1 ? `#${index + 1}` : ""}
                </span>
                <span className="text-sm font-black italic uppercase text-primary tracking-tighter leading-none">
                  {nombre}
                </span>
              </div>
              <Music size={18} className="text-primary/20 group-hover:text-primary transition-colors" />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};