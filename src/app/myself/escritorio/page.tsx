"use client";

import { AdminOnly } from "@/components/forms/AdminOnly";
import EnsayosView from "@/components/paginas/myself/ensayosescritorio/ensayos/page";

export default function SaludPage() {
  return (
    <AdminOnly>
      <EnsayosView />,
    </AdminOnly>
  );
}