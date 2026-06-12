"use client";

import { AdminOnly } from "@/components/forms/AdminOnly";
import EnsayosView from "@/features/ensayos/page";

export default function SaludPage() {
  return (
    <AdminOnly>
      <EnsayosView />,
    </AdminOnly>
  );
}