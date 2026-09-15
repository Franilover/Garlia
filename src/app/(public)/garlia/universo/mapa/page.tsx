import PaginaUniversoPlantilla from "@/domains/garlia/universo/public/PaginaUniversoPlantilla";
import MapaInteractivo from "@/domains/garlia/reinos/public/mapaGarlia";

export default function Page() {
  // Mapa público: solo lectura. Toda la lógica de edición vive en
  // editorGarlia (ver MapaSection dentro del panel admin).
  return (
    <PaginaUniversoPlantilla slug="mapa" fullBleed>
      {/* 38px = alto de la tab bar fija que dibuja PaginaUniversoPlantilla
          en modo fullBleed (ver pt-[38px] ahí) — sin este offset el mapa
          (fixed inset-0) queda tapado detrás de esa barra. */}
      <MapaInteractivo allowEdit={false} topOffset={38} />
    </PaginaUniversoPlantilla>
  );
}
