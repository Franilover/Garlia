"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DetalleMaestro from '../../features/DetalleMaestro/DetalleMaestro';

// Si es .tsx, añade esta interfaz arriba. Si es .jsx, solo usa los parámetros.
interface DetallesModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onUpdate: (val: any) => void;
  tags?: any[];         // El ? lo hace opcional
  mostrarMusica?: boolean;
}

export default function DetallesModal({ 
  isOpen, 
  onClose, 
  data, 
  onUpdate,
  tags = [],           // Valor por defecto
  mostrarMusica = true // Valor por defecto
}: DetallesModalProps) { // Si es .jsx, quita ": DetallesModalProps"
  
  if (!isOpen || !data) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-7xl max-h-[95vh] overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <DetalleMaestro 
              isOpen={isOpen} 
              onClose={onClose} 
              data={data} 
              onUpdate={onUpdate}
              tags={tags}
              mostrarMusica={mostrarMusica}
            />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}