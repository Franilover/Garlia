import PaginaUniversoPlantilla from "@/domains/garlia/universo/public/PaginaUniversoPlantilla";
import TeoriasPage from "@/domains/garlia/teorias/TeoriasPage";

export default function Page() {
  return (
    <PaginaUniversoPlantilla slug="teorias">
      <TeoriasPage />
    </PaginaUniversoPlantilla>
  );
}
