import PaginaUniversoPlantilla from "@/domains/garlia/universo/public/PaginaUniversoPlantilla";

export default function Page() {
  // Placeholder por ahora: esta sección son los "libros de conocimiento"
  // (distinto de /garlia/libros). El contenido público se enchufa como
  // children cuando exista.
  return <PaginaUniversoPlantilla slug="libros" />;
}
