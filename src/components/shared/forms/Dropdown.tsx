// components/shared/forms/Dropdown.tsx
"use client";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function Dropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = "Seleccionar...",
  className = ""
}: DropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        text-[10px] font-bold uppercase 
        px-3 py-2 rounded-lg 
        border border-[#6B5E70]/20 
        bg-white/80 text-[#6B5E70] 
        focus:outline-none focus:ring-2 focus:ring-[#6B5E70]/30
        transition-all duration-200
        hover:border-[#6B5E70]/40
        cursor-pointer
        shadow-sm
        ${className}
      `}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}