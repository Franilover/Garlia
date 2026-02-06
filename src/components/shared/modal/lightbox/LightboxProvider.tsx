"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

const LightboxContext = createContext(null);

export const useLightbox = () => {
  const context = useContext(LightboxContext);
  if (!context) throw new Error("useLightbox debe usarse dentro de LightboxProvider");
  return context;
};

export const LightboxProvider = ({ children }) => {
  const [gallery, setGallery] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [tableContext, setTableContext] = useState('dibujos');

  const openLightbox = useCallback((index, images, table = 'dibujos') => {
    setGallery(images);
    setCurrentIndex(index);
    setTableContext(table);
    if (typeof window !== 'undefined') document.body.style.overflow = 'hidden';
  }, []);

  const closeLightbox = useCallback(() => {
    setCurrentIndex(-1);
    setGallery([]);
    if (typeof window !== 'undefined') document.body.style.overflow = 'auto';
  }, []);

  const updateGalleryItem = useCallback((index, newTitle) => {
    setGallery(prev => {
      const newGallery = [...prev];
      newGallery[index] = { ...newGallery[index], alt: newTitle };
      return newGallery;
    });
  }, []);

  return (
    <LightboxContext.Provider value={{ 
      selectedImg: gallery[currentIndex], 
      gallery, currentIndex, setCurrentIndex, 
      openLightbox, closeLightbox, updateGalleryItem, tableContext 
    }}>
      {children}
    </LightboxContext.Provider>
  );
};