import PaginaUniversoPlantilla from "@/domains/garlia/universo/public/PaginaUniversoPlantilla";
import ExplicacionPage from "@/domains/garlia/explicacion/ExplicacionPage";
import { AdminVerificadoOnly } from "@/ui/AdminVerificadoOnly";

export default function Page() {
  return (
    <AdminVerificadoOnly>
      <PaginaUniversoPlantilla slug="explicacion">
        <ExplicacionPage />
      </PaginaUniversoPlantilla>
    </AdminVerificadoOnly>
  );
}
