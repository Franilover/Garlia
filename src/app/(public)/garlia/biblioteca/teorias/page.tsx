import PaginaBibliotecaPlantilla from "@/domains/garlia/biblioteca/public/PaginaBibliotecaPlantilla";
import TeoriasPage from "@/domains/garlia/teorias/TeoriasPage";

export default function Page() {
  return (
    <PaginaBibliotecaPlantilla slug="teorias">
      <TeoriasPage />
    </PaginaBibliotecaPlantilla>
  );
}
