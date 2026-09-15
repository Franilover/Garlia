import PaginaBibliotecaPlantilla from "@/domains/garlia/biblioteca/public/PaginaBibliotecaPlantilla";

export default function Page() {
  // Plantilla vacía por ahora: el contenido público de "descubrimientos"
  // se enchufa como children cuando exista.
  return <PaginaBibliotecaPlantilla slug="descubrimientos" />;
}
