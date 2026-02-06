"use client";
import { useState, useEffect } from 'react';

export const useScrollVisibility = (threshold = 50) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 1. Detectar si hemos pasado el umbral (para cambiar el fondo)
      if (currentScrollY > threshold) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // 2. Detectar direcciÃ³n para mostrar/ocultar (Smart Navbar)
      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        setIsVisible(false); // Bajando: ocultar
      } else {
        setIsVisible(true);  // Subiendo: mostrar
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, threshold]);

  return { isScrolled, isVisible };
};