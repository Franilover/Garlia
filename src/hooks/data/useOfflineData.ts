/**
 * DEPRECADO — usar useSupabaseData directamente.
 * Este alias existe solo para compatibilidad con imports existentes.
 *
 * Migración: reemplazar todos los imports de useOfflineData por useSupabaseData.
 */
"use client";
export { useSupabaseData as useOfflineData } from "@/hooks/data/useSupabaseData";