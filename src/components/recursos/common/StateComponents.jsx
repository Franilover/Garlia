/**
 * COMPONENTES DE ESTADO
 * Estados reutilizables para loading, empty y error
 */

import { motion } from 'framer-motion';
import { Sparkles, AlertCircle, Inbox } from 'lucide-react';
import { typography, animations } from '@/lib/design-system';

// ============================================================
// LOADING STATE
// ============================================================

export function LoadingState({ mensaje = "Cargando..." }) {
  return (
    <motion.div
      {...animations.fadeIn}
      className="min-h-screen bg-bg-main flex flex-col items-center justify-center px-4"
    >
      <Sparkles
        size={40}
        className="text-primary/20 mb-6 animate-pulse"
      />
      <p className={typography.loading}>{mensaje}</p>
    </motion.div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

export function EmptyState({
  mensaje = "No hay datos disponibles",
  icon: Icon = Inbox,
  accion = null
}) {
  return (
    <motion.div
      {...animations.fadeIn}
      className="col-span-full py-20 flex flex-col items-center justify-center text-center"
    >
      <Icon size={48} className="text-primary/10 mb-6" />
      <p className={typography.emptyState}>{mensaje}</p>
      {accion && (
        <button
          onClick={accion.onClick}
          className="mt-6 text-xs font-bold text-primary hover:underline uppercase tracking-widest"
        >
          {accion.texto}
        </button>
      )}
    </motion.div>
  );
}

// ============================================================
// ERROR STATE
// ============================================================

export function ErrorState({
  mensaje = "Algo salió mal",
  onRetry = null
}) {
  return (
    <motion.div
      {...animations.fadeIn}
      className="min-h-screen bg-bg-main flex flex-col items-center justify-center px-4"
    >
      <AlertCircle size={48} className="text-red-500/40 mb-6" />
      <p className={typography.error + " mb-6"}>{mensaje}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      )}
    </motion.div>
  );
}

// ============================================================
// INLINE LOADING (para dentro de componentes)
// ============================================================

export function InlineLoading({ size = 20 }) {
  return (
    <div className="flex items-center justify-center py-4">
      <Sparkles
        size={size}
        className="text-primary/30 animate-pulse"
      />
    </div>
  );
}

// ============================================================
// SKELETON LOADER (para mejores transiciones)
// ============================================================

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-[2rem] p-6 animate-pulse">
      <div className="aspect-square bg-primary/5 rounded-2xl mb-4" />
      <div className="h-3 bg-primary/5 rounded mb-2 w-3/4" />
      <div className="h-3 bg-primary/5 rounded w-1/2" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}