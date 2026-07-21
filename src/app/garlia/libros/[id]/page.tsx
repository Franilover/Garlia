import LibroDetalle from '@/features/garlia/views/detallesLibro';

// Requerido por `output: export`. Ver nota en canciones/[id]/page.tsx.
export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function Page() {
  return <LibroDetalle />;
}
