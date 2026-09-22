import PaginaUniversoPlantilla from "@/domains/garlia/universo/public/PaginaUniversoPlantilla";
import ExplicacionPage from "@/domains/garlia/explicacion/ExplicacionPage";

export default function Page() {
  return (
    <PaginaUniversoPlantilla slug="explicacion">
      <ExplicacionPage />
    </PaginaUniversoPlantilla>
  );
}
