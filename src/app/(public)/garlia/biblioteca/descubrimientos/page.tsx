import { Suspense } from "react";

import PaginaBibliotecaPlantilla from "@/domains/garlia/biblioteca/public/PaginaBibliotecaPlantilla";
import DescubrimientosPage from "@/domains/garlia/descubrimientos/DescubrimientosPage";

export default function Page() {
  return (
    <PaginaBibliotecaPlantilla slug="descubrimientos">
      <Suspense fallback={null}>
        <DescubrimientosPage />
      </Suspense>
    </PaginaBibliotecaPlantilla>
  );
}
