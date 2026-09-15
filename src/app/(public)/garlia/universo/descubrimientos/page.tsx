import PaginaUniversoPlantilla from "@/domains/garlia/universo/public/PaginaUniversoPlantilla";
import DescubrimientosPage from "@/domains/garlia/descubrimientos/DescubrimientosPage";

export default function Page() {
  return (
    <PaginaUniversoPlantilla slug="descubrimientos">
      <DescubrimientosPage />
    </PaginaUniversoPlantilla>
  );
}
