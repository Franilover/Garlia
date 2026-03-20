import { motion } from 'framer-motion';
import { typography, components, animations } from '@/lib/config/design-system';

export default function PageHeader({ 
  titulo,  
  mostrarDivider = true,
  children // Para filtros u otros elementos
}) {
  return (
    <motion.header {...animations.fadeIn} className="mb-16 text-center px-4 pt-10">
      <h1 className={typography.pageTitle}>{titulo}</h1>
      
      {mostrarDivider && (
        <div className={components.dividerThick + " mb-12"} />
      )}
      
      {children}
    </motion.header>
  );
}