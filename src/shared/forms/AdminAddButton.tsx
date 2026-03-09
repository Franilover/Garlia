import { Plus } from "lucide-react";

interface AdminAddButtonProps {
  onClick: () => void;
  label?: string;
}

export function AdminAddButton({ onClick, label = "Añadir" }: AdminAddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 py-3 px-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all"
      style={{
        background: "var(--primary)",
        color: "var(--btn-text)",
        border: "1px solid color-mix(in srgb, var(--primary) 70%, transparent)",
        boxShadow: "0 4px 16px color-mix(in srgb, var(--accent) 25%, transparent)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "var(--accent)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px color-mix(in srgb, var(--accent) 40%, transparent)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "var(--primary)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px color-mix(in srgb, var(--accent) 25%, transparent)";
      }}
    >
      <Plus size={18} strokeWidth={3} />
      <span>{label}</span>
    </button>
  );
}