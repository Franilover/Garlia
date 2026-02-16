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
  // Función para capitalizar correctamente
  const capitalize = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        text-xs font-bold uppercase 
        px-4 py-2.5 rounded-xl
        border-2 border-[#6B5E70]/30 
        bg-white/90 text-[#6B5E70] 
        focus:outline-none focus:ring-2 focus:ring-[#6B5E70]/50 focus:border-[#6B5E70]/50
        transition-all duration-300
        hover:border-[#6B5E70]/50 hover:bg-white
        cursor-pointer
        shadow-md hover:shadow-lg
        backdrop-blur-sm
        min-w-[160px]
        ${className}
      `}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {capitalize(option.label)}
        </option>
      ))}
    </select>
  );
}