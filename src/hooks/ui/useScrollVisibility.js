"use client";
import { useState, useEffect } from 'react';

export const useScrollVisibility = (threshold = 50) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      
      if (currentScrollY > threshold) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      
      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        setIsVisible(false); 
      } else {
        setIsVisible(true);  
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, threshold]);

  return { isScrolled, isVisible };
};