"use client";

import { useOfflineSync } from "@/hooks/features/useOfflineSync";

export function OfflineSyncActivator() {
  // Ejecuta la lógica de escucha de red
  useOfflineSync();
  
  // No renderiza nada visualmente
  return null;
}