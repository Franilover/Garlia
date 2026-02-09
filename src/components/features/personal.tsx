"use client";

// Definimos la interfaz para que TypeScript sepa qué contiene 'datos'
interface PersonalProps {
  datos: {
    username: string;
    status: string;
    descubrimientos?: any[];
    inventario_usuario?: any[];
  };
}

export default function Personal({ datos }: PersonalProps) {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold">"Perfil de {datos.username}"</h2>
      <p className="opacity-70">"Estado: {datos.status}"</p>
      
      {/* Aquí va el resto de tu lógica de renderizado */}
      <div className="mt-8">
        {/* Ejemplo de cómo iterar si lo necesitas */}
        "Ítems en inventario: {datos.inventario_usuario?.length || 0}"
      </div>
    </div>
  );
}