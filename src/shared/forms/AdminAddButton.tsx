import { Plus } from "lucide-react";

interface AdminAddButtonProps {
  onClick: () => void;
  label?: string;
}

export function AdminAddButton({ onClick, label = "Añadir" }: AdminAddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 bg-primary py-3 px-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
      style={{ color: "var(--btn-text)" }}
    >
      <Plus size={18} strokeWidth={3} />
      <span>{label}</span>
    </button>
  );
}