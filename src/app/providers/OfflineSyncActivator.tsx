"use client";

import { useOfflineSync } from "@/hooks/data/useOfflineSync";

export function OfflineSyncActivator() {
  // Ejecuta la lógica de escucha de red
  useOfflineSync();
  
  // No renderiza nada visualmente
  return null;
}