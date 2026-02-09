export const SelectorMusicaAdmin = ({ idsSeleccionados = [], onChange }) => {
  const [todas, setTodas] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        console.log("Intentando cargar canciones de Supabase...");
        // Eliminamos filtros para que aparezcan TODAS (aunque visible sea false)
        const { data, error } = await supabase
          .from('canciones')
          .select('id, titulo')
          .order('titulo', { ascending: true });
        
        if (error) throw error;
        
        console.log("Canciones cargadas con éxito:", data);
        setTodas(data || []);
      } catch (err) {
        console.error("Error detallado en selector:", err.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const safeIds = Array.isArray(idsSeleccionados) ? idsSeleccionados : [];

  const toggle = (id) => {
    const nuevos = safeIds.includes(id) 
      ? safeIds.filter(i => i !== id) 
      : [...safeIds, id];
    onChange(nuevos);
  };

  if (loading) return <div className="h-12 bg-[#6B5E70]/5 animate-pulse rounded-2xl w-full" />;

  return (
    <div className="relative w-full" style={{ zIndex: 9999 }}>
      {/* BOTÓN PRINCIPAL */}
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full p-4 bg-white border border-[#6B5E70]/20 rounded-[1.5rem] flex items-center justify-between cursor-pointer shadow-sm hover:border-[#6B5E70]/40 transition-all min-h-[60px]"
      >
        <div className="flex flex-wrap gap-2">
          {safeIds.length > 0 ? safeIds.map(id => (
            <span key={id} className="bg-[#6B5E70] text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-2">
              {todas.find(c => c.id === id)?.titulo || 'Seleccionada'}
              <X size={12} onClick={(e) => { e.stopPropagation(); toggle(id); }} className="hover:text-red-300" />
            </span>
          )) : <span className="text-[#6B5E70]/40 text-xs italic ml-2">Haz clic para elegir canciones...</span>}
        </div>
        <ChevronsUpDown size={18} className="text-[#6B5E70]/40" />
      </div>
      
      {/* LISTA DESPLEGABLE REFORZADA */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[110%] z-[9999] bg-white border border-[#6B5E70]/20 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2">
          {todas.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">No hay canciones en la base de datos</div>
          ) : (
            todas.map(c => (
              <div 
                key={c.id} 
                onClick={() => toggle(c.id)} 
                className={`p-3 rounded-xl cursor-pointer mb-1 flex justify-between items-center ${
                  safeIds.includes(c.id) ? 'bg-[#6B5E70]/10 text-[#6B5E70]' : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-tight">{c.titulo}</span>
                {safeIds.includes(c.id) && <Check size={14} className="text-[#6B5E70]" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};