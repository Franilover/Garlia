"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/api/supabase';
import { X, Bell, BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const urlBase64ToUint8Array = (base64String) => {
  if (typeof window === 'undefined') return null; // ProtecciÃ³n para el servidor
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export default function Newsletter() {
  const [status, setStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          if (subscription) setStatus('success');
        });
      });
    }
  }, []);

  const handleEnableNotifications = async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      alert("ConfiguraciÃ³n incompleta: Falta la VAPID Key.");
      return;
    }

    setStatus('loading');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("Â¡Necesitas permitir las notificaciones!");
        setStatus('error');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        endpoint: pushSubscription.endpoint,
        subscription_data: pushSubscription,
        email: user?.email || null,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('suscriptores')
        .upsert(payload, { onConflict: 'endpoint' });

      if (error) throw error;
      setStatus('success');

    } catch (err) {
      console.error("Error:", err);
      setStatus('error');
    }
  };

  if (status === 'success' || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-2xl mx-auto mb-20 px-4 relative group"
      >
        <div className="card-main !bg-white/60 backdrop-blur-md p-10 md:p-14 relative overflow-hidden border-primary/10">
          <Bell className="absolute -bottom-4 -right-4 text-primary/5 -rotate-12" size={120} />
          <button onClick={() => setIsVisible(false)} className="absolute top-6 right-6 text-primary/30 hover:text-primary transition-all">
            <X size={20} /> 
          </button>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-black uppercase italic text-primary tracking-tighter leading-none mb-4">
              "Â¿Quieres ver <br /> nuevos dibujos?"
            </h2>
            <p className="text-primary/50 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-10">
              "Activa las notificaciones para no perderte nada del Atelier"
            </p>
            <button 
              onClick={handleEnableNotifications}
              disabled={status === 'loading'}
              className="btn-brand w-full md:w-auto px-16 py-5 flex items-center justify-center gap-3 mx-auto text-lg"
            >
              <BellRing size={20} className={status === 'loading' ? 'animate-bounce' : ''} />
              {status === 'loading' ? 'Configurando...' : 'Activar Notificaciones'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}