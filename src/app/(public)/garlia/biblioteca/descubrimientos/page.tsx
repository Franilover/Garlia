import PaginaBibliotecaPlantilla from "@/domains/garlia/biblioteca/public/PaginaBibliotecaPlantilla";
import DescubrimientosPage from "@/domains/garlia/descubrimientos/DescubrimientosPage";

export default function Page() {
  return (
    <PaginaBibliotecaPlantilla slug="descubrimientos">
      <DescubrimientosPage />
    </PaginaBibliotecaPlantilla>
  );
}
