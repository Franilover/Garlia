"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DetalleMaestro from '../../features/DetalleMaestro/DetalleMaestro';

/**
 * Modal compartido que sirve como contenedor universal.
 * Solo maneja el overlay oscuro y el scroll.
 */
export default function DetallesModal({ isOpen, onClose, data, onUpdate }) {
  // Bloqueo de seguridad: si no hay datos o no está abierto, no renderiza nada.
  if (!isOpen || !data) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-hidden"
          // Cerrar al hacer clic en el fondo oscuro
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          {/* Contenedor con scroll para pantallas pequeñas */}
          <div className="w-full max-w-7xl max-h-[95vh] overflow-y-auto custom-scrollbar">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} // Evita que el modal se cierre al hacer clic dentro
            >
              {/* Invocamos al Orquestador con todos los props */}
              <DetalleMaestro 
                isOpen={isOpen} 
                onClose={onClose} 
                data={data} 
                onUpdate={onUpdate} 
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}