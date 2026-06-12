"use client";

import { AdminOnly } from "@/components/forms/AdminOnly";
import EnsayosView from "@/features/ensayos/views/page";

export default function SaludPage() {
  return (
    <AdminOnly>
      <EnsayosView />,
    </AdminOnly>
  );
}