"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import DetalleMaestro from "./DetalleMaestro/DetalleMaestro";

interface DetallesModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onUpdate: (val: any) => void;
  tags?: any[];
  mostrarMusica?: boolean;
  isNew?: boolean; 
}

export default function DetallesModal({ 
  isOpen, 
  onClose, 
  data, 
  onUpdate,
  tags = [], 
  mostrarMusica = true,
  isNew = false 
}: DetallesModalProps) {  
  
  return (
    <AnimatePresence>
      {/* Ajuste en la condición: Permitir abrir si es nuevo aunque 'data' sea null */}
      {isOpen && (data || isNew) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div className="w-full max-w-7xl max-h-[95vh] overflow-y-auto custom-scrollbar">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
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
                isNew={isNew}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}