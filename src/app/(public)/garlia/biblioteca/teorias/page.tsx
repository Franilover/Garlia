import PaginaBibliotecaPlantilla from "@/domains/garlia/biblioteca/public/PaginaBibliotecaPlantilla";

export default function Page() {
  // Plantilla vacía por ahora: el contenido público de "teorias"
  // se enchufa como children cuando exista.
  return <PaginaBibliotecaPlantilla slug="teorias" />;
}
