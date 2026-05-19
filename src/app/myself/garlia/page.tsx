"use client";
import { AdminOnly } from "@/components/forms/AdminOnly";
import EditorEntidades from "@/components/paginas/myself/garlia/editorGarlia";

export default function DashboardPage() {
  return (
    <AdminOnly>
      <EditorEntidades />
    </AdminOnly>
  );
}