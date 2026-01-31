"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils"; 
import { useAuth } from '@/components/recursos/control/authContext'; 
import { supabase } from '@/lib/supabase';
import { 
  User, LogOut, Plus, ChevronDown, Smile, 
  ImageIcon, Camera, Sparkles, 
  Users, CircleUser, Flower2, Sword,
  Footprints, Package, Map, History, BookOpen
} from 'lucide-react';

const Navbar = () => {
  const currentPath = usePathname();
  const { user, perfil } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
        setOpenSubmenu(null);
        setUserMenuOpen(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/"; 
  };

  const puedeSubir = perfil?.rol === 'admin' || perfil?.rol === 'autor';
  const closeAll = () => { setOpenSubmenu(null); setUserMenuOpen(false); };

  const navContent = useMemo(() => (
    <div className="flex w-full items-center justify-around px-2 h-full">
      <button onClick={() => user ? setUserMenuOpen(!userMenuOpen) : window.location.href="/login"} className="flex-1 flex justify-center">
        <User size={22} className={user || userMenuOpen ? "text-[#6B5E70]" : "text-[#6B5E70]/30"} />
      </button>

      <button onClick={() => setOpenSubmenu(openSubmenu === 'personal' ? null : 'personal')} className="flex-1 flex justify-center">
        <Camera size={22} className={['/sobre-mi', '/dibujos', '/fotos'].includes(currentPath) ? "text-[#6B5E70]" : "text-[#6B5E70]/30"} />
      </button>
      
      <div className="flex-1 flex justify-center">
        <Link href={puedeSubir ? "/upload" : "/"} onClick={closeAll} className={cn(
          "p-3 rounded-full transition-all duration-300",
          currentPath === '/upload' ? "bg-white text-[#6B5E70]" : "bg-[#6B5E70] text-white"
        )}>
          {puedeSubir ? <Plus size={20} strokeWidth={3} /> : <Flower2 size={20} />}
        </Link>
      </div>

      <button onClick={() => setOpenSubmenu(openSubmenu === 'enciclopedia' ? null : 'enciclopedia')} className="flex-1 flex justify-center">
        <Sparkles size={22} className={['/personajes', '/items', '/criaturas'].includes(currentPath) ? "text-[#6B5E70]" : "text-[#6B5E70]/30"} />
      </button>

      <button onClick={() => setOpenSubmenu(openSubmenu === 'lore' ? null : 'lore')} className="flex-1 flex justify-center">
        <Map size={22} className={['/mapa', '/cronologia', '/libros'].includes(currentPath) ? "text-[#6B5E70]" : "text-[#6B5E70]/30"} />
      </button>
    </div>
  ), [currentPath, openSubmenu, user, puedeSubir, userMenuOpen]);

  return (
    <>
      {/* --- PC NAVBAR --- */}
      <header className="hidden md:block sticky top-0 w-full z-[1000] bg-[#E2D8E6]/80 backdrop-blur-md border-b border-[#6B5E70]/10">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-6">
            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2">
                  <CircleUser className={cn("transition-colors", userMenuOpen ? "text-[#6B5E70]" : "text-[#6B5E70]/40")} size={28} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-3 w-48 bg-white border border-[#6B5E70]/10 rounded-2xl shadow-xl p-2 z-[1001]"
                    >
                      <Link href="/personal" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-[#6B5E70]/60 hover:bg-[#6B5E70]/5 rounded-xl transition-all">
                        <Sword size={14} /> Mi Personaje
                      </Link>
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-black uppercase text-red-400 hover:bg-red-50 rounded-xl transition-all">
                        <LogOut size={14} /> Salir
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : <Link href="/login" className="text-[10px] font-black uppercase text-[#6B5E70]/60 hover:text-[#6B5E70]">Entrar</Link>}
          </div>

          <nav className="flex items-center gap-1 bg-[#6B5E70]/5 p-1 rounded-2xl border border-[#6B5E70]/10">
            <PCGroup label="Personal" active={['/sobre-mi', '/dibujos', '/fotos'].includes(currentPath)} items={[{ href: '/sobre-mi', label: 'Bio', icon: <Smile size={14}/> }, { href: '/dibujos', label: 'Dibujos', icon: <ImageIcon size={14}/> }, { href: '/fotos', label: 'Fotos', icon: <Camera size={14}/> }]} currentPath={currentPath} />
            <PCGroup label="Gremio" active={['/personajes', '/items', '/criaturas'].includes(currentPath)} items={[{ href: '/personajes', label: 'Personajes', icon: <Users size={14}/> }, { href: '/criaturas', label: 'Criaturas', icon: <Footprints size={14}/> }, { href: '/items', label: 'Items', icon: <Package size={14}/> }]} currentPath={currentPath} />
            <PCGroup label="Bitácora" active={['/mapa', '/cronologia', '/libros'].includes(currentPath)} items={[{ href: '/mapa', label: 'Mapa', icon: <Map size={14}/> }, { href: '/cronologia', label: 'Historia', icon: <History size={14}/> }, { href: '/libros', label: 'Libros', icon: <BookOpen size={14}/> }]} currentPath={currentPath} />
          </nav>
          
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-black italic tracking-tighter text-[#6B5E70] flex items-center gap-2">
              <Flower2 size={20} /> <span>FRANI<span className="opacity-40">LOVER</span></span>
            </Link>
          </div>
        </div>
      </header>

      {/* --- MÓVIL (ANIMADO) --- */}
      <motion.div 
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100vw-48px)] z-[1000]"
        initial={false}
        animate={{ y: isVisible ? 0 : 120, opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <nav className="bg-[#E2D8E6]/95 backdrop-blur-xl border border-[#6B5E70]/20 shadow-2xl h-[60px] rounded-[30px] flex items-center justify-center overflow-hidden w-full">
          {navContent}
        </nav>

        <AnimatePresence>
          {(openSubmenu || (userMenuOpen && user)) && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-20 left-0 w-full bg-white border border-[#6B5E70]/10 rounded-[2rem] p-3 shadow-2xl flex flex-col gap-2 z-[1001]">
              
              {userMenuOpen && user && (
                <div className="flex flex-col gap-2">
                  <Link href="/personal" onClick={closeAll} className="w-full p-5 bg-[#6B5E70]/5 text-[#6B5E70] rounded-[1.5rem] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                    <Sword size={18}/> Mi Personaje
                  </Link>
                  <button onClick={handleLogout} className="w-full p-4 bg-red-50 text-red-600 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                    Cerrar Sesión <LogOut size={16}/>
                  </button>
                </div>
              )}

              {openSubmenu === 'personal' && (
                <div className="grid grid-cols-3 gap-2">
                  <MobileSubItem href="/sobre-mi" label="Bio" active={currentPath === '/sobre-mi'} icon={<Smile size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/dibujos" label="Dibujos" active={currentPath === '/dibujos'} icon={<ImageIcon size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/fotos" label="Fotos" active={currentPath === '/fotos'} icon={<Camera size={18}/>} onClick={closeAll} />
                </div>
              )}

              {openSubmenu === 'enciclopedia' && (
                <div className="grid grid-cols-3 gap-2"> 
                  <MobileSubItem href="/personajes" label="Personajes" active={currentPath === '/personajes'} icon={<Users size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/criaturas" label="Criaturas" active={currentPath === '/criaturas'} icon={<Footprints size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/items" label="Items" active={currentPath === '/items'} icon={<Package size={18}/>} onClick={closeAll} />
                </div>
              )}

              {openSubmenu === 'lore' && (
                <div className="grid grid-cols-3 gap-2"> 
                  <MobileSubItem href="/mapa" label="Mapa" active={currentPath === '/mapa'} icon={<Map size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/cronologia" label="Historia" active={currentPath === '/cronologia'} icon={<History size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/libros" label="Libros" active={currentPath === '/libros'} icon={<BookOpen size={18}/>} onClick={closeAll} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {(openSubmenu || userMenuOpen) && (
        <div className="fixed inset-0 z-[999] bg-[#6B5E70]/20 backdrop-blur-sm" onClick={closeAll} />
      )}
    </>
  );
};

const PCGroup = ({ label, items, active, currentPath }) => (
  <div className="relative group px-2">
    <button className={cn("px-3 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all rounded-xl", active ? "text-[#6B5E70]" : "text-[#6B5E70]/40 group-hover:text-[#6B5E70]")}>
      {label} <ChevronDown size={10} className="group-hover:rotate-180 transition-transform" />
    </button>
    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all">
      <div className="bg-white border border-[#6B5E70]/10 p-2 rounded-2xl shadow-xl min-w-[170px]">
        {items.map((item, i) => (
          <Link key={i} href={item.href} className={cn("flex items-center gap-3 w-full px-4 py-3 text-[10px] font-black uppercase rounded-xl transition-all", currentPath === item.href ? "bg-[#6B5E70] text-white" : "text-[#6B5E70]/40 hover:bg-[#6B5E70]/5")}>
            {item.icon} {item.label}
          </Link>
        ))}
      </div>
    </div>
  </div>
);

const MobileSubItem = ({ href, label, icon, active, onClick }) => (
  <Link href={href} onClick={onClick} className={cn("flex flex-col items-center gap-2 p-5 rounded-[1.5rem] border transition-all", active ? "bg-[#6B5E70] border-[#6B5E70] text-white shadow-lg" : "bg-[#6B5E70]/5 border-transparent text-[#6B5E70]/40")}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest leading-none text-center">{label}</span>
  </Link>
);

export default Navbar;