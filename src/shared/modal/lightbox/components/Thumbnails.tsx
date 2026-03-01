"use client";
import { useLightbox } from '../LightboxProvider';
import { cn } from "@/lib/utils";

export const Thumbnails = () => {
  const { gallery, currentIndex, setCurrentIndex } = useLightbox();

  return (
    <aside className="hidden lg:flex flex-col items-center gap-5 p-6 bg-white/[0.02] sticky top-[96px] h-[calc(100vh-96px)] overflow-y-auto no-scrollbar w-[140px]">
      {gallery.map((img, idx) => (
        <button 
          key={idx} 
          onClick={() => setCurrentIndex(idx)} 
          className={cn(
            "h-24 w-24 min-h-[96px] rounded-xl overflow-hidden transition-all duration-500",
            idx === currentIndex ? 'ring-2 ring-white scale-105 opacity-100' : 'opacity-20 grayscale hover:opacity-80'
          )}
        >
          <img src={img.src} className="h-full w-full object-cover" alt="thumb" />
        </button>
      ))}
    </aside>
  );
}; 