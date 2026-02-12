"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DetalleMaestro from '../../features/DetalleMaestro/DetalleMaestro';

interface DetallesModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onUpdate: (val: any) => void;
  tags?: any[];
  mostrarMusica?: boolean;
  // Agregamos la propiedad que faltaba para corregir el error 2322
  isNew?: boolean; 
}

export default function DetallesModal({ 
  isOpen, 
  onClose, 
  data, 
  onUpdate,
  tags = [], 
  mostrarMusica = true,
  isNew = false // Valor por defecto
}: DetallesModalProps) {  
  
  return (
    <AnimatePresence>
      {isOpen && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div className="w-full max-w-7xl max-h-[95vh] overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <DetalleMaestro 
                isOpen={isOpen} 
                onClose={onClose} 
                data={data} 
                onUpdate={async () => {
                  if (onUpdate) {
                    onUpdate(data);
                  }
                }}
                tags={tags}
                mostrarMusica={mostrarMusica}
                // Si DetalleMaestro también necesita saber si es nuevo, se lo pasamos:
                isNew={isNew}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}