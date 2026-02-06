/**
 * SISTEMA DE DISEÑO - FRANILOVER
 * Archivo centralizado de estilos, tipografía y animaciones.
 */

// === TIPOGRAFÍA ===
export const typography = {
  // Títulos
  pageTitle: "text-5xl md:text-8xl font-black italic tracking-tighter text-primary uppercase leading-none",
  sectionTitle: "text-3xl md:text-4xl font-black italic uppercase tracking-tighter",
  cardTitle: "text-xl font-black text-white uppercase italic tracking-tighter leading-none",
  
  // Labels
  label: "text-[10px] font-black uppercase tracking-[0.2em] text-primary/60",
  tag: "text-[8px] font-black text-white/50 uppercase tracking-widest",
  
  // Estados
  emptyState: "text-primary/30 text-[10px] italic text-center py-10 uppercase font-black tracking-widest",
  loading: "py-40 text-center opacity-20 font-black uppercase text-[10px] tracking-widest animate-pulse"
};

// === COMPONENTES ===
export const components = {
  // Cards
  cardMain: "bg-white border border-primary/10 rounded-[3rem] shadow-xl",
  cardHover: "hover:shadow-2xl hover:scale-[1.02] transition-all duration-300",
  
  // Inputs
  inputBase: "w-full bg-transparent py-2 outline-none",
  inputBorder: "border-b border-primary/20 focus-within:border-primary transition-colors",
  
  // Buttons
  btnPrimary: "btn-brand uppercase text-xs tracking-widest",
  btnSecondary: "text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary transition-all",
  
  // Separadores
  divider: "h-[1px] bg-primary/10",
  dividerThick: "h-1.5 w-24 bg-primary mx-auto mt-4 rounded-full opacity-20"
};

// === ANIMACIONES ===
export const animations = {
  fadeIn: { 
    initial: { opacity: 0, y: 20 }, 
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 } 
  },
  slideRight: { 
    initial: { opacity: 0, x: -10 }, 
    animate: { opacity: 1, x: 0 } 
  },
  scale: { 
    initial: { scale: 0.95, opacity: 0 }, 
    animate: { scale: 1, opacity: 1 } 
  }
};

// === LAYOUT ===
export const layout = {
  container: "max-w-4xl mx-auto px-6",
  containerWide: "max-w-6xl mx-auto px-4",
  section: "mb-24",
  grid2: "grid grid-cols-1 md:grid-cols-2 gap-8",
  grid3: "grid grid-cols-1 md:grid-cols-3 gap-6"
};