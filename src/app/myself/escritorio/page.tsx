"use client";

import { AdminOnly } from "@/components/forms/AdminOnly";
import EnsayosView from "@/components/paginas/myself/vida/escritorio/ensayos/page";

export default function SaludPage() {
  return (
    <AdminOnly>
      <EnsayosView />,
    </AdminOnly>
  );
}