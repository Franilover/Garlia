import { Plus } from "lucide-react";

interface AdminAddButtonProps {
  onClick: () => void;
  label?: string;
}

export function AdminAddButton({ onClick, label = "Añadir" }: AdminAddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="btn-brand text-[10px] font-black uppercase tracking-widest py-3 px-4"
    >
      <Plus size={18} strokeWidth={3} />
      <span>{label}</span>
    </button>
  );
}