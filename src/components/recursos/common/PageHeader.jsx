import { motion } from 'framer-motion';
import { typography, components, animations } from '@/lib/design-system';

export default function PageHeader({ 
  titulo, 
  subtitulo, 
  mostrarDivider = true,
  children // Para filtros u otros elementos
}) {
  return (
    <motion.header {...animations.fadeIn} className="mb-16 text-center px-4 pt-10">
      <h1 className={typography.pageTitle}>{titulo}</h1>
      
      {mostrarDivider && (
        <div className={components.dividerThick + " mb-12"} />
      )}
      
      {subtitulo && (
        <p className="text-lg text-primary/60 mt-4">{subtitulo}</p>
      )}
      
      {children}
    </motion.header>
  );
}