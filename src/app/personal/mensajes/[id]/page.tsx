import DetalleConversacion from '@/features/garlia/views/detalleConversacion';

// Requerido por `output: export`. Ver nota en garlia/libros/[id]/page.tsx.
export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function Page() {
  return <DetalleConversacion />;
}
