"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils"; 
import { useAuth } from "@/components/features/control/authContext"; 
import { supabase } from "@/lib/api/supabase";
import { useScrollVisibility } from "@/hooks/useScrollVisibility";
import { 
  User, LogOut, Plus, ChevronDown, Smile, 
  ImageIcon, Camera, Sparkles, 
  Users, CircleUser, Flower2, Sword,
  Footprints, Package, Map, BookOpen, Music,
  Utensils, CheckSquare 
} from "lucide-react";

const Navbar = () => {
  const currentPath = usePathname();
  
  const { user, perfil } = useAuth() as { user: any; perfil: any };
  
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const { isVisible } = useScrollVisibility(50);

  useEffect(() => {
    if (!isVisible) {
      setOpenSubmenu(null);
      setUserMenuOpen(false);
    }
  }, [isVisible]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/"; 
  };

  const puedeSubir = perfil?.rol === "admin" || perfil?.rol === "autor";
  
  const esFranilover = perfil?.username === "Franilover";

  const closeAll = () => { 
    setOpenSubmenu(null); 
    setUserMenuOpen(false); 
  };

  const isInSection = (paths: string[]) => paths.some(path => currentPath?.startsWith(path));

  const navContent = useMemo(() => (
    <div className="flex w-full items-center justify-around px-2 h-full">
      <button 
        onClick={() => user ? setUserMenuOpen(!userMenuOpen) : window.location.href="/auth/login"} 
        className="grow flex justify-center"
      >
        <User size={22} className={user || userMenuOpen ? "text-primary" : "text-primary/30"} />
      </button>

      <button onClick={() => setOpenSubmenu(openSubmenu === "personal" ? null : "personal")} className="grow flex justify-center">
        <Camera size={22} className={isInSection(["/personal/sobre-mi", "/personal/dibujos", "/personal/fotos"]) ? "text-primary" : "text-primary/30"} />
      </button>
      
      <div className="grow flex justify-center">
        <Link href={puedeSubir ? "/upload" : "/"} onClick={closeAll} className={cn(
          "p-3 rounded-full transition-all duration-300",
          currentPath === "/upload" ? "bg-white text-primary shadow-lg shadow-primary/20" : "bg-primary text-white shadow-lg shadow-primary/30"
        )}>
          {puedeSubir ? <Plus size={20} strokeWidth={3} /> : <Flower2 size={20} />}
        </Link>
      </div>

      <button onClick={() => setOpenSubmenu(openSubmenu === "enciclopedia" ? null : "enciclopedia")} className="grow flex justify-center">
        <Sparkles size={22} className={isInSection(["/wiki/personajes", "/wiki/items", "/wiki/criaturas"]) ? "text-primary" : "text-primary/30"} />
      </button>

      <button onClick={() => setOpenSubmenu(openSubmenu === "lore" ? null : "lore")} className="grow flex justify-center">
        <Map size={22} className={isInSection(["/wiki/mapa", "/wiki/libros", "/wiki/canciones"]) ? "text-primary" : "text-primary/30"} />
      </button>
    </div>
  ), [currentPath, openSubmenu, user, puedeSubir, userMenuOpen]);

  return (
    <>
      {/* --- PC NAVBAR --- */}
      <header className="hidden md:block sticky top-0 w-full z-1000 bg-bg-main/80 backdrop-blur-md border-b border-primary/10">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-6">
            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2">
                  <CircleUser className={cn("transition-colors", userMenuOpen ? "text-primary" : "text-primary/40")} size={28} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-3 w-48 bg-white border border-primary/10 rounded-2xl shadow-xl p-2 z-1001"
                    >
                      <Link href="/wiki/personal" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-primary/60 hover:bg-primary/5 rounded-xl transition-all">
                        <Sword size={14} /> Mi Personaje
                      </Link>

                      <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-black uppercase text-red-400 hover:bg-red-50 rounded-xl transition-all border-t border-primary/5">
                        <LogOut size={14} /> Salir
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : <Link href="/auth/login" className="text-[10px] font-black uppercase text-primary/60 hover:text-primary">Entrar</Link>}
          </div>

          <nav className="flex items-center gap-1 bg-primary/5 p-1 rounded-2xl border border-primary/10">
            <PCGroup 
              label="Posts" 
              active={isInSection(["/personal/sobre-mi", "/personal/dibujos", "/personal/fotos"])} 
              items={[
                { href: "/personal/sobre-mi", label: "Bio", icon: <Smile size={14}/> }, 
                { href: "/personal/dibujos", label: "Dibujos", icon: <ImageIcon size={14}/> }, 
                { href: "/personal/fotos", label: "Fotos", icon: <Camera size={14}/> }
              ]} 
              currentPath={currentPath} 
            />
            <PCGroup 
              label="Wiki" 
              active={isInSection(["/wiki/personajes", "/wiki/items", "/wiki/criaturas"])} 
              items={[
                { href: "/wiki/personajes", label: "Personajes", icon: <Users size={14}/> }, 
                { href: "/wiki/criaturas", label: "Criaturas", icon: <Footprints size={14}/> }, 
                { href: "/wiki/items", label: "Items", icon: <Package size={14}/> }
              ]} 
              currentPath={currentPath} 
            />
            <PCGroup 
              label="Extra" 
              active={isInSection(["/wiki/mapa", "/wiki/libros", "/wiki/canciones"])} 
              items={[
                { href: "/wiki/mapa", label: "Mapa", icon: <Map size={14}/> }, 
                { href: "/wiki/libros", label: "Libros", icon: <BookOpen size={14}/> },
                { href: "/wiki/canciones", label: "Canciones", icon: <Music size={14}/> }
              ]} 
              currentPath={currentPath} 
            />
            {/* --- NUEVO GRUPO PARA FRANILOVER --- */}
            {esFranilover && (
              <PCGroup 
                label="Gestión" 
                active={isInSection(["/wiki/cocina", "/wiki/tareas"])} 
                items={[
                  { href: "/wiki/cocina", label: "Mi Cocina", icon: <Utensils size={14}/> },
                  { href: "/wiki/tareas", label: "Mi Agenda", icon: <CheckSquare size={14}/> }
                ]} 
                currentPath={currentPath} 
              />
            )}
          </nav>
          
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-black italic tracking-tighter text-primary flex items-center gap-2">
              <Flower2 size={20} /> <span>FRANI<span className="text-primary opacity-40">LOVER</span></span>
            </Link>
          </div>
        </div>
      </header>

      {/* --- MÓVIL --- */}
      <motion.div 
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100vw-48px)] z-1000"
        initial={false}
        animate={{ y: isVisible ? 0 : 120, opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <nav className="bg-bg-main/95 backdrop-blur-xl border border-primary/20 shadow-2xl h-15 rounded-[40px] flex items-center justify-center overflow-hidden w-full">
          {navContent}
        </nav>

        <AnimatePresence>
          {(openSubmenu || (userMenuOpen && user)) && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-20 left-0 w-full bg-white border border-primary/10 rounded-[40px] p-3 shadow-2xl flex flex-col gap-2 z-1001">
              
              {userMenuOpen && user && (
                <div className="flex flex-col gap-2">
                  <Link href="/wiki/personal" onClick={closeAll} className="w-full p-5 bg-primary/5 text-primary rounded-[30px] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                    <Sword size={18}/> Mi Personaje
                  </Link>

                  {esFranilover && (
                    <>
                      <Link href="/personal/cocina" onClick={closeAll} className="w-full p-5 bg-primary/5 text-primary rounded-[30px] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                        <Utensils size={18}/> Mi Cocina
                      </Link>
                      <Link href="/personal/tareas" onClick={closeAll} className="w-full p-5 bg-primary/5 text-primary rounded-[30px] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                        <CheckSquare size={18}/> Mi Agenda
                      </Link>
                    </>
                  )}

                  <button onClick={handleLogout} className="w-full p-4 bg-red-50 text-red-400 rounded-[30px] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                    Cerrar Sesión <LogOut size={16}/>
                  </button>
                </div>
              )}

              {openSubmenu === "personal" && (
                <div className="grid grid-cols-3 gap-2">
                  <MobileSubItem href="/personal/sobre-mi" label="Bio" active={currentPath === "/personal/sobre-mi"} icon={<Smile size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/personal/dibujos" label="Dibujos" active={currentPath === "/personal/dibujos"} icon={<ImageIcon size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/personal/fotos" label="Fotos" active={currentPath === "/personal/fotos"} icon={<Camera size={18}/>} onClick={closeAll} />
                </div>
              )}

              {openSubmenu === "enciclopedia" && (
                <div className="grid grid-cols-3 gap-2"> 
                  <MobileSubItem href="/wiki/personajes" label="Personajes" active={currentPath === "/wiki/personajes"} icon={<Users size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/wiki/criaturas" label="Criaturas" active={currentPath === "/wiki/criaturas"} icon={<Footprints size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/wiki/items" label="Items" active={currentPath === "/wiki/items"} icon={<Package size={18}/>} onClick={closeAll} />
                </div>
              )}

              {openSubmenu === "lore" && (
                <div className="grid grid-cols-3 gap-2">
                  <MobileSubItem href="/wiki/mapa" label="Mapa" active={currentPath === "/wiki/mapa"} icon={<Map size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/wiki/libros" label="Libros" active={currentPath === "/wiki/libros"} icon={<BookOpen size={18}/>} onClick={closeAll} />
                  <MobileSubItem href="/wiki/canciones" label="Canciones" active={currentPath === "/wiki/canciones"} icon={<Music size={18}/>} onClick={closeAll} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {(openSubmenu || userMenuOpen) && (
        <div className="fixed inset-0 z-999 bg-primary/5 backdrop-blur-[2px]" onClick={closeAll} />
      )}
    </>
  );
};

const PCGroup = ({ label, items, active, currentPath }: any) => (
  <div className="relative group px-2">
    <button className={cn("px-3 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all rounded-xl", active ? "text-primary" : "text-primary/40 group-hover:text-primary")}>
      {label} <ChevronDown size={10} className="group-hover:rotate-180 transition-transform" />
    </button>
    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all">
      <div className="bg-white border border-primary/10 p-2 rounded-2xl shadow-xl min-w-42.5">
        {items.map((item: any, i: number) => (
          <Link key={i} href={item.href} className={cn("flex items-center gap-3 w-full px-4 py-3 text-[10px] font-black uppercase rounded-xl transition-all", currentPath === item.href ? "bg-primary text-white" : "text-primary/40 hover:bg-primary/5")}>
            {item.icon} {item.label}
          </Link>
        ))}
      </div>
    </div>
  </div>
);

const MobileSubItem = ({ href, label, icon, active, onClick }: any) => (
  <Link href={href} onClick={onClick} className={cn("flex flex-col items-center gap-2 p-5 rounded-[30px] border transition-all", active ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-primary/5 border-transparent text-primary/40 hover:bg-primary/10")}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest leading-none text-center">{label}</span>
  </Link>
);

export default Navbar;