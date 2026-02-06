"use client";
import { useEffect } from 'react';

export default function ControlHooks() {
  useEffect(() => {
    const bloquear = (e) => e.preventDefault();
    document.addEventListener("contextmenu", bloquear);
    document.addEventListener("dragstart", bloquear);
    return () => {
      document.removeEventListener("contextmenu", bloquear);
      document.removeEventListener("dragstart", bloquear);
    };
  }, []);

  return null;
}