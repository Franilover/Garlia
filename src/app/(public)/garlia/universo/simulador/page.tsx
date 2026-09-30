import PaginaUniversoPlantilla from "@/domains/garlia/universo/public/PaginaUniversoPlantilla";
import SimuladorIUM from "@/domains/garlia/universo/public/SimuladorIUM";

export default function Page() {
  return (
    <PaginaUniversoPlantilla slug="simulador" fullBleed>
      <SimuladorIUM />
    </PaginaUniversoPlantilla>
  );
}
