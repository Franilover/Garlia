import { AdminOnly } from "@/components/forms/AdminOnly";
import { PanelActualizacionApk } from "@/features/actualizaciones/PanelActualizacionApk";

export default function ActualizacionesPage() {
  return (
    <AdminOnly>
      <div className="max-w-lg mx-auto px-4 py-8">
        <PanelActualizacionApk />
      </div>
    </AdminOnly>
  );
}
