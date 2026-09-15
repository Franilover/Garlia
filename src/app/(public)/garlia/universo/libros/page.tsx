import LibrosConocimientoPage from "@/domains/garlia/libros-conocimiento/LibrosConocimientoPage";
import PaginaUniversoPlantilla from "@/domains/garlia/universo/public/PaginaUniversoPlantilla";

export default function Page() {
  // "Libros de conocimiento" (distinto de /garlia/libros, la biblioteca
  // de historia/aventura con capítulos). Ver domains/garlia/libros-conocimiento.
  return (
    <PaginaUniversoPlantilla slug="libros">
      <LibrosConocimientoPage />
    </PaginaUniversoPlantilla>
  );
}
