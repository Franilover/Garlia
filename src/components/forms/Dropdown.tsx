
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
        px-4 py-2.5 rounded-[var(--radius-btn)]
        border-2 border-[var(--primary)]/30 
        bg-[var(--input-bg)] text-[var(--input-text)]
        focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)]/50
        transition-all duration-300
        hover:border-[var(--primary)]/50
        cursor-pointer
        shadow-md hover:shadow-lg
        backdrop-blur-sm
        min-w-[160px]
        ${className}
      `}
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          style={{
            backgroundColor: "var(--input-bg)",
            color: "var(--input-text)",
          }}
        >
          {capitalize(option.label)}
        </option>
      ))}
    </select>
  );
}